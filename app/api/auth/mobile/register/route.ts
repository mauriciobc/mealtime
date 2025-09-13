import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/monitoring/logger';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { generateRequestId } from '@/lib/utils/log-sanitizer';

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
  const requestId = generateRequestId();
  
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
      logger.logSafe('warn', '[Mobile Register] Supabase signup failed', { 
        requestId,
        email, 
        error: authError?.message,
        errorCode: authError?.status || 'UNKNOWN'
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

    // Criar household, usuário e householdMember em uma única transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar usuário no Prisma primeiro (profiles table)
      const prismaUser = await tx.profiles.create({
        data: {
          id: authData.user.id, // Usar o auth_id como id do profile
          full_name,
          email,
          updated_at: new Date()
        }
      });

      // Criar household se especificado
      let householdId: string | null = null;
      if (household_name) {
        const household = await tx.households.create({
          data: {
            name: household_name,
            owner_id: prismaUser.id, // Usar o ID do usuário criado como owner
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        householdId = household.id;
      }

      // Adicionar usuário como membro do household se criado
      if (householdId) {
        await tx.household_members.create({
          data: {
            household_id: householdId,
            user_id: prismaUser.id,
            role: 'admin', // Primeiro usuário é admin
            created_at: new Date()
          }
        });
      }

      // Buscar dados completos do usuário com household
      const userWithHousehold = await tx.profiles.findUnique({
        where: { id: prismaUser.id },
        include: {
          household_members: {
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
          }
        }
      });

      return { prismaUser: userWithHousehold, householdId };
    });

    const { prismaUser, householdId } = result;

    // Preparar dados do usuário para resposta
    const userData = {
      id: prismaUser.id,
      auth_id: prismaUser.id, // O ID do profile é o mesmo do auth_id
      full_name: prismaUser.full_name,
      email: prismaUser.email,
      household_id: householdId,
      household: prismaUser.household_members.length > 0 ? {
        id: prismaUser.household_members[0].household.id,
        name: prismaUser.household_members[0].household.name,
        members: prismaUser.household_members[0].household.household_members
          .filter(member => member.user !== null)
          .map(member => ({
            id: member.user!.id,
            name: member.user!.full_name,
            email: member.user!.email,
            role: member.role
          }))
      } : null
    };

    logger.logSafe('info', '[Mobile Register] User created successfully', { 
      requestId,
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
    // Usar logging sanitizado para proteger dados sensíveis
    logger.logRequestError(
      error as Error, 
      request, 
      { 
        requestId,
        operation: 'mobile_register',
        endpoint: '/api/auth/mobile/register'
      }
    );
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}
