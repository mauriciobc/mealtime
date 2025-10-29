import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

// Helper function to check admin/owner status
async function isUserAdmin(userId: string, householdId: string): Promise<boolean> {
  if (!userId || !householdId) {
    return false;
  }
  
  try {
    // First check if user is the owner of the household
    const household = await prisma.households.findUnique({
      where: { id: householdId },
      select: { owner_id: true }
    });
    
    if (household?.owner_id === userId) {
      return true;
    }
    
    // Then check membership role
    const membership = await prisma.household_members.findUnique({
      where: {
        household_id_user_id: {
          household_id: householdId,
          user_id: userId,
        },
      },
      select: { role: true },
    });
    
    const role = membership?.role;
    return role === 'admin';
  } catch (error) {
    logger.error('[isUserAdmin] Error checking admin status', { error });
    return false;
  }
}

// Helper to generate a unique invite code
async function generateInviteCode(): Promise<string> {
  const maxAttempts = 5;
  for (let i = 0; i < maxAttempts; i++) {
    const code = uuidv4().substring(0, 8);
    const existing = await prisma.households.findFirst({
      where: { inviteCode: code },
      select: { id: true }
    });
    if (!existing) {
      return code;
    }
  }
  throw new Error('Failed to generate unique invite code after multiple attempts');
}

export const PATCH = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  const params = context ? await context.params : null;
  const householdId = params?.id || request.nextUrl.pathname.split('/')[4];

  logger.debug(`[PATCH /api/v2/households/${householdId}/invite-code] Request from user: ${user.id}`);

  if (!householdId) {
    return NextResponse.json({
      success: false,
      error: 'Household ID is required'
    }, { status: 400 });
  }

  // Verify requester is admin/owner of the target household
  const isAdmin = await isUserAdmin(user.id, householdId);
  if (!isAdmin) {
    logger.warn(`[PATCH /api/v2/households/invite-code] User ${user.id} not authorized for household ${householdId}`);
    return NextResponse.json({
      success: false,
      error: 'Forbidden: User does not have permission to modify this household'
    }, { status: 403 });
  }

  try {
    const newInviteCode = await generateInviteCode();

    // Update the household with the new invite code
    const updatedHousehold = await prisma.households.update({
      where: { id: householdId },
      data: { inviteCode: newInviteCode },
      select: { inviteCode: true },
    });

    logger.info(`[PATCH /api/v2/households/invite-code] Invite code regenerated for household ${householdId}`);

    return NextResponse.json({
      success: true,
      data: { inviteCode: updatedHousehold.inviteCode }
    });

  } catch (error) {
    // Handle Prisma P2025 error (record not found)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({
        success: false,
        error: 'Household not found'
      }, { status: 404 });
    }

    // Handle all other errors
    logger.error('[PATCH /api/v2/households/invite-code] Error regenerating invite code', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
});

