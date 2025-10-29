import { NextRequest, NextResponse } from 'next/server';
import { validateMobileAuth, MobileAuthUser } from './mobile-auth';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';

/**
 * Middleware híbrido que suporta tanto JWT (mobile) quanto Supabase Session (web)
 * 
 * Ordem de tentativa:
 * 1. JWT via Authorization header (para apps mobile)
 * 2. Supabase Session via cookies (para app web)
 */
export async function validateHybridAuth(request: NextRequest): Promise<{
  success: boolean;
  user?: MobileAuthUser;
  error?: string;
  statusCode?: number;
}> {
  try {
    // 1. Tentar JWT primeiro (Authorization header)
    const authHeader = request.headers.get('authorization');
    
    if (authHeader) {
      logger.debug('[Hybrid Auth] Attempting JWT authentication');
      const jwtResult = await validateMobileAuth(request);
      
      if (jwtResult.success) {
        logger.info('[Hybrid Auth] JWT authentication successful', {
          userId: jwtResult.user?.id,
          method: 'JWT'
        });
        return jwtResult;
      }
      
      // Se o header estava presente mas falhou, retornar erro
      logger.warn('[Hybrid Auth] JWT authentication failed', {
        error: jwtResult.error
      });
      return jwtResult;
    }
    
    // 2. Fallback para Supabase Session (web)
    logger.debug('[Hybrid Auth] Attempting Supabase Session authentication');
    const supabase = await createClient();
    const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !sessionUser) {
      logger.warn('[Hybrid Auth] Supabase Session authentication failed', {
        error: sessionError?.message
      });
      
      return {
        success: false,
        error: 'Token de autorização não fornecido ou sessão inválida',
        statusCode: 401
      };
    }
    
    // Buscar dados do usuário no Prisma
    const prismaUser = await prisma.profiles.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        full_name: true,
        email: true,
        household_members: {
          select: {
            household_id: true
          }
        }
      }
    });
    
    if (!prismaUser) {
      logger.error('[Hybrid Auth] Prisma user not found for session', {
        authId: sessionUser.id
      });
      
      return {
        success: false,
        error: 'Usuário não encontrado',
        statusCode: 404
      };
    }
    
    // Buscar o household_id do primeiro household_member
    const householdId = prismaUser.household_members.length > 0
      ? prismaUser.household_members[0]?.household_id || null
      : null;
    
    const user: MobileAuthUser = {
      id: prismaUser.id,
      auth_id: sessionUser.id,
      full_name: prismaUser.full_name || '',
      email: prismaUser.email || '',
      household_id: householdId
    };
    
    logger.info('[Hybrid Auth] Supabase Session authentication successful', {
      userId: user.id,
      method: 'Session'
    });
    
    return {
      success: true,
      user
    };
    
  } catch (error: unknown) {
    const normalizedError = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error), stack: undefined, rawValue: error };
    
    logger.error('[Hybrid Auth] Unexpected error', normalizedError);
    
    return {
      success: false,
      error: 'Erro interno do servidor',
      statusCode: 500
    };
  }
}

/**
 * Wrapper para endpoints que requerem autenticação híbrida (JWT ou Session)
 * Suporta context com params dinâmicos do Next.js 16
 */
export function withHybridAuth<P = any>(
  handler: (request: NextRequest, user: MobileAuthUser, context?: { params: Promise<P> }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params: Promise<P> }) => {
    const authResult = await validateHybridAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error
        },
        { status: authResult.statusCode || 401 }
      );
    }
    
    return handler(request, authResult.user!, context);
  };
}

