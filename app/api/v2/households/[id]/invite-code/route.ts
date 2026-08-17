import { type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';
import { requireHouseholdAdmin } from '@/lib/authz/household-access';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';
import { uuidParamSchema } from '@/lib/validations/params';

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

  if (!householdId || !uuidParamSchema.safeParse(householdId).success) {
    return v2Err('Household ID is required', 400);
  }

  const adminAccess = await requireHouseholdAdmin(user.id, householdId);
  if (!adminAccess.ok) return adminAccess.response;

  try {
    const newInviteCode = await generateInviteCode();

    // Update the household with the new invite code
    const updatedHousehold = await prisma.households.update({
      where: { id: householdId },
      data: { inviteCode: newInviteCode },
      select: { inviteCode: true },
    });

    logger.info(`[PATCH /api/v2/households/invite-code] Invite code regenerated for household ${householdId}`);

    return v2Ok({ inviteCode: updatedHousehold.inviteCode });

  } catch (error) {
    // Handle Prisma P2025 error (record not found)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return v2Err('Household not found', 404);
    }

    // Handle all other errors
    logger.error('[PATCH /api/v2/households/invite-code] Error regenerating invite code', { error });
    return v2Err('Internal server error', 500);
  }
});

