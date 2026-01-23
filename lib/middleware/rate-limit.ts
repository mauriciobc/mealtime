import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/logger';
import { ApiResponse } from '@/lib/responses/api-responses';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 100
};

const inMemoryStore = new Map<string, RateLimitEntry>();

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
  return ip;
}

export function createRateLimiter(config: RateLimitConfig = defaultConfig) {
  return function rateLimit(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const identifier = getClientIdentifier(request);
    const now = Date.now();
    
    let entry = inMemoryStore.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + config.windowMs
      };
      inMemoryStore.set(identifier, entry);
    } else {
      entry.count++;
    }
    
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const headers = {
      'X-RateLimit-Limit': String(config.maxRequests),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000))
    };
    
    if (entry.count > config.maxRequests) {
      logger.warn('Rate limit exceeded', { 
        identifier, 
        count: entry.count, 
        limit: config.maxRequests 
      });
      
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return Promise.resolve(
        NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(config.maxRequests),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
              'Retry-After': String(retryAfter),
              'Access-Control-Allow-Origin': '*'
            }
          }
        )
      );
    }
    
    return handler(request).then(response => {
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    });
  };
}

export function withRateLimit<
  P extends Record<string, unknown> = Record<string, unknown>
>(
  handler: (
    request: NextRequest,
    context?: { params: Promise<P> }
  ) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  const rateLimiter = createRateLimiter(config);
  
  return async (request: NextRequest, context: { params: Promise<P> }): Promise<NextResponse> => {
    return rateLimiter(request, (req) => handler(req, context));
  };
}

export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100
});

export function getRateLimitHeaders(request: NextRequest): Record<string, string> {
  const identifier = getClientIdentifier(request);
  const entry = inMemoryStore.get(identifier);
  
  if (!entry) {
    return {
      'X-RateLimit-Limit': String(defaultConfig.maxRequests),
      'X-RateLimit-Remaining': String(defaultConfig.maxRequests)
    };
  }
  
  return {
    'X-RateLimit-Limit': String(defaultConfig.maxRequests),
    'X-RateLimit-Remaining': String(Math.max(0, defaultConfig.maxRequests - entry.count)),
    'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000))
  };
}
