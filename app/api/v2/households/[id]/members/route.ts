import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { requireHouseholdAdmin, requireHouseholdMember } from '@/lib/authz/household-access';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';

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
  const result = await requireHouseholdAdmin(userId, householdId);
  if (!result.ok) return { authorized: false, error: result.response };
  return { authorized: true };
}

async function authorizeMember(userId: string, householdId: string): Promise<{
  authorized: boolean;
  error?: NextResponse
}> {
  const result = await requireHouseholdMember(userId, householdId);
  if (!result.ok) return { authorized: false, error: result.response };
  return { authorized: true };
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
    return v2Err("Internal routing error: missing route parameters", 500);
  }

  try {
    const params = await context.params;
    
    // Validate route parameters
    const paramsValidation = RouteParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return v2Err('ID do domicílio inválido', 400, paramsValidation.error.issues);
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

    return v2Ok(members);

  } catch (error) {
    logger.error('[GET /api/v2/households/[id]/members] Error fetching members:', {
      requestId,
      error
    });
    
    return v2Err('Ocorreu um erro ao buscar os membros', 500);
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
    return v2Err("Internal routing error: missing route parameters", 500);
  }

  try {
    const params = await context.params;
    
    // Validate route parameters
    const paramsValidation = RouteParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return v2Err('ID do domicílio inválido', 400, paramsValidation.error.issues);
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
      return v2Err('Dados inválidos', 400, bodyValidation.error.issues);
    }

    const { email: emailToAdd, role: roleToAdd } = bodyValidation.data;

    // Find the user to add by email
    const userToAdd = await prisma.profiles.findFirst({
      where: { email: emailToAdd },
      select: { id: true }
    });

    if (!userToAdd) {
      return v2Err('Usuário com este email não encontrado.', 404);
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

    return v2Ok(member, 201);

  } catch (error) {
    // Handle custom transaction errors
    if ((error as Error).message === 'ALREADY_IN_HOUSEHOLD') {
      return v2Err('Este usuário já pertence a este domicílio.', 400);
    }
    
    if ((error as Error).message === 'ALREADY_IN_OTHER_HOUSEHOLD') {
      return v2Err('Este usuário já pertence a outro domicílio.', 400);
    }
    
    logger.error('[POST /api/v2/households/[id]/members] Error adding member:', {
      requestId,
      error
    });
    
    // Handle specific Prisma errors
    if ((error as any).code === 'P2002') {
      return v2Err('Erro de conflito ao adicionar membro.', 409);
    }
    
    return v2Err('Ocorreu um erro ao adicionar o membro', 500);
  }
});

