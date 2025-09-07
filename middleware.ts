import { NextRequest, NextResponse } from "next/server";
import { imageCache } from '@/lib/image-cache';
import { metricsMonitor } from '@/lib/monitoring/metrics';
import { logger } from '@/lib/monitoring/logger';
import { redirectionLogger } from '@/lib/monitoring/redirection-logger';
import { updateSession } from '@/utils/supabase/middleware';
import { handleAuthError } from '@/lib/utils/auth-errors';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createMiddlewareCookieStore } from '@/lib/supabase/cookie-store';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/api/auth/callback',
  '/api/auth/mobile',
  '/api/auth/mobile/register',
  '/_next',
  '/static',
  '/images',
  '/favicon.ico'
];

// API routes that should return JSON
const apiRoutes = [
  '/api/settings',
  '/api/users',
  '/api/households',
  '/api/notifications',
  '/api/cats',
  '/api/goals',
  '/api/weight-logs'
];

// Initialize metrics
metricsMonitor.registerMetric(
  'http_requests_total',
  'Total de requisições HTTP',
  'counter'
);

metricsMonitor.registerMetric(
  'http_request_duration_ms',
  'Duração das requisições HTTP em milissegundos',
  'histogram'
);

metricsMonitor.registerMetric(
  'http_response_size_bytes',
  'Tamanho das respostas HTTP em bytes',
  'histogram'
);

metricsMonitor.registerMetric(
  'http_errors_total',
  'Total de erros HTTP',
  'counter'
);

// Helper function to check if a path matches a pattern
function isPathMatch(path: string, pattern: string): boolean {
  return path === pattern || path.startsWith(pattern + '/');
}

// Function to apply security headers to a response
function applySecurityHeadersToResponse(response: NextResponse, request: NextRequest): NextResponse {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
  const supabaseDomain = supabaseUrl ? supabaseUrl.hostname : '';
  const supabaseStorageDomain = supabaseDomain ? `*.${supabaseDomain.split('.').slice(1).join('.')}` : '';

  const cspHeader = [
    "default-src 'self'",
    `connect-src 'self' ${supabaseUrl ? supabaseUrl.origin : ''} wss://*.supabase.co https://accounts.google.com https://*.google.com https://*.gstatic.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.gstatic.com https://*.google.com`,
    `img-src 'self' data: blob: ${supabaseStorageDomain ? `https://${supabaseStorageDomain}` : ''} https://accounts.google.com https://*.googleusercontent.com https://api.dicebear.com`,
    `frame-src 'self' ${supabaseUrl ? supabaseUrl.origin : ''} https://accounts.google.com https://*.google.com`,
    "form-action 'self' https://accounts.google.com https://*.google.com",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim());
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (request.url.startsWith('https://')) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

// Helper function to create Supabase client (reuse from API routes)
function createSupabaseRouteClient(request: NextRequest) {
  const response = NextResponse.next();
  const cookieStore = createMiddlewareCookieStore(request, response);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieStore,
    }
  );
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  logger.debug(`[Middleware Root] Processing request for: ${pathname}`, { url: request.nextUrl.toString() });

  try {
    // Check if this is an API route
    const isApiRoute = apiRoutes.some(route => pathname.startsWith(route));

    // For API routes, handle auth differently
    if (isApiRoute) {
      try {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
          const response = new NextResponse(null, { status: 200 });
          
          // Apply CORS headers for preflight
          const origin = request.headers.get('origin');
          const allowedOrigins = [
            'http://localhost:3000',
            'https://mealtime.vercel.app',
            'capacitor://localhost',
            'ionic://localhost',
            'file://'
          ];
          
          if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            response.headers.set('Access-Control-Allow-Origin', origin);
          } else {
            response.headers.set('Access-Control-Allow-Origin', '*');
          }
          
          response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
          response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
          response.headers.set('Access-Control-Max-Age', '86400');
          response.headers.set('Access-Control-Allow-Credentials', 'true');
          
          return response;
        }

        const supabase = createSupabaseRouteClient(request);
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { 
              status: 401,
              headers: {
                'Content-Type': 'application/json',
              }
            }
          );
        }

        // User is authenticated, proceed with the request
        let response = NextResponse.next();
        
        // Apply API-specific headers with mobile support
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        
        // Handle CORS for mobile apps
        const origin = request.headers.get('origin');
        const allowedOrigins = [
          'http://localhost:3000',
          'https://mealtime.vercel.app',
          'capacitor://localhost', // Capacitor apps
          'ionic://localhost', // Ionic apps
          'file://' // Cordova apps
        ];
        
        if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
          response.headers.set('Access-Control-Allow-Origin', origin);
        } else {
          response.headers.set('Access-Control-Allow-Origin', '*');
        }
        
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
        response.headers.set('Content-Type', 'application/json');
        
        return applySecurityHeadersToResponse(response, request);
      } catch (error) {
        logger.error('[Middleware API] Error handling API request:', { 
          error: error.message,
          path: pathname 
        });
        
        return NextResponse.json(
          { error: 'Internal server error' },
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }

    // --- Delegate Core Auth Logic to updateSession for non-API routes ---
    let response = await updateSession(request);
    // -------------------------------------------------

    // Apply security headers to the response from updateSession
    response = applySecurityHeadersToResponse(response, request);

    return response;

  } catch (error) {
    logger.error('[Middleware Root] Unexpected error:', { 
      message: error.message, 
      stack: error.stack,
      path: pathname 
    });
    
    // Handle errors differently for API routes
    if (apiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // For non-API routes, redirect to error page
    const url = request.nextUrl.clone();
    url.pathname = '/error';
    return applySecurityHeadersToResponse(NextResponse.redirect(url), request);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - site.webmanifest, robots.txt, sitemap.xml, browserconfig.xml
     * - common static asset extensions
     * 
     * Ensure this correctly excludes static assets while including API and page routes.
     */
    '/((?!_next/static|_next/image|favicon.ico|site.webmanifest|robots.txt|sitemap.xml|browserconfig.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|xml)$).*)',
  ],
}; 