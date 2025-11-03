import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { z } from 'zod';

// Schema de validação para entrada em domicílio
const joinHouseholdSchema = z.object({
  inviteCode: z.string().min(1, "Código de convite é obrigatório"),
}).strict();

// POST /api/v2/households/join - Entrar em um domicílio usando um código de convite
export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  logger.debug('[POST /api/v2/households/join] Authenticated user:', { userId: user.id });

  try {
    const body = await request.json();
    const validationResult = joinHouseholdSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[POST /api/v2/households/join] Invalid request body:', {
        errors: validationResult.error.format()
      });
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const { inviteCode } = validationResult.data;

    // Buscar o domicílio pelo código de convite
    const household = await prisma.households.findUnique({
      where: { inviteCode: inviteCode },
      include: {
        household_members: {
          select: {
            user: {
              select: {
                id: true,
                full_name: true,
                email: true,
                username: true,
                avatar_url: true
              }
            },
            role: true
          }
        },
        cats: {
          select: {
            id: true,
            name: true,
            photo_url: true
          }
        }
      }
    });

    if (!household) {
      logger.warn('[POST /api/v2/households/join] Invalid invite code:', { inviteCode });
      return NextResponse.json({
        success: false,
        error: 'Código de convite inválido'
      }, { status: 404 });
    }

    // Fetch the corresponding Prisma user
    const prismaUser = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        household_members: {
          select: {
            household_id: true
          }
        }
      }
    });

    if (!prismaUser) {
      logger.error('[POST /api/v2/households/join] Prisma user not found:', { userId: user.id });
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado no banco de dados local'
      }, { status: 404 });
    }

    // Check if user is already associated with this household
    const userHouseholdIds = prismaUser.household_members.map(m => m.household_id);
    if (userHouseholdIds.includes(household.id)) {
      logger.warn('[POST /api/v2/households/join] User already member of household:', {
        userId: user.id,
        householdId: household.id
      });
      return NextResponse.json({
        success: false,
        error: 'Você já pertence a este domicílio'
      }, { status: 400 });
    }

    // Check if user is already associated with *another* household
    if (userHouseholdIds.length > 0) {
      logger.warn('[POST /api/v2/households/join] User already belongs to another household:', {
        userId: user.id,
        currentHouseholdIds: userHouseholdIds
      });
      return NextResponse.json({
        success: false,
        error: 'Você já pertence a outro domicílio. Saia do domicílio atual antes de entrar em um novo.'
      }, { status: 400 });
    }

    // Adicionar usuário ao domicílio como membro
    await prisma.household_members.create({
      data: {
        user_id: prismaUser.id,
        household_id: household.id,
        role: 'member' // Novos usuários sempre entram como membros
      }
    });

    logger.debug('[POST /api/v2/households/join] User added to household:', {
      userId: user.id,
      householdId: household.id
    });

    // Buscar o domicílio atualizado com todos os membros para a resposta
    const updatedHousehold = await prisma.households.findUnique({
      where: { id: household.id },
      include: {
        household_members: {
          select: {
            user: {
              select: {
                id: true,
                full_name: true,
                email: true,
                username: true,
                avatar_url: true
              }
            },
            role: true
          }
        },
        cats: {
          select: {
            id: true,
            name: true,
            photo_url: true
          }
        }
      }
    });

    if (!updatedHousehold) {
      logger.error('[POST /api/v2/households/join] Error fetching updated household:', {
        householdId: household.id
      });
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar domicílio atualizado após entrada'
      }, { status: 500 });
    }

    // Notification logic: Notify all other members
    try {
      const members = updatedHousehold.household_members.map(m => ({ ...m.user, role: m.role }));
      const joiningUser = members.find(u => u.id === prismaUser.id);
      const otherMembers = members.filter(u => u.id !== prismaUser.id);
      
      const notifications = otherMembers.map(member => ({
        id: crypto.randomUUID(),
        user_id: member.id,
        title: 'Novo membro na residência',
        message: `${joiningUser?.full_name || 'Um usuário'} entrou na residência ${updatedHousehold.name}`,
        type: 'household',
        metadata: {
          householdId: updatedHousehold.id,
          actionUrl: `/households/${updatedHousehold.id}`
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      
      if (notifications.length > 0) {
        await prisma.notifications.createMany({ data: notifications });
        logger.debug('[POST /api/v2/households/join] Notifications created:', {
          count: notifications.length
        });
      }
    } catch (notifyError) {
      logger.error('[POST /api/v2/households/join] Failed to create notifications:', {
        error: notifyError
      });
    }

    // Formatar a resposta
    const formattedHousehold = {
      id: updatedHousehold.id,
      name: updatedHousehold.name,
      inviteCode: updatedHousehold.inviteCode,
      members: updatedHousehold.household_members.map(m => ({
        id: m.user.id,
        full_name: m.user.full_name,
        email: m.user.email,
        username: m.user.username,
        avatar_url: m.user.avatar_url,
        role: m.role
      })),
      cats: updatedHousehold.cats,
      created_at: updatedHousehold.created_at
    };

    logger.info('[POST /api/v2/households/join] User successfully joined household:', {
      userId: user.id,
      householdId: updatedHousehold.id
    });

    return NextResponse.json({
      success: true,
      data: formattedHousehold
    }, { status: 201 });
  } catch (error: any) {
    // Handle Prisma errors
    if (error.code === 'P2002') {
      logger.warn('[POST /api/v2/households/join] Conflict error:', { error });
      return NextResponse.json({
        success: false,
        error: 'Erro de conflito ao processar a solicitação'
      }, { status: 409 });
    }

    logger.logError(error, {
      message: 'Erro ao entrar no domicílio',
      requestUrl: request.nextUrl.toString()
    });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao entrar no domicílio'
    }, { status: 500 });
  }
});

