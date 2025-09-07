import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para registro
const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  household_name: z.string().min(2, 'Nome do domicílio deve ter pelo menos 2 caracteres').optional()
});

export type MobileRegisterRequest = z.infer<typeof registerSchema>;

/**
 * POST /api/auth/mobile/register - Registro de usuário para mobile
 * 
 * Body esperado:
 * {
 *   "email": "user@example.com",
 *   "password": "password123",
 *   "full_name": "João Silva",
 *   "household_name": "Casa da Família" // opcional
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
    const body = await request.json();
    
    // Validar dados de entrada
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { email, password, full_name, household_name } = validationResult.data;

    // Criar cliente Supabase
    const supabase = await createClient();

    // Verificar se o usuário já existe
    const { data: existingUser } = await supabase.auth.getUser();
    
    // Tentar criar usuário no Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name
        }
      }
    });

    if (authError || !authData.user) {
      logger.warn('[Mobile Register] Supabase signup failed', { 
        email, 
        error: authError?.message 
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao criar usuário: ' + (authError?.message || 'Erro desconhecido')
        },
        { status: 400 }
      );
    }

    // Aguardar confirmação do email se necessário
    if (!authData.session) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Verifique seu email para confirmar a conta',
          requires_email_confirmation: true
        },
        { status: 200 }
      );
    }

    // Criar household se especificado
    let householdId: number | null = null;
    if (household_name) {
      const household = await prisma.household.create({
        data: {
          name: household_name,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      householdId = household.id;
    }

    // Criar usuário no Prisma
    const prismaUser = await prisma.user.create({
      data: {
        auth_id: authData.user.id,
        full_name,
        email,
        householdId,
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        household: {
          include: {
            household_members: {
              include: {
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
    });

    // Adicionar usuário como membro do household se criado
    if (householdId) {
      await prisma.householdMember.create({
        data: {
          household_id: householdId,
          user_id: prismaUser.id,
          role: 'admin', // Primeiro usuário é admin
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }

    // Preparar dados do usuário para resposta
    const userData = {
      id: prismaUser.id,
      auth_id: prismaUser.auth_id,
      full_name: prismaUser.full_name,
      email: prismaUser.email,
      household_id: prismaUser.householdId,
      household: prismaUser.household ? {
        id: prismaUser.household.id,
        name: prismaUser.household.name,
        members: prismaUser.household.household_members.map(member => ({
          id: member.user.id,
          name: member.user.full_name,
          email: member.user.email,
          role: member.role
        }))
      } : null
    };

    logger.info('[Mobile Register] User created successfully', { 
      userId: prismaUser.id,
      email: prismaUser.email,
      householdId 
    });

    // Retornar dados de autenticação
    return NextResponse.json({
      success: true,
      user: userData,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_in: authData.session.expires_in,
      token_type: 'Bearer'
    });

  } catch (error) {
    logger.error('[Mobile Register] Unexpected error', { 
      error: error.message,
      stack: error.stack 
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
