import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/monitoring/logger';

import { createMiddlewareCookieStore } from '@/lib/supabase/cookie-store';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/profile',
  '/settings',
  '/households',
  '/cats',
  '/notifications',
  '/history',
  '/schedules',
  '/statistics',
  '/feedings',
  '/weight',
  '/join',
  // Add other protected routes here
];

// Routes that are public and don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/auth/callback',
  '/auth/confirm',
  '/auth/reset',
  // Add other public routes here
];

// Routes that should skip auth checks completely
const SKIP_AUTH_ROUTES = [
  '/_next',
  '/api/auth',
  '/api/households',
  '/api/cats',
  '/static',
  '/images',
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
  '/site.webmanifest',
  '/sitemap.xml',
  '/apple-touch-icon',
  '/android-chrome',
  '/mstile',
  '/browserconfig.xml',
  '/sw.js',
  '/register-sw.js',
  '/offline.html',
  '/offline.css',
  // Add common static asset extensions
];

// Helper function to create Supabase client in middleware
function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: createMiddlewareCookieStore(request, response)
    }
  );
}

const isPublicRoute = (path: string) =>
  PUBLIC_ROUTES.some(route => path.startsWith(route));

// Helper to skip auth for static assets by extension
function hasStaticAssetExtension(path: string): boolean {
  return /\.(svg|png|jpg|jpeg|gif|webp|ico|json|xml|css|js|woff2?|ttf)$/i.test(path);
}

const shouldSkipAuth = (path: string) =>
  SKIP_AUTH_ROUTES.some(route => path.startsWith(route)) || hasStaticAssetExtension(path);

const isProtectedRoute = (path: string) =>
  path === '/' || PROTECTED_ROUTES.some(route => path.startsWith(route));

// Default cookie options for auth-related cookies
const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  priority: 'high',
  maxAge: 60 * 60 * 24 * 365 // 1 year
} as const;

// Auth-related cookie names that need special handling
const AUTH_COOKIE_NAMES = [
  'sb-access-token',
  'sb-refresh-token',
  'supabase-auth-token',
];

// Auth failures that are expected, not bugs: stale refresh token, missing
// session, revoked JWT. Treat them as "user needs to re-authenticate" rather
// than "something blew up". Without this, every visit to a protected page
// after a token rotation logs ERROR.
function isExpectedAuthFailure(userError: { name?: string; code?: string; message?: string } | null | undefined): boolean {
  if (!userError) return false;
  if (userError.name === 'AuthSessionMissingError') return true;

  const expectedCodes = new Set([
    'refresh_token_not_found',
    'refresh_token_already_used',
    'session_not_found',
    'session_expired',
    'bad_jwt',
  ]);
  if (userError.code && expectedCodes.has(userError.code)) return true;

  const message = userError.message ?? '';
  return (
    message.includes('Refresh Token Not Found') ||
    message.includes('Invalid Refresh Token') ||
    message.includes('Auth session missing')
  );
}

// When supabase-ssr's getUser() determines the refresh token is invalid it
// invokes the cookie store to delete the stale cookies. Those mutations live
// on `response`. If we later replace `response` with NextResponse.redirect(),
// those Set-Cookie headers are dropped and the browser keeps sending the bad
// cookie on every subsequent request. This helper does a defensive sweep:
// any sb-* cookie that came in on the request gets an explicit clear header
// on the response we are actually going to return.
function clearStaleSupabaseCookies(request: NextRequest, response: NextResponse): void {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.delete(cookie.name);
    }
  }
}

// NextResponse.redirect() returns a fresh response, dropping any cookie
// mutations that supabase-ssr applied to the previous response. This helper
// builds the redirect and re-applies those cookies so the browser actually
// receives the "clear stale auth cookies" instructions.
function redirectPreservingCookies(redirectUrl: URL, fromResponse: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(redirectUrl);
  for (const cookie of fromResponse.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export async function updateSession(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;
  
  // Prevent redirect loops - increased threshold and better logging
  const redirectCount = parseInt(request.headers.get('x-redirect-count') || '0');
  if (redirectCount > 5) {
    logger.error('[updateSession] Detected potential redirect loop:', {
      path: currentPath,
      redirectCount,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer')
    });
    // Instead of allowing the request, redirect to error page
    const errorUrl = new URL('/error', request.url);
    errorUrl.searchParams.set('message', 'redirect-loop-detected');
    return NextResponse.redirect(errorUrl);
  }

  // Skip auth check for static assets and API routes
  if (shouldSkipAuth(currentPath)) {
    return NextResponse.next();
  }

  // Skip auth check for public routes
  if (isPublicRoute(currentPath)) {
    return NextResponse.next();
  }

  // Create an initial response that will be modified by cookie operations
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createSupabaseMiddlewareClient(request, response);

  try {
    // Get the user state
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Handle auth errors with better error classification
    if (userError) {
      const errorInfo = userError as { name?: string; code?: string; message?: string; status?: number };
      const isExpectedFailure = isExpectedAuthFailure(errorInfo);
      const isTransientError = !isExpectedFailure && (
        (errorInfo.status ?? 500) >= 500 ||
        (typeof errorInfo.message === 'string' && errorInfo.message.toLowerCase().includes('network'))
      );

      const logPayload = {
        message: errorInfo.message,
        code: errorInfo.code,
        status: errorInfo.status ?? 400,
        name: errorInfo.name,
        path: currentPath,
        isExpectedFailure,
        isTransientError,
      };

      // Log based on error type and route protection status
      if (isProtectedRoute(currentPath)) {
        if (isExpectedFailure) {
          // Stale/missing session — expected when unauthenticated; quiet in dev/preview.
          const log = process.env.NODE_ENV === 'development' ? logger.debug.bind(logger) : logger.warn.bind(logger);
          log('[updateSession] Expected auth failure on protected route (re-auth required):', logPayload);
        } else if (isTransientError) {
          logger.warn('[updateSession] Transient auth error on protected route:', logPayload);
        } else {
          logger.error('[updateSession] Unexpected auth error on protected route:', logPayload);
        }
      } else if (!isExpectedFailure) {
        logger.info('[updateSession] Supabase user error (non-protected route):', logPayload);
      }

      // For transient errors on protected routes, allow the request to proceed
      if (isProtectedRoute(currentPath) && isTransientError) {
        logger.warn(`[updateSession] Allowing request despite transient error on protected path: ${currentPath}`);
        return response;
      }

      // For protected routes with an expected/non-transient auth failure,
      // redirect to /login AND make sure stale auth cookies get cleared on
      // the redirect response (supabase-ssr already requested the clear on
      // `response`; redirectPreservingCookies copies those Set-Cookie headers
      // onto the redirect we actually return).
      if (isProtectedRoute(currentPath)) {
        if (isExpectedFailure) {
          clearStaleSupabaseCookies(request, response);
        }
        if (process.env.NODE_ENV !== 'development') {
          logger.warn(`[updateSession] Redirecting due to userError on protected path: ${currentPath}`);
        } else {
          logger.debug(`[updateSession] Redirecting due to userError on protected path: ${currentPath}`);
        }
        const redirectUrl = new URL('/login', request.url);
        if (currentPath !== '/') {
          redirectUrl.searchParams.set('redirectTo', currentPath);
        }
        response = redirectPreservingCookies(redirectUrl, response);
        response.headers.set('x-redirect-count', (redirectCount + 1).toString());
        return response;
      }

      // Allow non-protected routes even if getUser has error (might be transient)
      if (!isExpectedFailure) {
        logger.warn(`[updateSession] Allowing request despite userError on non-protected path: ${currentPath}`);
      }
      return response;
    }

    // --- Authentication Logic (Based on getUser result) ---

    // Redirect authenticated users away from public routes (login, signup)
    if (isPublicRoute(currentPath) && user) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/';
      const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
      logger.debug(`[updateSession] Authenticated user accessing public route ${currentPath}. Redirecting to ${safeRedirect}.`);
      response = redirectPreservingCookies(new URL(safeRedirect, request.url), response);
      response.headers.set('x-redirect-count', (redirectCount + 1).toString());
      return response;
    }

    // Redirect unauthenticated users away from protected routes
    if (isProtectedRoute(currentPath) && !user) {
      logger.debug(`[updateSession] Unauthenticated user accessing protected route ${currentPath}. Redirecting to login.`);
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectTo', currentPath);
      response = redirectPreservingCookies(redirectUrl, response);
      response.headers.set('x-redirect-count', (redirectCount + 1).toString());
      return response;
    }
    
    // If none of the above conditions caused a redirect, the user is allowed access
    logger.debug(`[updateSession] Auth check passed for path: ${currentPath}. User authenticated: ${!!user}`);
    return response;

  } catch (_error) {
    logger.error('[updateSession] Unexpected _error during auth check:', _error as any);
    // Redirect on generic _error only for protected routes
    if (isProtectedRoute(currentPath)) {
       logger.warn(`[updateSession] Redirecting due to unexpected _error on protected path: ${currentPath}`);
       const redirectUrl = new URL('/login', request.url);
       if (currentPath !== '/') {
          redirectUrl.searchParams.set('redirectTo', currentPath);
       }
       response = NextResponse.redirect(redirectUrl);
       response.headers.set('x-redirect-count', (redirectCount + 1).toString());
       return response;
    }
    // Allow request on non-protected routes even if there's an _error
    logger.warn(`[updateSession] Allowing request despite unexpected _error on non-protected path: ${currentPath}`);
    return response;
  }
}

// Re-export createMiddlewareClient for backward compatibility
export const createMiddlewareClient = async (request: NextRequest, response: NextResponse) => {
  return { supabase: createSupabaseMiddlewareClient(request, response), response };
}; 