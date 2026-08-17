import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { parseGender } from '@/lib/types/common';
import { requireHouseholdAdmin, requireHouseholdMember } from '@/lib/authz/household-access';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';

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
  const result = await requireHouseholdMember(userId, householdId);
  if (!result.ok) return { authorized: false, error: result.response };
  return { authorized: true };
}

async function authorizeAdmin(userId: string, householdId: string): Promise<{ authorized: boolean; error?: NextResponse }> {
  const result = await requireHouseholdAdmin(userId, householdId);
  if (!result.ok) return { authorized: false, error: result.response };
  return { authorized: true };
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
    return v2Err("Internal routing error: missing route parameters", 500);
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
      return v2Err('ID do domicílio inválido', 400, paramsValidation.error.issues);
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
      return v2Err("Domicílio não encontrado", 404);
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

    return v2Ok(formattedHousehold);
  } catch (error) {
    logger.error('[GET /api/v2/households/[id]] Error:', {
      requestId,
      error
    });
    
    return v2Err("Erro interno do servidor", 500);
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
    return v2Err("Internal routing error: missing route parameters", 500);
  }

  try {
    const params = await context.params;

    // Validate params
    const paramsValidation = RouteParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return v2Err('ID do domicílio inválido', 400, paramsValidation.error.issues);
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
      return v2Err('Dados inválidos', 400, bodyValidation.error.issues);
    }

    // Ensure there's data to update
    if (Object.keys(bodyValidation.data).length === 0) {
      return v2Err("Nenhum dado fornecido para atualização.", 400);
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
        gender: parseGender(cat.gender)
      }))
    };

    logger.info('[PATCH /api/v2/households/[id]] Successfully updated household', {
      requestId,
      householdId
    });

    return v2Ok(formattedHousehold);

  } catch (error) {
    logger.error('[PATCH /api/v2/households/[id]] Error updating household:', {
      requestId,
      error
    });
    
    return v2Err('Erro ao atualizar domicílio', 500);
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
    return v2Err("Internal routing error: missing route parameters", 500);
  }

  try {
    const params = await context.params;

    // Validate params
    const paramsValidation = RouteParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return v2Err('ID do domicílio inválido', 400, paramsValidation.error.issues);
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
      return v2Err('Domicílio não encontrado', 404);
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

    return v2Ok({ message: 'Domicílio excluído com sucesso' });

  } catch (error) {
    logger.error('[DELETE /api/v2/households/[id]] Error deleting household:', {
      requestId,
      error
    });
    
    if ((error as any).code === 'P2025') { // Record to delete not found
      return v2Err('Domicílio não encontrado para exclusão.', 404);
    }
    
    return v2Err('Ocorreu um erro ao excluir o domicílio', 500);
  }
});

