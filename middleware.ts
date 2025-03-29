import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { imageCache } from '@/lib/image-cache';

// Rotas públicas que não requerem autenticação
const publicRoutes = ["/login", "/signup", "/api/auth"];

// Rotas de administrador que requerem papel específico
const adminRoutes = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar se a rota é pública
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Verificar o token de autenticação
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Se não estiver autenticado, redirecionar para login
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  // Verificar permissões para rotas de administrador
  if (adminRoutes.some((route) => pathname.startsWith(route)) && token.role !== "Admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Verificar se é uma requisição para uma imagem de perfil
  if (pathname.startsWith('/profiles/')) {
    try {
      // Tentar obter a imagem do cache
      const imageData = await imageCache.get(pathname);
      
      if (imageData) {
        // Se encontrada no cache, servir diretamente
        return new NextResponse(imageData, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (error) {
      console.error('Erro ao servir imagem do cache:', error);
    }
  }

  return NextResponse.next();
}

// Configurar em quais caminhos o middleware deve ser executado
export const config = {
  matcher: [
    // Caminhos que requerem autenticação
    "/",
    "/cats/:path*",
    "/households/:path*",
    "/schedule/:path*",
    "/settings/:path*",
    "/history/:path*",
    "/statistics/:path*",
    "/admin/:path*",
    "/api/households/:path*",
    "/api/cats/:path*",
    "/api/feeding-logs/:path*",
    '/profiles/:path*'
  ]
} 