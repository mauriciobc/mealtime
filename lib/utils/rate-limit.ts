import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/logger';

// Initialize Supabase admin client for direct database access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
);

interface RateLimitConfig {
  maxRequests: number;    // Maximum number of requests allowed
  windowMs: number;       // Time window in milliseconds
  blockDurationMs: number; // How long to block after exceeding limit (ms)
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 5,        // 5 requests
  windowMs: 900000,      // 15 minutes
  blockDurationMs: 900000 // 15 minutes block
};

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async isRateLimited(identifier: string, prefix: string = 'auth'): Promise<{
    limited: boolean;
    retryAfter?: number;
  }> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - this.config.windowMs);

      // Check if IP is blocked
      const { data: blockedData } = await supabase
        .from('auth_rate_limits')
        .select('blocked_until')
        .eq('identifier', identifier)
        .eq('prefix', prefix)
        .single();

      if (blockedData?.blocked_until && new Date(blockedData.blocked_until) > now) {
        const retryAfter = Math.ceil((new Date(blockedData.blocked_until).getTime() - now.getTime()) / 1000);
        return { limited: true, retryAfter };
      }

      // Get or create rate limit record
      const { data: rateLimitData, error } = await supabase
        .from('auth_rate_limits')
        .upsert({
          identifier,
          prefix,
          request_count: 1,
          first_request_at: now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'identifier,prefix'
        })
        .select()
        .single();

      if (error) {
        logger.error('[RateLimit] Error upserting rate limit:', error);
        return { limited: false }; // Fail open on error
      }

      // If first_request_at is older than window, reset counter
      if (new Date(rateLimitData.first_request_at) < windowStart) {
        await supabase
          .from('auth_rate_limits')
          .update({
            request_count: 1,
            first_request_at: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('identifier', identifier)
          .eq('prefix', prefix);

        return { limited: false };
      }

      // Increment request count
      const { data: updatedData } = await supabase
        .from('auth_rate_limits')
        .update({
          request_count: rateLimitData.request_count + 1,
          updated_at: now.toISOString()
        })
        .eq('identifier', identifier)
        .eq('prefix', prefix)
        .select()
        .single();

      // Check if limit exceeded
      if (updatedData && updatedData.request_count > this.config.maxRequests) {
        const retryAfter = Math.ceil((new Date(rateLimitData.first_request_at).getTime() + this.config.windowMs - now.getTime()) / 1000);
        return { limited: true, retryAfter };
      }

      return { limited: false };
    } catch (error) {
      logger.error('[RateLimit] Error checking rate limit:', error);
      return { limited: false }; // Fail open on error
    }
  }

  async blockIP(ip: string, prefix: string = 'auth'): Promise<void> {
    const now = new Date();
    const blockedUntil = new Date(now.getTime() + this.config.blockDurationMs);

    try {
      await supabase
        .from('auth_rate_limits')
        .upsert({
          identifier: ip,
          prefix,
          blocked_until: blockedUntil.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'identifier,prefix'
        });
    } catch (error) {
      logger.error('[RateLimit] Error blocking IP:', error);
    }
  }

  async isIPBlocked(ip: string, prefix: string = 'auth'): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('auth_rate_limits')
        .select('blocked_until')
        .eq('identifier', ip)
        .eq('prefix', prefix)
        .single();

      return data?.blocked_until && new Date(data.blocked_until) > new Date();
    } catch (error) {
      logger.error('[RateLimit] Error checking IP block status:', error);
      return false; // Fail open on error
    }
  }
}

// Create a middleware function for rate limiting
export async function rateLimitMiddleware(
  request: Request,
  prefix: string = 'auth',
  config?: Partial<RateLimitConfig>
): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimiter = new RateLimiter(config);

  try {
    // First check if the IP is blocked
    const isBlocked = await rateLimiter.isIPBlocked(ip, prefix);
    if (isBlocked) {
      return NextResponse.json(
        { error: 'IP temporariamente bloqueado devido a muitas tentativas.' },
        { status: 403 }
      );
    }

    // Then check rate limiting
    const { limited, retryAfter } = await rateLimiter.isRateLimited(ip, prefix);
    if (limited) {
      // If we hit the rate limit, block the IP
      await rateLimiter.blockIP(ip, prefix);
      
      return NextResponse.json(
        { 
          error: 'Muitas tentativas. Por favor, tente novamente mais tarde.',
          retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter?.toString() || '900',
          }
        }
      );
    }

    return null; // No rate limiting needed
  } catch (error) {
    logger.error('[RateLimit] Middleware error:', error);
    return null; // Don't block the request on error
  }
} 