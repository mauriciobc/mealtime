import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { createAdminClient } from '@/utils/supabase/admin';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

// Define input schema
const inviteSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

// Helper function to check admin/owner status
async function isUserAdmin(userId: string, householdId: string): Promise<boolean> {
  if (!userId || !householdId) {
    logger.debug('[isUserAdmin] Missing userId or householdId');
    return false;
  }
  
  try {
    logger.debug(`[isUserAdmin] Checking permissions for user ${userId} in household ${householdId}`);
    
    // First check if user is the owner of the household
    const household = await prisma.households.findUnique({
      where: { id: householdId },
      select: { owner_id: true }
    });
    
    if (household?.owner_id === userId) {
      logger.debug(`[isUserAdmin] User ${userId} is the owner of household ${householdId}`);
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
    
    const role = membership?.role?.toLowerCase();
    const hasPermission = role === 'admin' || role === 'owner';
    
    logger.debug(`[isUserAdmin] User ${userId} ${hasPermission ? 'has' : 'does not have'} admin/owner permissions. Role: "${membership?.role}"`);
    
    return hasPermission;
  } catch (error) {
    logger.error('[isUserAdmin] Error checking admin status:', error);
    return false;
  }
}

export const POST = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  const params = context ? await context.params : null;
  const householdId = params?.id || request.nextUrl.pathname.split('/')[4];

  logger.info('[POST /api/v2/households/invite] Invite request received', { householdId, userId: user.id });

  if (!householdId) {
    return NextResponse.json({
      success: false,
      error: 'Household ID is required'
    }, { status: 400 });
  }

  // Verify requester is admin/owner of the target household
  const isAdmin = await isUserAdmin(user.id, householdId);
  if (!isAdmin) {
    logger.warn(`[POST /api/v2/households/invite] User ${user.id} not authorized for household ${householdId}`);
    return NextResponse.json({
      success: false,
      error: 'Forbidden: User does not have permission to invite members to this household'
    }, { status: 403 });
  }

  // Validate request body
  let validatedData;
  try {
    const body = await request.json();
    validatedData = inviteSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input',
        details: error.issues
      }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      error: 'Invalid request body'
    }, { status: 400 });
  }

  const { email: targetEmail } = validatedData;
  
  try {
    // Fetch household name
    const household = await prisma.households.findUnique({
      where: { id: householdId },
      select: { name: true },
    });

    if (!household) {
      return NextResponse.json({
        success: false,
        error: 'Household not found'
      }, { status: 404 });
    }

    // Check if a user with this email already exists in Supabase Auth
    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      logger.error('[POST /api/v2/households/invite] Failed to initialize admin client');
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize admin client'
      }, { status: 500 });
    }

    // Get user by email
    const { data: existingAuthUser, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();

    if (getUserError && getUserError.message !== 'User not found') {
      logger.error('[POST /api/v2/households/invite] Supabase listUsers error:', getUserError);
      return NextResponse.json({
        success: false,
        error: 'Failed to check existing user'
      }, { status: 500 });
    }

    // Find user with exact email match
    const targetUser = existingAuthUser?.users?.find((u: any) => 
      u.email?.toLowerCase() === targetEmail.toLowerCase()
    );
    
    logger.debug(`[POST /api/v2/households/invite] Looking for user with email ${targetEmail}:`, {
      found: !!targetUser,
      id: targetUser?.id
    });

    // Check if user is already in the household
    if (targetUser) {
      const existingMembership = await prisma.household_members.findFirst({
        where: {
          user_id: targetUser.id,
          household_id: householdId,
        },
      });

      if (existingMembership) {
        logger.info(`[POST /api/v2/households/invite] User already member`, { userId: targetUser.id, householdId });
        return NextResponse.json({
          success: true,
          message: 'User is already a member of this household'
        }, { status: 200 });
      }

      // User exists but not in household, add them directly
      logger.debug(`[POST /api/v2/households/invite] Adding existing user ${targetUser.id} to household ${householdId}`);
      
      await prisma.household_members.create({
        data: {
          user_id: targetUser.id,
          household_id: householdId,
          role: 'member',
        },
      });

      logger.info(`[POST /api/v2/households/invite] Existing user added to household`, { userId: targetUser.id, householdId });

      return NextResponse.json({
        success: true,
        message: 'Existing user added to household successfully'
      }, { status: 200 });

    } else {
      // User does not exist, send an invite
      const inviteRedirectUrl = `${request.nextUrl.origin}/api/auth/callback?redirect=/join?householdId=${householdId}`;

      logger.debug('[POST /api/v2/households/invite] Sending invite to new user:', targetEmail);
      
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        targetEmail,
        { redirectTo: inviteRedirectUrl }
      );

      if (inviteError) {
        logger.error('[POST /api/v2/households/invite] Supabase invite error:', inviteError);
        
        if (inviteError.message.includes('rate limit')) {
          return NextResponse.json({
            success: false,
            error: 'Invite rate limit exceeded. Please try again later.'
          }, { status: 429 });
        }
        
        return NextResponse.json({
          success: false,
          error: 'Failed to send invitation'
        }, { status: 500 });
      }

      logger.info('[POST /api/v2/households/invite] Invitation sent successfully', { email: targetEmail, householdId });

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully'
      }, { status: 200 });
    }

  } catch (error) {
    logger.error('[POST /api/v2/households/invite] Error processing household invite:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
});

