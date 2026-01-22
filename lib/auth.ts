import { NextRequest, NextResponse } from 'next/server';
import { validateMobileAuth } from './middleware/mobile-auth';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';
import { ApiResponse } from '@/lib/responses/api-responses';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  householdId?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  statusCode?: number;
}

/**
 * Extrai o ID do usuário autenticado da requisição
 * Suporta tanto JWT (mobile) quanto Supabase Session (web)
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  try {
    // 1. Tentar JWT primeiro (Authorization header) - para mobile apps
    const authHeader = request.headers.get('authorization');
    
    if (authHeader) {
      logger.debug('[Auth] Attempting JWT authentication');
      const jwtResult = await validateMobileAuth(request);
      
      if (jwtResult.success && jwtResult.user) {
        logger.info('[Auth] JWT authentication successful', { userId: jwtResult.user.id });
        return {
          success: true,
          user: {
            id: jwtResult.user.id,
            email: jwtResult.user.email || undefined,
            householdId: jwtResult.user.household_id || undefined
          }
        };
      }
      
      // JWT falhou, mas header estava presente - retornar erro
      logger.warn('[Auth] JWT authentication failed', { error: jwtResult.error });
      return {
        success: false,
        error: jwtResult.error || 'Invalid token',
        statusCode: 401
      };
    }
    
    // 2. Fallback para Supabase Session (web)
    logger.debug('[Auth] Attempting Supabase Session authentication');
    const supabase = await createClient();
    const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !sessionUser) {
      logger.warn('[Auth] Supabase Session authentication failed', {
        error: sessionError?.message
      });
      
      return {
        success: false,
        error: 'Unauthorized - Invalid or expired session',
        statusCode: 401
      };
    }
    
    // Buscar dados do usuário no Prisma
    const prismaUser = await prisma.profiles.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        household_members: {
          select: {
            household_id: true
          }
        }
      }
    });
    
    if (!prismaUser) {
      logger.error('[Auth] User not found in database', { authId: sessionUser.id });
      
      return {
        success: false,
        error: 'User not found',
        statusCode: 404
      };
    }
    
    const householdId = prismaUser.household_members.length > 0
      ? prismaUser.household_members[0]?.household_id || undefined
      : undefined;
    
    logger.info('[Auth] Session authentication successful', { userId: prismaUser.id });
    
    return {
      success: true,
      user: {
        id: prismaUser.id,
        email: prismaUser.email || undefined,
        householdId
      }
    };
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Auth] Unexpected error', { error: message });
    
    return {
      success: false,
      error: 'Internal server error',
      statusCode: 500
    };
  }
}

/**
 * Wrapper para API routes que requerem autenticação
 * Retorna erro 401 automaticamente se não autenticado
 */
export function withAuth<
  P extends Record<string, unknown> = Record<string, unknown>
>(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
    context?: { params: Promise<P> }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params: Promise<P> }): Promise<NextResponse> => {
    const authResult = await getAuthenticatedUser(request);
    
    if (!authResult.success) {
      return ApiResponse.error(
        authResult.error || 'Unauthorized',
        authResult.statusCode || 401,
        'AUTH_ERROR',
        undefined,
        request
      );
    }
    
    return handler(request, authResult.user!, context);
  };
}

/**
 * Middleware function to require authentication in API routes
 * Use this inside your route handlers
 */
export async function requireAuth(request: NextRequest): Promise<{
  user: AuthenticatedUser;
  error: null;
} | {
  user: null;
  error: { message: string; status: number };
}> {
  const result = await getAuthenticatedUser(request);
  
  if (!result.success) {
    return {
      user: null,
      error: {
        message: result.error || 'Unauthorized',
        status: result.statusCode || 401
      }
    };
  }
  
  return {
    user: result.user!,
    error: null
  };
}
