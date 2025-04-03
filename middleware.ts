import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { imageCache } from '@/lib/image-cache';

// Rotas públicas que não requerem autenticação
const publicRoutes = ["/login", "/signup", "/terms", "/privacy"];

// Rotas de administrador que requerem papel específico
const adminRoutes = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('[Middleware] Processing request for:', pathname);

  // List of public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/signup',
    '/terms',
    '/privacy',
    '/api/auth',
    '/_next',
    '/favicon.ico',
  ];

  // Verificar se é uma requisição para uma imagem de perfil
  if (pathname.startsWith('/profiles/')) {
    try {
      // Normalize the path by removing leading slash for cache lookup
      const cachePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      
      // Tentar obter a imagem do cache
      const imageData = await imageCache.get(cachePath);
      
      if (imageData) {
        // Se encontrada no cache, servir diretamente
        return new NextResponse(imageData, {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } else {
        // Se não encontrada no cache, retornar 404
        return new NextResponse(null, {
          status: 404,
          statusText: 'Image not found'
        });
      }
    } catch (error) {
      console.error('Erro ao servir imagem do cache:', error);
      return new NextResponse(null, {
        status: 500,
        statusText: 'Internal Server Error'
      });
    }
  }

  // Check if the current path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  console.log('[Middleware] Path access check:', { pathname, isPublicPath });

  // Allow all static files and API routes without token check
  if (
    pathname.startsWith('/_next') || // Next.js resources
    pathname.startsWith('/api/auth') || // Auth endpoints
    pathname === '/favicon.ico'
  ) {
    console.log('[Middleware] Allowing static/system path:', pathname);
    return NextResponse.next();
  }

  // Get the token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });

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
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (request.nextUrl.pathname.startsWith('/api/')) {
    console.log('[Middleware] JWT token for API request:', token ? 'Present' : 'Not present');
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
     */
    '/((?!api/auth|_next|static|favicon.ico|sitemap.xml).*)',
  ],
}; 