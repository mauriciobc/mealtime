import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';

// Explicitly set runtime to Node.js
export const runtime = 'nodejs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Zod schema for route parameters
const RouteParamsSchema = z.object({
  id: z.string().uuid({ message: "ID do domicílio inválido" }),
  userId: z.string().uuid({ message: "ID do usuário inválido" }),
});

// Helper function for authorization
async function authorizeAdmin(userId: string, householdId: string): Promise<{ 
  authorized: boolean; 
  error?: NextResponse 
}> {
  try {
    const prismaUser = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!prismaUser) {
      return { 
        authorized: false, 
        error: NextResponse.json({
          success: false,
          error: 'Usuário não encontrado'
        }, { status: 404 })
      };
    }

    // Check if user is an admin of the household
    const membership = await prisma.household_members.findFirst({
      where: {
        household_id: householdId,
        user_id: prismaUser.id
      },
      select: { role: true }
    });

    if (!membership) {
      return { 
        authorized: false, 
        error: NextResponse.json({
          success: false,
          error: 'Você não pertence a este domicílio'
        }, { status: 403 })
      };
    }

    if (membership.role !== 'admin') {
      return { 
        authorized: false, 
        error: NextResponse.json({
          success: false,
          error: 'Apenas administradores podem remover membros.'
        }, { status: 403 })
      };
    }

    return { authorized: true };
  } catch (error) {
    logger.error('Admin Authorization error:', { error });
    return { 
      authorized: false, 
      error: NextResponse.json({
        success: false,
        error: 'Erro interno do servidor durante autorização'
      }, { status: 500 })
    };
  }
}

const PatchBodySchema = z.object({
  role: z.enum(['admin', 'member', 'Admin', 'Member'], {
    message: 'Papel inválido. Use admin ou member.',
  }),
});

async function getFormattedHousehold(householdId: string) {
  const household = await prisma.households.findUnique({
    where: { id: householdId },
    include: {
      household_members: {
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              avatar_url: true,
            },
          },
        },
      },
      cats: true,
    },
  });

  if (!household) return null;

  return {
    id: household.id,
    name: household.name,
    members: household.household_members.map((m) => ({
      id: m.id,
      userId: m.user_id,
      role: m.role === 'admin' ? 'Admin' : 'Member',
      user: m.user,
    })),
    cats: household.cats,
    createdAt: household.created_at,
  };
}

// PATCH /api/v2/households/[id]/members/[userId] - Update member role
export const PATCH = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string; userId: string }> }
) => {
  if (!context?.params) {
    return NextResponse.json({ success: false, error: 'Missing route parameters' }, { status: 500 });
  }

  try {
    const params = await context.params;
    const paramsValidation = RouteParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json({ success: false, error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const { id: householdId, userId: targetUserId } = paramsValidation.data;
    const authResult = await authorizeAdmin(user.id, householdId);
    if (!authResult.authorized) {
      return authResult.error!;
    }

    const body = await request.json();
    const bodyValidation = PatchBodySchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json({ success: false, error: 'Corpo inválido' }, { status: 400 });
    }

    const newRole = bodyValidation.data.role.toLowerCase() as 'admin' | 'member';

    const memberToUpdate = await prisma.household_members.findUnique({
      where: {
        household_id_user_id: { household_id: householdId, user_id: targetUserId },
      },
      select: { role: true, id: true },
    });

    if (!memberToUpdate) {
      return NextResponse.json({ success: false, error: 'Membro não encontrado' }, { status: 404 });
    }

    if (memberToUpdate.role === 'admin' && newRole !== 'admin') {
      const adminCount = await prisma.household_members.count({
        where: { household_id: householdId, role: 'admin' },
      });
      if (adminCount <= 1) {
        return NextResponse.json({
          success: false,
          error: 'Não é possível rebaixar o último administrador',
        }, { status: 400 });
      }
    }

    await prisma.household_members.update({
      where: { id: memberToUpdate.id },
      data: { role: newRole },
    });

    const updatedHousehold = await getFormattedHousehold(householdId);
    return NextResponse.json({ success: true, data: updatedHousehold });
  } catch (error) {
    logger.error('[PATCH /api/v2/households/[id]/members/[userId]] Error', { error });
    return NextResponse.json({ success: false, error: 'Erro ao atualizar membro' }, { status: 500 });
  }
});

// DELETE /api/v2/households/[id]/members/[userId] - Remove a member from household
export const DELETE = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string; userId: string }> }
) => {
  const requestId = request.headers.get("x-request-id") || "unknown";

  // Fail fast if framework doesn't provide route parameters
  if (!context?.params) {
    logger.error("[DELETE /api/v2/households/[id]/members/[userId]] Missing context.params from framework", {
      requestId,
      userId: user.id,
      url: request.url
    });
    return NextResponse.json({
      success: false,
      error: "Internal routing error: missing route parameters"
    }, { status: 500 });
  }

  try {
    const params = await context.params;
    
    // Validate route parameters
    const paramsValidation = RouteParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros inválidos',
        details: paramsValidation.error.issues
      }, { status: 400 });
    }
    const { id: householdId, userId: userIdToRemove } = paramsValidation.data;
    const isSelfLeave =
      userIdToRemove === user.id &&
      request.nextUrl.searchParams.get('leave') === 'true';

    logger.info("[DELETE /api/v2/households/[id]/members/[userId]] Starting request", {
      requestId,
      userId: user.id,
      householdId,
      userIdToRemove,
      isSelfLeave,
    });

    if (isSelfLeave) {
      const membership = await prisma.household_members.findUnique({
        where: {
          household_id_user_id: { household_id: householdId, user_id: user.id },
        },
        select: { role: true, id: true },
      });

      if (!membership) {
        return NextResponse.json({ success: false, error: 'Membro não encontrado' }, { status: 404 });
      }

      if (membership.role === 'admin') {
        const adminCount = await prisma.household_members.count({
          where: { household_id: householdId, role: 'admin' },
        });
        if (adminCount <= 1) {
          return NextResponse.json({
            success: false,
            error: 'Não é possível sair sendo o último administrador. Transfira a administração ou exclua a residência.',
          }, { status: 400 });
        }
      }

      await prisma.household_members.delete({ where: { id: membership.id } });

      return NextResponse.json({ success: true, message: 'Você saiu da residência' });
    }

    // Prevent self-removal via admin remove (use leave household flow)
    if (userIdToRemove === user.id) {
      return NextResponse.json({
        success: false,
        error: 'Use sair da residência nas configurações para remover a si mesmo.'
      }, { status: 400 });
    }

    // Authorize: Only admins can remove members
    const authResult = await authorizeAdmin(user.id, householdId);
    if (!authResult.authorized) {
      return authResult.error!;
    }

    // Check if the user trying to be removed exists in this household
    const membershipToRemove = await prisma.household_members.findUnique({
      where: {
        household_id_user_id: {
          household_id: householdId,
          user_id: userIdToRemove
        }
      },
      select: {
        role: true,
        user_id: true
      }
    });

    if (!membershipToRemove) {
      return NextResponse.json({
        success: false,
        error: 'Membro não encontrado neste domicílio'
      }, { status: 404 });
    }

    // Atomically check admin count and delete member in a transaction to prevent race conditions
    await prisma.$transaction(async (tx) => {
      // If removing an admin, check that it's not the last one
      if (membershipToRemove.role === 'admin') {
        const adminCount = await tx.household_members.count({
          where: {
            household_id: householdId,
            role: 'admin'
          }
        });

        if (adminCount <= 1) {
          // Throw sentinel error instead of deleting
          throw new Error('LAST_ADMIN');
        }
      }

      // Remove the member (only executes if admin check passed)
      await tx.household_members.delete({
        where: {
          household_id_user_id: {
            household_id: householdId,
            user_id: userIdToRemove
          }
        }
      });
    });

    logger.info("[DELETE /api/v2/households/[id]/members/[userId]] Successfully removed member", {
      requestId,
      userIdToRemove
    });

    return NextResponse.json({
      success: true,
      message: 'Membro removido com sucesso'
    }, { status: 200 });

  } catch (error) {
    // Handle sentinel error for last admin removal attempt
    if (error instanceof Error && error.message === 'LAST_ADMIN') {
      logger.warn('[DELETE /api/v2/households/[id]/members/[userId]] Attempted to remove last admin', {
        requestId,
        householdId: context?.params ? (await context.params).id : 'unknown'
      });
      return NextResponse.json({
        success: false,
        error: 'Não é possível remover o último administrador do domicílio'
      }, { status: 400 });
    }

    logger.error('[DELETE /api/v2/households/[id]/members/[userId]] Error removing member:', {
      requestId,
      error
    });
    
    // Handle specific Prisma errors
    if ((error as any).code === 'P2025') {
      return NextResponse.json({
        success: false,
        error: 'Membro não encontrado'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao remover o membro'
    }, { status: 500 });
  }
});

