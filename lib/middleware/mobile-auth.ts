import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';

export interface MobileAuthUser {
  id: string;
  auth_id: string;
  full_name: string;
  email: string;
  household_id: string | null;
}

/**
 * Middleware para autenticação de aplicativos mobile
 * Valida JWT tokens enviados no header Authorization
 */
export async function validateMobileAuth(request: NextRequest): Promise<{
  success: boolean;
  user?: MobileAuthUser;
  error?: string;
  statusCode?: number;
}> {
  try {
    // Extrair token do header Authorization
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return {
        success: false,
        error: 'Token de autorização não fornecido',
        statusCode: 401
      };
    }

    // Parse robusto do token Bearer usando regex case-insensitive
    const bearerMatch = authHeader.trim().match(/^Bearer\s+(.+)$/i);
    
    if (!bearerMatch) {
      return {
        success: false,
        error: 'Token de autorização não fornecido',
        statusCode: 401
      };
    }

    const token = bearerMatch[1]?.trim();
    
    if (!token) {
      return {
        success: false,
        error: 'Token de autorização não fornecido',
        statusCode: 401
      };
    }

    // Criar cliente Supabase para validar o token
    const supabase = await createClient();
    
    // Verificar se o token é válido
    const { data: { user: supabaseUser }, error: tokenError } = await supabase.auth.getUser(token);

    if (tokenError || !supabaseUser) {
      logger.warn('[Mobile Auth Middleware] Invalid token', { 
        error: tokenError?.message 
      });
      
      return {
        success: false,
        error: 'Token inválido ou expirado',
        statusCode: 401
      };
    }

    // Buscar dados do usuário no Prisma
    const prismaUser = await prisma.profiles.findUnique({
      where: { id: supabaseUser.id },
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
      logger.error('[Mobile Auth Middleware] Prisma user not found', { 
        authId: supabaseUser.id 
      });
      
      return {
        success: false,
        error: 'Usuário não encontrado',
        statusCode: 404
      };
    }

    // Buscar o household_id do primeiro household_member (assumindo que o usuário pertence a apenas um household)
    const householdId = prismaUser.household_members.length > 0 
      ? prismaUser.household_members[0]?.household_id || null
      : null;

    const mobileUser: MobileAuthUser = {
      id: prismaUser.id,
      auth_id: supabaseUser.id,
      full_name: prismaUser.full_name || '',
      email: prismaUser.email || '',
      household_id: householdId
    };

    logger.debug('[Mobile Auth Middleware] User authenticated', { 
      userId: mobileUser.id,
      email: mobileUser.email 
    });

    return {
      success: true,
      user: mobileUser
    };

  } catch (error: unknown) {
    // Normalizar erro desconhecido para logging seguro
    const normalizedError = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : { message: String(error), stack: undefined, rawValue: error };
    
    logger.error('[Mobile Auth Middleware] Unexpected error', normalizedError);
    
    return {
      success: false,
      error: 'Erro interno do servidor',
      statusCode: 500
    };
  }
}

/**
 * Wrapper para endpoints que requerem autenticação mobile
 */
export function withMobileAuth(handler: (request: NextRequest, user: MobileAuthUser) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = await validateMobileAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: authResult.error 
        },
        { status: authResult.statusCode || 401 }
      );
    }

    return handler(request, authResult.user!);
  };
}

/**
 * Middleware para verificar se o usuário pertence ao household especificado
 */
export async function validateHouseholdAccess(
  request: NextRequest, 
  user: MobileAuthUser, 
  householdId: string
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    if (user.household_id === null || user.household_id === undefined || user.household_id !== householdId) {
      return {
        success: false,
        error: 'Acesso negado ao household',
        statusCode: 403
      };
    }

    return { success: true };
  } catch (error: unknown) {
    // Normalizar erro desconhecido para logging seguro
    const normalizedError = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : { message: String(error), stack: undefined, rawValue: error };
    
    logger.error('[Mobile Auth] Household validation error', { 
      ...normalizedError,
      userId: user.id,
      householdId 
    });
    
    return {
      success: false,
      error: 'Erro ao validar acesso ao household',
      statusCode: 500
    };
  }
}
