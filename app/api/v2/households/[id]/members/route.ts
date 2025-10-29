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
});

// Zod schema for POST request body
const PostBodySchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(['admin', 'member'], { 
    message: 'Papel inválido. Deve ser "admin" ou "member"' 
  }),
}).strict();

// Helper function for authorization & role check
async function authorizeAdmin(userId: string, householdId: string): Promise<{ 
  authorized: boolean; 
  error?: NextResponse 
}> {
  try {
    // Find user profile
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

    // Check if user is a member of the household
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
          error: 'Apenas administradores podem gerenciar membros.'
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

// Helper function for basic household membership authorization
async function authorizeMember(userId: string, householdId: string): Promise<{ 
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

    // Check if user is a member of the household
    const membership = await prisma.household_members.findFirst({
      where: {
        household_id: householdId,
        user_id: prismaUser.id
      }
    });

    if (!membership) {
      return { 
        authorized: false, 
        error: NextResponse.json({
          success: false,
          error: 'Você não tem permissão para acessar este domicílio'
        }, { status: 403 })
      };
    }

    return { authorized: true };
  } catch (error) {
    logger.error('Member Authorization error:', { error });
    return { 
      authorized: false, 
      error: NextResponse.json({
        success: false,
        error: 'Erro interno do servidor durante autorização'
      }, { status: 500 })
    };
  }
}

// GET /api/v2/households/[id]/members - List household members
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  const requestId = request.headers.get("x-request-id") || "unknown";

  // Fail fast if framework doesn't provide route parameters
  if (!context?.params) {
    logger.error("[GET /api/v2/households/[id]/members] Missing context.params from framework", {
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
        error: 'ID do domicílio inválido',
        details: paramsValidation.error.issues
      }, { status: 400 });
    }
    const householdId = paramsValidation.data.id;

    logger.info("[GET /api/v2/households/[id]/members] Starting request", {
      requestId,
      userId: user.id,
      householdId
    });

    // Authorize: Any member of the household can view the member list
    const authResult = await authorizeMember(user.id, householdId);
    if (!authResult.authorized) {
      return authResult.error!;
    }

    // Fetch members of the authorized household
    const membersData = await prisma.household_members.findMany({
      where: { household_id: householdId },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    // Format response
    const members = membersData.map((member) => ({
      id: member.user.id,
      name: member.user.full_name || 'Sem nome',
      email: member.user.email,
      role: member.role,
      isCurrentUser: member.user.id === user.id
    }));

    logger.info("[GET /api/v2/households/[id]/members] Successfully fetched members", {
      requestId,
      count: members.length
    });

    return NextResponse.json({
      success: true,
      data: members,
      count: members.length
    });

  } catch (error) {
    logger.error('[GET /api/v2/households/[id]/members] Error fetching members:', {
      requestId,
      error
    });
    
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao buscar os membros'
    }, { status: 500 });
  }
});

// POST /api/v2/households/[id]/members - Add member to household (by email)
export const POST = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  const requestId = request.headers.get("x-request-id") || "unknown";

  // Fail fast if framework doesn't provide route parameters
  if (!context?.params) {
    logger.error("[POST /api/v2/households/[id]/members] Missing context.params from framework", {
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
        error: 'ID do domicílio inválido',
        details: paramsValidation.error.issues
      }, { status: 400 });
    }
    const householdId = paramsValidation.data.id;

    logger.info("[POST /api/v2/households/[id]/members] Starting request", {
      requestId,
      userId: user.id,
      householdId
    });

    // Authorize: Only admins can add members
    const authResult = await authorizeAdmin(user.id, householdId);
    if (!authResult.authorized) {
      return authResult.error!;
    }

    const body = await request.json();
    const bodyValidation = PostBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: bodyValidation.error.issues
      }, { status: 400 });
    }

    const { email: emailToAdd, role: roleToAdd } = bodyValidation.data;

    // Find the user to add by email
    const userToAdd = await prisma.profiles.findFirst({
      where: { email: emailToAdd },
      select: { id: true }
    });

    if (!userToAdd) {
      return NextResponse.json({
        success: false,
        error: 'Usuário com este email não encontrado.'
      }, { status: 404 });
    }

    // Use transaction to prevent race conditions
    // All validation checks and creation happen atomically
    const newMembership = await prisma.$transaction(async (tx) => {
      // Check if the user is already in THIS household
      const existingMembership = await tx.household_members.findUnique({
        where: {
          household_id_user_id: {
            household_id: householdId,
            user_id: userToAdd.id
          }
        }
      });

      if (existingMembership) {
        throw new Error('ALREADY_IN_HOUSEHOLD');
      }

      // Check if the user is already in ANOTHER household
      const otherMembership = await tx.household_members.findFirst({
        where: {
          user_id: userToAdd.id,
          household_id: { not: householdId }
        }
      });

      if (otherMembership) {
        throw new Error('ALREADY_IN_OTHER_HOUSEHOLD');
      }

      // Add user to the household by creating a membership record
      return await tx.household_members.create({
        data: {
          household_id: householdId,
          user_id: userToAdd.id,
          role: roleToAdd.toLowerCase() as 'admin' | 'member'
        },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
            }
          }
        }
      });
    });

    // Format response
    const member = {
      id: newMembership.user.id,
      name: newMembership.user.full_name || 'Sem nome',
      email: newMembership.user.email,
      role: newMembership.role
    };

    logger.info("[POST /api/v2/households/[id]/members] Successfully added member", {
      requestId,
      memberId: member.id
    });

    return NextResponse.json({
      success: true,
      data: member
    }, { status: 201 });

  } catch (error) {
    // Handle custom transaction errors
    if ((error as Error).message === 'ALREADY_IN_HOUSEHOLD') {
      return NextResponse.json({
        success: false,
        error: 'Este usuário já pertence a este domicílio.'
      }, { status: 400 });
    }
    
    if ((error as Error).message === 'ALREADY_IN_OTHER_HOUSEHOLD') {
      return NextResponse.json({
        success: false,
        error: 'Este usuário já pertence a outro domicílio.'
      }, { status: 400 });
    }
    
    logger.error('[POST /api/v2/households/[id]/members] Error adding member:', {
      requestId,
      error
    });
    
    // Handle specific Prisma errors
    if ((error as any).code === 'P2002') {
      return NextResponse.json({
        success: false,
        error: 'Erro de conflito ao adicionar membro.'
      }, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao adicionar o membro'
    }, { status: 500 });
  }
});

