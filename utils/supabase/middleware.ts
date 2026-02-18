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
  return /\.(svg|png|jpg|jpeg|gif|webp|ico|json|xml)$/i.test(path);
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
      const isSessionMissing = userError.name === 'AuthSessionMissingError';
      const isTransientError = (userError?.status ?? 500) >= 500 || 
        (userError.message && typeof userError.message === 'string' && 
         userError.message.toLowerCase().includes('network'));
      
      // Log based on error type and route protection status
      if (isProtectedRoute(currentPath)) {
        // For protected routes: AuthSessionMissingError is expected (unauthorized access attempt)
        // Log as WARN for session missing, ERROR only for unexpected errors
        if (isSessionMissing) {
          logger.warn('[updateSession] Unauthenticated access attempt to protected route:', { 
            message: userError.message, 
            code: (userError?.status ?? 400), 
            name: userError.name, 
            path: currentPath,
            isSessionMissing: true
          });
        } else if (isTransientError) {
          // Transient errors (network, server issues) - log as WARN
          logger.warn('[updateSession] Transient auth error on protected route:', { 
            message: userError.message, 
            code: (userError?.status ?? 500), 
            name: userError.name, 
            path: currentPath,
            isTransientError: true
          });
        } else {
          // Unexpected non-transient errors - log as ERROR
          logger.error('[updateSession] Unexpected auth error on protected route:', { 
            message: userError.message, 
            code: (userError?.status ?? 500), 
            name: userError.name, 
            path: currentPath
          });
        }
      } else {
        // Non-protected routes: log as info to avoid noisy logs for expected cases
        logger.info('[updateSession] Supabase user error (non-protected route, likely expected):', { 
          message: userError.message, 
          code: (userError?.status ?? 500), 
          name: userError.name, 
          path: currentPath,
          isSessionMissing,
          isTransientError
        });
      }

      // For protected routes, only redirect if it's a session missing error or non-transient error
      if (isProtectedRoute(currentPath) && (isSessionMissing || !isTransientError)) {
        logger.warn(`[updateSession] Redirecting due to userError on protected path: ${currentPath}`);
        const redirectUrl = new URL('/login', request.url);
        if (currentPath !== '/') {
          redirectUrl.searchParams.set('redirectTo', currentPath);
        }
        response = NextResponse.redirect(redirectUrl);
        response.headers.set('x-redirect-count', (redirectCount + 1).toString());
        return response;
      }
      
      // For transient errors on protected routes, allow the request to proceed
      if (isProtectedRoute(currentPath) && isTransientError) {
        logger.warn(`[updateSession] Allowing request despite transient error on protected path: ${currentPath}`);
        return response;
      }
      
      // Allow non-protected routes even if getUser has error (might be transient)
      logger.warn(`[updateSession] Allowing request despite userError on non-protected path: ${currentPath}`);
      return response;
    }

    // --- Authentication Logic (Based on getUser result) ---

    // Redirect authenticated users away from public routes (login, signup)
    if (isPublicRoute(currentPath) && user) {
      logger.debug(`[updateSession] Authenticated user accessing public route ${currentPath}. Redirecting to /.`);
      response = NextResponse.redirect(new URL('/', request.url));
      response.headers.set('x-redirect-count', (redirectCount + 1).toString());
      return response;
    }

    // Redirect unauthenticated users away from protected routes
    if (isProtectedRoute(currentPath) && !user) {
      logger.debug(`[updateSession] Unauthenticated user accessing protected route ${currentPath}. Redirecting to login.`);
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectTo', currentPath);
      response = NextResponse.redirect(redirectUrl);
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