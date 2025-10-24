import { NextRequest, NextResponse } from "next/server";
import { imageCache } from '@/lib/image-cache';
import { metricsMonitor } from '@/lib/monitoring/metrics';
import { logger } from '@/lib/monitoring/logger';
import { redirectionLogger } from '@/lib/monitoring/redirection-logger';
import { updateSession } from '@/utils/supabase/middleware';
import { handleAuthError } from '@/lib/utils/auth-errors';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createMiddlewareCookieStore } from '@/lib/supabase/cookie-store';

// Build ALLOWED_ORIGINS from environment variable with fallback to default array
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  'https://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://127.0.0.1:3000',
  'https://127.0.0.1:3001'
];

const ALLOWED_ORIGINS = (() => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins && envOrigins.trim()) {
    return envOrigins
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
  }
  return DEFAULT_ALLOWED_ORIGINS;
})();

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

// Helper function to normalize and validate origin
function normalizeOrigin(origin: string): string | null {
  try {
    const url = new URL(origin);
    return url.origin;
  } catch {
    return null;
  }
}

// Helper function to check if origin is allowed
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }
  return allowedOrigins.includes(normalizedOrigin);
}

// Helper function to detect HTTPS reliably for HSTS header
function detectHttps(request: NextRequest): boolean {
  // Check if we're in production environment
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Skip HSTS for localhost/development
  if (!isProduction) {
    return false;
  }
  
  // Check forwarded protocol headers (for reverse proxies/load balancers)
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto === 'https') {
    return true;
  }
  
  // Check other common forwarded headers
  const forwardedSsl = request.headers.get('x-forwarded-ssl');
  if (forwardedSsl === 'on') {
    return true;
  }
  
  // Check Cloudflare's CF-Visitor header
  const cfVisitor = request.headers.get('cf-visitor');
  if (cfVisitor && cfVisitor.includes('"scheme":"https"')) {
    return true;
  }
  
  // Fallback: check if URL starts with https (for direct connections)
  // This is less reliable behind proxies but still useful as fallback
  if (request.url.startsWith('https://')) {
    return true;
  }
  
  // Additional fallback: check environment flag
  const forceHttps = process.env.FORCE_HTTPS === 'true';
  if (forceHttps) {
    return true;
  }
  
  return false;
}

// Function to apply security headers to a response
function applySecurityHeadersToResponse(response: NextResponse, request: NextRequest): NextResponse {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
  const supabaseDomain = supabaseUrl ? supabaseUrl.hostname.trim() : '';
  
  // Build supabaseStorageDomain with proper validation for short domains
  let supabaseStorageDomain = '';
  if (supabaseDomain) {
    const parts = supabaseDomain.split('.');
    if (parts.length >= 3) {
      // Only strip first label when there are at least 3 labels
      supabaseStorageDomain = `*.${parts.slice(1).join('.')}`;
    } else {
      // For short domains, use the domain itself with wildcard
      supabaseStorageDomain = `*.${supabaseDomain}`;
    }
  }

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
  // Detect HTTPS reliably for HSTS header - handle reverse proxies/load balancers
  const isHttps = detectHttps(request);
  if (isHttps) {
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

// Helper function to record response metrics
function recordResponseMetrics(
  startTime: number, 
  response: NextResponse, 
  method: string, 
  path: string
): void {
  const duration = Date.now() - startTime;
  const status = response.status;
  
  // Registrar duração da requisição
  metricsMonitor.observeHistogram('http_request_duration_ms', duration, {
    method: method,
    path: path,
    status: status.toString()
  });
  
  // Registrar tamanho da resposta
  const contentLength = response.headers.get('content-length');
  let responseSize = 0;
  
  if (contentLength) {
    responseSize = parseInt(contentLength, 10);
  } else {
    // Se não temos Content-Length, tentamos estimar pelo tipo de resposta
    // Para respostas JSON, podemos estimar o tamanho baseado no conteúdo
    if (response.headers.get('content-type')?.includes('application/json')) {
      // Estimativa conservadora para respostas JSON pequenas
      responseSize = 200; // bytes
    } else if (response.headers.get('content-type')?.includes('text/html')) {
      // Estimativa para páginas HTML
      responseSize = 5000; // bytes
    }
  }
  
  if (responseSize > 0) {
    metricsMonitor.observeHistogram('http_response_size_bytes', responseSize, {
      method: method,
      path: path,
      status: status.toString()
    });
  }
}

// Helper function to record error metrics
function recordErrorMetrics(
  startTime: number,
  method: string,
  path: string,
  status: number
): void {
  const duration = Date.now() - startTime;
  
  // Incrementar contador de erros
  metricsMonitor.incrementCounter('http_errors_total', {
    method: method,
    path: path,
    status: status.toString()
  });
  
  // Registrar duração mesmo para erros
  metricsMonitor.observeHistogram('http_request_duration_ms', duration, {
    method: method,
    path: path,
    status: status.toString()
  });
}

export default async function proxy(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const method = request.method;
  
  // Incrementar contador de requisições HTTP no início
  metricsMonitor.incrementCounter('http_requests_total', {
    method: method,
    path: pathname
  });
  
  logger.debug(`[Middleware Root] Processing request for: ${pathname}`, { url: request.nextUrl.toString() });

  try {
    // Check if this is an API route
    const isApiRoute = apiRoutes.some(route => pathname.startsWith(route));

    // For API routes, handle auth differently
    if (isApiRoute) {
      try {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
          const origin = request.headers.get('origin');
          const response = new NextResponse(null, { status: 200 });
          
          // Add CORS headers if origin is allowed
          if (origin && isOriginAllowed(origin, ALLOWED_ORIGINS)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            response.headers.set('Access-Control-Allow-Credentials', 'true');
          }
          
          recordResponseMetrics(startTime, response, method, pathname);
          return response;
        }

        const supabase = createSupabaseRouteClient(request);
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          const response = NextResponse.json(
            { error: 'Unauthorized' },
            { 
              status: 401,
              headers: {
                'Content-Type': 'application/json',
              }
            }
          );
          recordErrorMetrics(startTime, method, pathname, 401);
          return response;
        }

        // User is authenticated, proceed with the request
        const response = NextResponse.next();
        
        // Add CORS headers for regular requests if origin is allowed
        const origin = request.headers.get('origin');
        if (origin && isOriginAllowed(origin, ALLOWED_ORIGINS)) {
          response.headers.set('Access-Control-Allow-Origin', origin);
          response.headers.set('Access-Control-Allow-Credentials', 'true');
        }
        
        recordResponseMetrics(startTime, response, method, pathname);
        return response;
        
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        
        logger.error('[Middleware API] Error handling API request:', { 
          error: msg,
          stack: stack,
          path: pathname 
        });
        
        const response = NextResponse.json(
          { error: 'Internal server error' },
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        recordErrorMetrics(startTime, method, pathname, 500);
        return response;
      }
    }

    // --- Delegate Core Auth Logic to updateSession for non-API routes ---
    let response = await updateSession(request);
    // -------------------------------------------------

    // Apply security headers to the response from updateSession
    response = applySecurityHeadersToResponse(response, request);

    // Registrar métricas para rotas não-API
    recordResponseMetrics(startTime, response, method, pathname);
    return response;

  } catch (error) {
    // Defensive type guard for safe error handling
    let safeMessage: string;
    let errorStack: string | undefined;
    let errorObject: any = error;
    
    if (error instanceof Error) {
      safeMessage = error.message;
      errorStack = error.stack;
    } else {
      safeMessage = String(error);
      errorStack = undefined;
    }
    
    // Log both the safe message and full error object for debugging
    logger.error('[Middleware Root] Unexpected error:', { 
      message: safeMessage, 
      stack: errorStack,
      path: pathname,
      errorType: typeof error,
      errorObject: errorObject
    });
    
    // Handle errors differently for API routes
    if (apiRoutes.some(route => pathname.startsWith(route))) {
      const response = NextResponse.json(
        { error: 'Internal server error' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      recordErrorMetrics(startTime, method, pathname, 500);
      return response;
    }
    
    // For non-API routes, redirect to error page
    const url = request.nextUrl.clone();
    url.pathname = '/error';
    const response = applySecurityHeadersToResponse(NextResponse.redirect(url), request);
    recordErrorMetrics(startTime, method, pathname, 500);
    return response;
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