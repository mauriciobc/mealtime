import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';

export interface MobileAuthUser {
  id: number;
  auth_id: string;
  full_name: string;
  email: string;
  household_id: number | null;
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
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Token de autorização não fornecido',
        statusCode: 401
      };
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

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
    const prismaUser = await prisma.user.findUnique({
      where: { auth_id: supabaseUser.id },
      select: {
        id: true,
        auth_id: true,
        full_name: true,
        email: true,
        householdId: true
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

    const mobileUser: MobileAuthUser = {
      id: prismaUser.id,
      auth_id: prismaUser.auth_id,
      full_name: prismaUser.full_name,
      email: prismaUser.email,
      household_id: prismaUser.householdId
    };

    logger.debug('[Mobile Auth Middleware] User authenticated', { 
      userId: mobileUser.id,
      email: mobileUser.email 
    });

    return {
      success: true,
      user: mobileUser
    };

  } catch (error) {
    logger.error('[Mobile Auth Middleware] Unexpected error', { 
      error: error.message,
      stack: error.stack 
    });
    
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
  householdId: number
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    if (!user.household_id || user.household_id !== householdId) {
      return {
        success: false,
        error: 'Acesso negado ao household',
        statusCode: 403
      };
    }

    return { success: true };
  } catch (error) {
    logger.error('[Mobile Auth] Household validation error', { 
      error: error.message,
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
