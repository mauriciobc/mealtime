import { NextRequest, NextResponse } from "next/server";
import { imageCache } from '@/lib/image-cache';
import { metrics } from '@/lib/monitoring/metrics';
import { logger } from '@/lib/monitoring/logger';

// Public paths that don't require authentication
const publicPaths = [
  '/login',
  '/signup',
  '/terms',
  '/privacy',
  '/api/auth',
  '/_next',
  '/favicon.ico',
];

// API routes that should return JSON
const apiRoutes = [
  '/api/settings',
  '/api/users',
  '/api/households',
  '/api/notifications',
];

// Inicializa métricas
metrics.registerMetric(
  'http_requests_total',
  'Total de requisições HTTP',
  'counter'
);

metrics.registerMetric(
  'http_request_duration_ms',
  'Duração das requisições HTTP em milissegundos',
  'histogram'
);

metrics.registerMetric(
  'http_response_size_bytes',
  'Tamanho das respostas HTTP em bytes',
  'histogram'
);

metrics.registerMetric(
  'http_errors_total',
  'Total de erros HTTP',
  'counter'
);

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Incrementa contador de requisições
    metrics.incrementCounter('http_requests_total', {
      method: request.method,
      path: request.nextUrl.pathname,
    });

    const { pathname } = request.nextUrl;
    console.log('[Middleware] Processing request for:', pathname);

    // Handle API routes first
    const isApiRoute = apiRoutes.some(route => pathname.startsWith(route));
    if (isApiRoute) {
      // Get all possible session tokens
      const token = 
        request.cookies.get('next-auth.session-token')?.value ||
        request.cookies.get('__Secure-next-auth.session-token')?.value ||
        request.cookies.get('__Host-next-auth.session-token')?.value;
      
      console.log('[Middleware] API route token check:', { 
        hasToken: !!token,
        path: pathname,
        cookies: request.cookies.getAll().map(c => c.name)
      });
      
      if (!token) {
        return NextResponse.json({ error: "Não autorizado" }, { 
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      // If token exists for an API route, set JSON headers and continue
      const apiResponse = NextResponse.next();
      apiResponse.headers.set('Content-Type', 'application/json');
      return apiResponse; // Return here for API routes after auth check
    }

    // Handle image caching for profile images
    if (pathname.startsWith('/profiles/')) {
      try {
        // Normalize the path by removing leading slash for cache lookup
        const cachePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        
        // Try to get image from cache
        const imageData = await imageCache.get(cachePath);
        
        if (imageData) {
          // If found in cache, serve directly
          return new NextResponse(imageData, {
            status: 200,
            headers: {
              'Content-Type': 'image/jpeg', // Assuming JPEG, adjust if needed
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        }

        // If not in cache, let Next.js handle the static file
        return NextResponse.next();
      } catch (error) {
        console.error('Error serving image from cache:', error);
        // On error, let Next.js try to handle the static file
        return NextResponse.next();
      }
    }

    // Check if the current path is public (outside API/image handling)
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
    console.log('[Middleware] Path access check:', { pathname, isPublicPath });

    // Allow certain paths without token check
    if (
      pathname.startsWith('/_next') || // Next.js resources
      pathname.startsWith('/api/auth') || // Auth endpoints
      pathname === '/favicon.ico'
    ) {
      console.log('[Middleware] Allowing static/system path:', pathname);
      return NextResponse.next();
    }

    // Get the session token from the cookie (check all possible names)
    const token =
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value ||
      request.cookies.get('__Host-next-auth.session-token')?.value;

    console.log('[Middleware] Token status:', {
      path: pathname,
      hasToken: !!token,
      isPublicPath
    });

    // Redirect authenticated users away from auth pages
    if (token && isPublicPath) {
      console.log('[Middleware] Authenticated user accessing public path, redirecting to home');
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Redirect unauthenticated users to login
    if (!token && !isPublicPath) {
      console.log('[Middleware] Unauthenticated user accessing protected path, redirecting to login');

      // **Diagnostic Log:** Log the NEXTAUTH_URL value as seen by the middleware
      const rawNextAuthUrl = process.env.NEXTAUTH_URL;
      console.log(`[Middleware] Value of process.env.NEXTAUTH_URL: ${rawNextAuthUrl}`);

      // Fix URL construction
      let baseUrl = rawNextAuthUrl; // Use the logged value

      if (!baseUrl) {
        console.log('[Middleware] NEXTAUTH_URL is missing or empty, falling back to headers.');
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
        // Determine protocol - If NEXTAUTH_URL was missing, this logic is flawed as it still checks it.
        // Safer fallback might be needed, but let's first confirm if NEXTAUTH_URL is actually missing.
        const protocol = rawNextAuthUrl?.startsWith('https') ? 'https' : 'http'; // Still potentially flawed if rawNextAuthUrl is undefined
        baseUrl = `${protocol}://${host}`;
        console.log(`[Middleware] Fallback baseUrl constructed from headers: ${baseUrl}`);
      } else {
         console.log(`[Middleware] Using NEXTAUTH_URL for baseUrl: ${baseUrl}`);
      }

      // Ensure baseUrl doesn't have trailing slash
      baseUrl = baseUrl.replace(/\/$/, '');
      console.log(`[Middleware] Base URL after removing trailing slash: ${baseUrl}`);

      const loginUrl = new URL('/login', baseUrl);

      // Ensure callback URL is from the same domain
      try {
        const requestUrl = request.url;
        const callbackUrl = new URL(requestUrl);
        const baseUrlObj = new URL(baseUrl); // Use the potentially fixed baseUrl

        if (callbackUrl.host === baseUrlObj.host) {
          loginUrl.searchParams.set('callbackUrl', requestUrl);
        } else {
          console.warn(`[Middleware] Callback URL host (${callbackUrl.host}) differs from base URL host (${baseUrlObj.host}). Defaulting callback to root.`);
          loginUrl.searchParams.set('callbackUrl', '/');
        }
      } catch (error) {
        console.error('[Middleware] Error processing callback URL:', error);
        loginUrl.searchParams.set('callbackUrl', '/'); // Default to root on error
      }

      console.log('[Middleware] Final Redirect URL:', loginUrl.toString());
      return NextResponse.redirect(loginUrl);
    }

    // If authenticated or public path allowed, proceed and add security headers
    const response = NextResponse.next();

    // Incrementa contador de requisições e mede duração/tamanho no final bem sucedido
    const duration = Date.now() - startTime;
    metrics.observeHistogram('http_request_duration_ms', duration, {
      method: request.method,
      path: pathname,
      status: response.status,
    });

    const responseSize = Number(response.headers.get('content-length') || 0);
    if (responseSize > 0) {
      metrics.observeHistogram('http_response_size_bytes', responseSize, {
        method: request.method,
        path: pathname,
        status: response.status,
      });
    }

    // Add security headers
    const cspHeader = [
      "default-src 'self'",
      // Allow Google Fonts andgstatic for fonts/styles
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com", 
      "font-src 'self' data: https://fonts.gstatic.com",
      // Allow Google Sign-In scripts and related resources
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.gstatic.com https://*.google.com", 
      // Allow images from self, data URIs, Google domains, and blobs (potentially needed for uploads/previews)
      "img-src 'self' data: https://* blob:", 
      // Allow connections to Google services
      "connect-src 'self' https://accounts.google.com https://*.google.com https://*.gstatic.com", 
      // Allow framing only from Google for Sign-In
      "frame-src 'self' https://accounts.google.com https://*.google.com", 
      // Allow form submissions to Google for Sign-In
      "form-action 'self' https://accounts.google.com https://*.google.com", 
    ].join('; ');

    response.headers.set('Content-Security-Policy', cspHeader.replace(/\\s{2,}/g, ' ').trim()); // Clean up CSP string
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Only set HSTS if the site is fully HTTPS
    if (request.url.startsWith('https://')) {
       response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'); // Example: restrict permissions

    return response;
  } catch (error) {
    logger.error('Middleware error:', { 
        error: error instanceof Error ? error.message : String(error), 
        stack: error instanceof Error ? error.stack : undefined,
        pathname: request.nextUrl.pathname,
        method: request.method,
    });

    // Incrementa contador de erros
    metrics.incrementCounter('http_errors_total', {
      method: request.method,
      path: request.nextUrl.pathname,
      status: 500, // Assume internal server error
    });

    // Provide a generic error response
    // Check if it was an API route request based on original path
    const isApiRoute = apiRoutes.some(route => request.nextUrl.pathname.startsWith(route));
    if (isApiRoute) {
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } else {
      // For non-API routes, maybe redirect to an error page or return simple text
      // Avoid complex rendering in middleware error fallback
      return new NextResponse('Internal Server Error', { status: 500 }); 
    }
  }
}

// Matcher specifies which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api routes that don't need auth (e.g., /api/auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /public files (handled separately for caching if needed)
     * Adjust the negative lookaheads as needed
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)', 
  ],
}; 