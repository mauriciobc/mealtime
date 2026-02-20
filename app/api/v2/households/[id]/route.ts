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
  id: z.string().uuid({ message: "ID do domicílio inválido (UUID esperado)" }),
});

// Zod schema for PATCH request body
const PatchBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
}).strict();

// --- Authorization Helpers ---

// Authorizes if the user is a member of the household
async function authorizeMember(userId: string, householdId: string): Promise<{ authorized: boolean; error?: NextResponse }> {
  try {
    const prismaUser = await prisma.profiles.findUnique({ 
      where: { id: userId }, 
      select: { 
        id: true, 
        household_members: {
          where: { household_id: householdId },
          select: { household_id: true }
        }
      } 
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
    const isMember = prismaUser.household_members.length > 0;
    if (!isMember) {
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
    logger.error('Member Auth Error:', { error });
    return { 
      authorized: false, 
      error: NextResponse.json({
        success: false,
        error: 'Erro interno do servidor'
      }, { status: 500 })
    };
  }
}

// Authorizes if the user is an admin of the household
async function authorizeAdmin(userId: string, householdId: string): Promise<{ authorized: boolean; error?: NextResponse }> {
  try {
    const prismaUser = await prisma.profiles.findUnique({ 
      where: { id: userId }, 
      select: { 
        id: true, 
        household_members: {
          where: { household_id: householdId },
          select: { role: true }
        }
      } 
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
    
    const membership = prismaUser.household_members[0];
    if (!membership) {
      return { 
        authorized: false, 
        error: NextResponse.json({
          success: false,
          error: 'Você não pertence a este domicílio'
        }, { status: 403 })
      };
    }
    
    if (membership.role.trim().toLowerCase() !== 'admin') {
      return { 
        authorized: false, 
        error: NextResponse.json({
          success: false,
          error: 'Apenas administradores podem executar esta ação.'
        }, { status: 403 })
      };
    }
    
    return { authorized: true };
  } catch (error) { 
    logger.error('Admin Auth Error:', { error });
    return { 
      authorized: false, 
      error: NextResponse.json({
        success: false,
        error: 'Erro interno do servidor'
      }, { status: 500 })
    };
  }
}

// GET /api/v2/households/[id] - Get a specific household
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  const requestId = request.headers.get("x-request-id") || "unknown";

  // Fail fast if framework doesn't provide route parameters
  if (!context?.params) {
    logger.error("[GET /api/v2/households/[id]] Missing context.params from framework", {
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

    // Validate params
    const paramsValidation = RouteParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      logger.error('[GET /api/v2/households/[id]] Param validation error:', {
        requestId,
        issues: paramsValidation.error.issues
      });
      return NextResponse.json({
        success: false,
        error: 'ID do domicílio inválido',
        details: paramsValidation.error.issues
      }, { status: 400 });
    }
    const householdId = paramsValidation.data.id;

    logger.info('[GET /api/v2/households/[id]] Authorizing user', {
      requestId,
      userId: user.id,
      householdId
    });
    
    // Authorize: Must be a member
    const authResult = await authorizeMember(user.id, householdId);
    if (!authResult.authorized) {
      logger.error('[GET /api/v2/households/[id]] Authorization failed', {
        requestId
      });
      return authResult.error!;
    }

    logger.info('[GET /api/v2/households/[id]] Authorization successful, fetching household data', {
      requestId
    });
    
    // Get the household with its members and owner
    const household = await prisma.households.findUnique({
      where: { id: householdId },
      include: {
        household_members: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                email: true
              }
            }
          }
        },
        cats: {
          select: {
            id: true
          }
        }
      }
    });

    if (!household) {
      return NextResponse.json({
        success: false,
        error: "Domicílio não encontrado"
      }, { status: 404 });
    }

    // Find the owner (admin member)
    const ownerMember = household.household_members.find(
      member => member.role === 'admin'
    );
    const ownerUser = ownerMember?.user;

    // Helper function to normalize role from database to expected type
    const normalizeRole = (dbRole: string): 'Admin' | 'Member' => {
      // DB now enforces lowercase via enum, so direct comparison is safe
      if (dbRole === 'admin') {
        return 'Admin';
      }
      // Default to 'Member' for any other value
      return 'Member';
    };

    // Format the response
    const formattedHousehold = {
      id: household.id,
      name: household.name,
      inviteCode: household.inviteCode || '',
      members: household.household_members.map(member => ({
        id: member.id,
        userId: member.user.id,
        name: member.user.full_name,
        email: member.user.email,
        role: normalizeRole(member.role),
        joinedAt: member.created_at
      })),
      cats: household.cats.map(cat => cat.id),
      catGroups: [], // Not implemented yet
      createdAt: household.created_at,
      owner: ownerUser ? {
        id: ownerUser.id,
        name: ownerUser.full_name,
        email: ownerUser.email
      } : undefined
    };

    logger.info('[GET /api/v2/households/[id]] Successfully fetched household', {
      requestId,
      householdId
    });

    return NextResponse.json({
      success: true,
      data: formattedHousehold
    });
  } catch (error) {
    logger.error('[GET /api/v2/households/[id]] Error:', {
      requestId,
      error
    });
    
    return NextResponse.json({
      success: false,
      error: "Erro interno do servidor"
    }, { status: 500 });
  }
});

// PATCH /api/v2/households/[id] - Update a household
export const PATCH = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  const requestId = request.headers.get("x-request-id") || "unknown";

  // Fail fast if framework doesn't provide route parameters
  if (!context?.params) {
    logger.error("[PATCH /api/v2/households/[id]] Missing context.params from framework", {
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

    // Validate params
    const paramsValidation = RouteParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'ID do domicílio inválido',
        details: paramsValidation.error.issues
      }, { status: 400 });
    }
    const householdId = paramsValidation.data.id;

    logger.info('[PATCH /api/v2/households/[id]] Starting update', {
      requestId,
      userId: user.id,
      householdId
    });

    // Authorize: Only admins can update
    const authResult = await authorizeAdmin(user.id, householdId);
    if (!authResult.authorized) {
      return authResult.error!;
    }

    const body = await request.json();
    const bodyValidation = PatchBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: bodyValidation.error.issues
      }, { status: 400 });
    }

    // Ensure there's data to update
    if (Object.keys(bodyValidation.data).length === 0) {
      return NextResponse.json({
        success: false,
        error: "Nenhum dado fornecido para atualização."
      }, { status: 400 });
    }

    // Build update data explicitly to avoid undefined values
    const updateData: { name?: string } = {};
    if (bodyValidation.data.name !== undefined) {
      updateData.name = bodyValidation.data.name;
    }

    // Update the household
    const updatedHousehold = await prisma.households.update({
      where: { id: householdId },
      data: updateData,
      include: {
        household_members: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                email: true
              }
            }
          }
        },
        cats: {
          select: {
            id: true,
            name: true,
            birth_date: true,
            weight: true,
            gender: true
          }
        }
      }
    });

    // Format the response
    const formattedHousehold = {
      id: updatedHousehold.id,
      name: updatedHousehold.name,
      members: updatedHousehold.household_members.map((member: any) => ({
        id: member.user.id,
        name: member.user.full_name,
        email: member.user.email,
        role: member.role,
        isCurrentUser: member.user.id === user.id
      })),
      cats: updatedHousehold.cats.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        birthDate: cat.birth_date,
        weight: cat.weight,
        gender: cat.gender ?? null
      }))
    };

    logger.info('[PATCH /api/v2/households/[id]] Successfully updated household', {
      requestId,
      householdId
    });

    return NextResponse.json({
      success: true,
      data: formattedHousehold
    });

  } catch (error) {
    logger.error('[PATCH /api/v2/households/[id]] Error updating household:', {
      requestId,
      error
    });
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao atualizar domicílio'
    }, { status: 500 });
  }
});

// DELETE /api/v2/households/[id] - Delete a household
export const DELETE = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  const requestId = request.headers.get("x-request-id") || "unknown";

  // Fail fast if framework doesn't provide route parameters
  if (!context?.params) {
    logger.error("[DELETE /api/v2/households/[id]] Missing context.params from framework", {
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

    // Validate params
    const paramsValidation = RouteParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'ID do domicílio inválido',
        details: paramsValidation.error.issues
      }, { status: 400 });
    }
    const householdId = paramsValidation.data.id;

    logger.info('[DELETE /api/v2/households/[id]] Starting deletion', {
      requestId,
      userId: user.id,
      householdId
    });

    // Authorize: Only admins can delete
    const authResult = await authorizeAdmin(user.id, householdId);
    if (!authResult.authorized) {
      return authResult.error!;
    }

    // Check if household exists and get its data
    const householdData = await prisma.households.findUnique({
      where: { id: householdId },
      include: { 
        _count: { 
          select: { 
            household_members: true, 
            cats: true 
          } 
        } 
      }
    });

    if (!householdData) {
      return NextResponse.json({
        success: false,
        error: 'Domicílio não encontrado'
      }, { status: 404 });
    }

    // Perform the deletion in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete household_members relationships
      await tx.household_members.deleteMany({
        where: { household_id: householdId }
      });
      // 2. Delete cats (or handle orphaned cats)
      await tx.cats.deleteMany({
        where: { household_id: householdId }
      });
      // 3. Delete household
      await tx.households.delete({ where: { id: householdId } });
    });

    logger.info('[DELETE /api/v2/households/[id]] Successfully deleted household', {
      requestId,
      householdId
    });

    return NextResponse.json({
      success: true,
      message: 'Domicílio excluído com sucesso'
    }, { status: 200 });

  } catch (error) {
    logger.error('[DELETE /api/v2/households/[id]] Error deleting household:', {
      requestId,
      error
    });
    
    if ((error as any).code === 'P2025') { // Record to delete not found
      return NextResponse.json({
        success: false,
        error: 'Domicílio não encontrado para exclusão.'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao excluir o domicílio'
    }, { status: 500 });
  }
});

