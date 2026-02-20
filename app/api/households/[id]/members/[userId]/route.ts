import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@/utils/supabase/server'; // Import Supabase client
import { cookies } from 'next/headers'; // Import cookies
import { z } from 'zod'; // Import Zod

// Zod schema for route parameters
const RouteParamsSchema = z.object({
  id: z.string().uuid({ message: "ID do domicílio inválido" }),
  userId: z.string().uuid({ message: "ID do usuário inválido" }),
});

// Zod schema for PATCH request body
const PatchBodySchema = z.object({
  role: z.enum(['admin', 'member'], { message: 'Papel inválido. Deve ser "admin" ou "member"' }),
}).strict();

// --- Authorization Helpers ---

// Debug utility: logs only in development
function debugLog(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
     
    console.log(...args);
  }
}

// Checks if the requesting user is an admin of the specified household
async function authorizeAdminAction(supabaseUser: any, householdId: string): Promise<{ authorized: boolean; prismaUserId?: string; error?: NextResponse }> {
  if (!supabaseUser) {
    return { authorized: false, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  }
  try {
    // Fetch profile and include household_members relation to check role
    const prismaUser = await prisma.profiles.findUnique({
      where: { id: supabaseUser.id }, // auth_id maps to profile.id (string)
      select: {
        id: true,
        household_members: {
          where: { household_id: householdId }, // household_id is string in relation, compare with string householdId param
          select: { role: true },
        },
      },
    });

    if (!prismaUser) return { authorized: false, error: NextResponse.json({ error: 'Usuário solicitante não encontrado' }, { status: 404 }) };

    const membership = prismaUser.household_members[0];
    if (!membership) return { authorized: false, error: NextResponse.json({ error: 'Usuário solicitante não pertence a este domicílio' }, { status: 403 }) };
    if (String(membership.role).toLowerCase() !== 'admin') return { authorized: false, error: NextResponse.json({ error: 'Apenas administradores podem executar esta ação.' }, { status: 403 }) };

    return { authorized: true, prismaUserId: prismaUser.id };
  } catch (error) { 
    console.error('Admin Action Auth Error:', error);
    return { authorized: false, error: NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 }) };
  }
}

// Checks if the requesting user is either an admin OR the target user themselves
async function authorizeAdminOrSelfAction(supabaseUser: any, householdId: string, targetPrismaUserId: string): Promise<{ authorized: boolean; isSelf: boolean; error?: NextResponse }> {
    if (!supabaseUser) {
        return { authorized: false, isSelf: false, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
    }
    try {
        debugLog('[AUTH DEBUG] supabaseUser.id:', supabaseUser.id);
        debugLog('[AUTH DEBUG] householdId:', householdId);
        debugLog('[AUTH DEBUG] targetPrismaUserId:', targetPrismaUserId);
        // Fetch requesting user profile and include household_members relation
        const requestingPrismaUser = await prisma.profiles.findUnique({
          where: { id: supabaseUser.id }, // auth_id maps to profile.id (string)
          select: {
            id: true,
            household_members: {
              where: { household_id: householdId }, // household_id is string in relation
              select: { role: true },
            },
          },
        });
        debugLog('[AUTH DEBUG] requestingPrismaUser:', requestingPrismaUser);
        
        if (!requestingPrismaUser) return { authorized: false, isSelf: false, error: NextResponse.json({ error: 'Usuário solicitante não encontrado' }, { status: 404 }) };
        
        const membership = requestingPrismaUser.household_members[0];
        debugLog('[AUTH DEBUG] membership:', membership);
        if (!membership) return { authorized: false, isSelf: false, error: NextResponse.json({ error: 'Usuário solicitante não pertence a este domicílio' }, { status: 403 }) };

        const isSelfAction = requestingPrismaUser.id === targetPrismaUserId; // Compare profile ID (string) with target user ID (string)
        const isAdminAction = String(membership.role).toLowerCase() === 'admin';

        if (isAdminAction || isSelfAction) {
            return { authorized: true, isSelf: isSelfAction };
        }

        return { authorized: false, isSelf: false, error: NextResponse.json({ error: 'Permissão negada. Apenas administradores ou o próprio usuário podem executar esta ação.' }, { status: 403 }) };

    } catch (error) { 
        console.error('Admin/Self Action Auth Error:', error);
        return { authorized: false, isSelf: false, error: NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 }) };
    }
}

// --- Route Handlers ---

// Utility to format household for UI
async function getFormattedHousehold(householdId: string) {
  // Include household_members and cats in the fetch
  const household = await prisma.households.findUnique({
    where: { id: householdId }, // household ID is string in households table
    include: {
      household_members: {
        include: {
          user: true, // 'user' relation on household_members links to profiles
        },
      },
      cats: true,
    },
  });
  if (!household) return null;

  // Map household_members to include user details correctly
  const members = household.household_members.map(member => ({
    id: String(member.id), // household_member ID (string)
    userId: String(member.user_id), // user profile ID (string)
    name: member.user?.full_name || '',
    email: member.user?.email || '',
    role: member.role as 'Admin' | 'Member',
    joinedAt: member.created_at,
    avatar: member.user?.avatar_url || undefined,
  }));

  // Find the owner based on owner_id and members list
  const ownerMember = members.find(member => member.userId === household.owner_id);
  const owner = ownerMember ? { id: ownerMember.userId, name: ownerMember.name, email: ownerMember.email } : undefined;

  return {
    id: String(household.id), // Ensure string ID
    name: household.name,
    inviteCode: household.inviteCode || '', // Corrected field name
    members: members, // Use the mapped members array
    cats: household.cats.map(cat => ({
        id: String(cat.id),
        name: cat.name,
        birthDate: cat.birth_date,
        weight: cat.weight,
        gender: cat.gender ?? null
    })), // Map cats with necessary fields
    catGroups: [], // Add if you want
    createdAt: household.created_at,
    owner: owner
  };
}

// PATCH /api/households/[id]/members/[userId] - Atualizar papel de um membro
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  const params = await context.params;
  // Validate route parameters
  const paramsValidation = RouteParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    const errorMessages = paramsValidation.error.issues.map(e => e.message).join(', ');
    return NextResponse.json({ error: errorMessages }, { status: 400 });
  }
  const householdId = paramsValidation.data.id; // Get as string
  const targetUserId = paramsValidation.data.userId; // Get as string

  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  // Authorize: Only admins can change roles
  const authResult = await authorizeAdminAction(supabaseUser, householdId); // householdId is string here
  if (!authResult.authorized) {
    console.log('[API DEBUG] Returning auth error:', authResult.error);
    return authResult.error!;
  }

  try {
    // Find the specific household_members record using the composite unique key
    const memberToUpdate = await prisma.household_members.findUnique({
      where: {
        household_id_user_id: { // Use composite unique key name from schema
          household_id: householdId, 
          user_id: targetUserId
        }
      },
      select: { role: true, id: true } // Select role and id
    });

    if (!memberToUpdate) {
      return NextResponse.json({ error: 'Membro não encontrado neste domicílio' }, { status: 404 });
    }

    const currentMemberRole = memberToUpdate.role; // Get role directly from the record
    const memberHouseholdMemberId = memberToUpdate.id; // Get household_member ID (string)

    const body = await request.json();
    const bodyValidation = PatchBodySchema.safeParse(body);
    if (!bodyValidation.success) {
      const errorMessages = bodyValidation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }
    const { role: newRole } = bodyValidation.data;

    // Prevent changing the role of the last admin
    if (currentMemberRole === 'admin' && newRole !== 'admin') {
       const adminCount = await prisma.household_members.count({ where: { household_id: householdId, role: 'admin' } });
       if (adminCount <= 1) {
         return NextResponse.json({ error: 'Não é possível rebaixar o último administrador do domicílio' }, { status: 400 });
       }
    }

    // Update member role in household_members table
    await prisma.household_members.update({
      where: { id: memberHouseholdMemberId }, // Update using household_member ID (string)
      data: { role: newRole },
    });

    // Return updated household
    const updatedHousehold = await getFormattedHousehold(householdId); // householdId is string
    return NextResponse.json(updatedHousehold);

  } catch (error) {
    console.error('Erro ao atualizar papel do membro (PATCH):', error);
    if ((error as any).code === 'P2025') { // Record to update not found
      return NextResponse.json({ error: 'Membro não encontrado para atualização.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Ocorreu um erro ao atualizar o papel do membro' }, { status: 500 });
  }
}

// DELETE /api/households/[id]/members/[userId] - Remover membro do domicílio
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  const params = await context.params;
  debugLog('[API DEBUG] params:', params, 'type:', typeof params);
  if (params) {
    debugLog('[API DEBUG] params.id:', params.id, 'type:', typeof params.id);
    debugLog('[API DEBUG] params.userId:', params.userId, 'type:', typeof params.userId);
  }
  // Validate route parameters
  const paramsValidation = RouteParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    const errorMessages = paramsValidation.error.issues.map(e => e.message).join(', ');
    console.log('[API DEBUG] Returning params validation error:', { error: errorMessages });
    return NextResponse.json({ error: errorMessages }, { status: 400 });
  }
  const householdId = paramsValidation.data.id; // Get as string
  const targetUserId = paramsValidation.data.userId; // Get as string

  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  // Authorize: Admin can remove anyone, member can only remove self
  const authResult = await authorizeAdminOrSelfAction(supabaseUser, householdId, targetUserId); // householdId is string, targetUserId is string
  if (!authResult.authorized) {
    console.log('[API DEBUG] Returning auth error:', authResult.error);
    return authResult.error!;
  }

  try {
    // Find the specific household_members record using the composite unique key
    const householdMemberToRemove = await prisma.household_members.findUnique({
      where: {
        household_id_user_id: { // Use composite unique key name from schema
          household_id: householdId,
          user_id: targetUserId
        }
      },
      select: { role: true, id: true, user: { select: { full_name: true } } } // Select role, id, and nested user name
    });

    if (!householdMemberToRemove) {
      console.log('[API DEBUG] Returning member not found error');
      return NextResponse.json({ error: 'Membro não encontrado neste domicílio para remoção.' }, { status: 404 });
    }
    
    // Access user name through the nested relation
    const removingUserName = householdMemberToRemove.user?.full_name || 'Um usuário';

    // Prevent removing the last admin
    if (householdMemberToRemove.role === 'admin') {
      const adminCount = await prisma.household_members.count({ where: { household_id: householdId, role: 'admin' } });
      if (adminCount <= 1) {
        if (!authResult.isSelf) {
          console.log('[API DEBUG] Returning last admin removal error');
          return NextResponse.json({ error: 'Não é possível remover o último administrador do domicílio através desta rota. O domicílio deve ser excluído ou a propriedade transferida.' }, { status: 400 });
        }
      }
    }

    // Delete the household_member record
    await prisma.household_members.delete({
      where: { id: householdMemberToRemove.id } // Delete using household_member ID (string)
    });

    // Return updated household after deletion
    const updatedHousehold = await getFormattedHousehold(householdId); // householdId is string
    console.log('[API DEBUG] Returning updated household:', updatedHousehold);
    return NextResponse.json(updatedHousehold, { status: 200 });

  } catch (error) {
    console.error('Erro ao remover membro (DELETE):', error);
    if ((error as any).code === 'P2025') { // Record to delete not found
      console.log('[API DEBUG] Returning P2025 error');
      return NextResponse.json({ error: 'Membro não encontrado para remoção.' }, { status: 404 });
    }
    // Catch potential errors related to deleting the last admin if not handled by last admin check
    // Or other database errors.
    console.log('[API DEBUG] Returning generic error');
    return NextResponse.json({ error: 'Ocorreu um erro ao remover o membro' }, { status: 500 });
  }
} 