import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';

// Configuração de runtime para Netlify/Vercel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/mobile - Autenticação para aplicativos mobile
 * 
 * Este endpoint permite que aplicativos Android/iOS se autentiquem
 * e recebam um token JWT para usar nas requisições subsequentes.
 * 
 * Body esperado:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * Resposta de sucesso:
 * {
 *   "success": true,
 *   "user": { ... },
 *   "access_token": "jwt_token_here",
 *   "refresh_token": "refresh_token_here",
 *   "expires_in": 3600
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email e senha são obrigatórios' 
        },
        { status: 400 }
      );
    }

    // Criar cliente Supabase para autenticação
    const supabase = await createClient();
    
    // Tentar fazer login com email e senha
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      logger.warn('[Mobile Auth] Login failed', { 
        email, 
        error: authError?.message 
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Credenciais inválidas' 
        },
        { status: 401 }
      );
    }

    // Buscar dados do usuário no Prisma
    const prismaUser = await prisma.profiles.findUnique({
      where: { id: authData.user.id },
      include: {
        household_members: {
          include: {
            household: {
              include: {
                household_members: {
                  select: {
                    role: true,
                    user: {
                      select: {
                        id: true,
                        full_name: true,
                        email: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!prismaUser) {
      logger.error('[Mobile Auth] Prisma user not found', { 
        authId: authData.user.id 
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuário não encontrado no sistema' 
        },
        { status: 404 }
      );
    }

    // Preparar dados do usuário para resposta
    const firstHousehold = prismaUser.household_members?.[0]?.household;
    
    const userData = {
      id: prismaUser.id,
      auth_id: prismaUser.id, // O ID do profiles é o mesmo do auth
      full_name: prismaUser.full_name,
      email: prismaUser.email,
      household_id: firstHousehold?.id || null,
      household: firstHousehold ? {
        id: firstHousehold.id,
        name: firstHousehold.name,
        members: firstHousehold.household_members
          .filter(member => member.user !== null) // Filtrar membros com user nulo
          .map(member => ({
            id: member.user!.id,
            name: member.user!.full_name,
            email: member.user!.email,
            role: member.role
          }))
      } : null
    };

    // Validar se a sessão e os tokens existem
    if (!authData.session || !authData.session.access_token || !authData.session.refresh_token) {
      logger.error('[Mobile Auth] Session or tokens missing', { 
        userId: prismaUser.id,
        email: prismaUser.email,
        hasSession: !!authData.session,
        hasAccessToken: !!authData.session?.access_token,
        hasRefreshToken: !!authData.session?.refresh_token
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Falha na autenticação: tokens não foram gerados corretamente' 
        },
        { status: 401 }
      );
    }

    logger.info('[Mobile Auth] Login successful', { 
      userId: prismaUser.id,
      email: prismaUser.email 
    });

    // Retornar dados de autenticação
    return NextResponse.json({
      success: true,
      user: userData,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_in: authData.session.expires_in || 3600,
      token_type: 'Bearer'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('[Mobile Auth] Unexpected error', { 
      error: errorMessage,
      stack: errorStack 
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/mobile/refresh - Renovar token de acesso
 * 
 * Body esperado:
 * {
 *   "refresh_token": "refresh_token_here"
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Refresh token é obrigatório' 
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (refreshError || !refreshData.session) {
      logger.warn('[Mobile Auth] Token refresh failed', { 
        error: refreshError?.message 
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token de renovação inválido' 
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      access_token: refreshData.session.access_token,
      refresh_token: refreshData.session.refresh_token,
      expires_in: refreshData.session.expires_in,
      token_type: 'Bearer'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('[Mobile Auth] Refresh token error', { 
      error: errorMessage 
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}
