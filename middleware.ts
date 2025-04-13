import { NextRequest, NextResponse } from "next/server";
import { imageCache } from '@/lib/image-cache';

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

export async function middleware(request: NextRequest) {
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

    // Set JSON headers for API routes
    const response = NextResponse.next();
    response.headers.set('Content-Type', 'application/json');
    return response;
  }

  // Let Next.js handle static files in /public directory
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
            'Content-Type': 'image/jpeg',
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

  // Check if the current path is public
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

  // Add security headers
  const response = NextResponse.next();
  
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.gstatic.com https://*.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com",
    "img-src 'self' data: https://* blob: https://*.google.com https://*.gstatic.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "frame-src 'self' https://accounts.google.com https://*.google.com",
    "connect-src 'self' https://accounts.google.com https://*.google.com https://*.gstatic.com",
    "form-action 'self' https://accounts.google.com https://*.google.com",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY'); // Or SAMEORIGIN
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'); // If site is fully HTTPS

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api/auth (NextAuth.js authentication routes)
     * 2. /_next (Next.js internals)
     * 3. /static (static files)
     * 4. /favicon.ico, /sitemap.xml (public files)
     * Include specific API routes if they need protection and aren't auth-related
     */
    // Simplified matcher - protect everything except explicitly allowed paths
     '/((?!api/auth|_next/static|_next/image|favicon.ico|terms|privacy|signup|login).*) '
     // Refined matcher: Protects everything by default.
     // Excludes API auth routes, Next.js internals, static assets, and specific public pages.
    // '/((?!api/auth/|_next/|_static/|favicon.ico|login|signup|terms|privacy).*) ',
  ],
}; 