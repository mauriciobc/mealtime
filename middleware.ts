import { NextRequest, NextResponse } from 'next/server';

// Lista de origens permitidas - configurada via variáveis de ambiente
const getAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  
  // Adicionar origens padrão baseadas no ambiente
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  
  // Adicionar origem de produção se definida
  if (process.env.PRODUCTION_ORIGIN) {
    origins.push(process.env.PRODUCTION_ORIGIN);
  }
  
  return origins.filter(Boolean);
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Aplicar CORS apenas para rotas da API
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = getAllowedOrigins();
    
    // Verificar se a origem está na lista de origens permitidas
    if (origin && allowedOrigins.includes(origin)) {
      // Definir headers CORS apenas para origens válidas
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
      // Para origens não permitidas, não definir Access-Control-Allow-Credentials
      // Isso previne ataques CSRF
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
    
    // Headers CORS padrão (sempre aplicados)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    // Lidar com requisições OPTIONS (preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200, 
        headers: response.headers 
      });
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
