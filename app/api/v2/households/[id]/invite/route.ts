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
    
    const role = membership?.role;
    const hasPermission = role === 'admin';
    
    logger.debug(`[isUserAdmin] User ${userId} ${hasPermission ? 'has' : 'does not have'} admin permissions. Role: "${role}"`);
    
    return hasPermission;
  } catch (error) {
    logger.error('[isUserAdmin] Error checking admin status', { error });
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

    // Check if a user with this email already exists (query profiles table directly - avoids pagination issues)
    const targetUser = await prisma.profiles.findFirst({
      where: {
        email: {
          equals: targetEmail,
          mode: 'insensitive' // Case-insensitive comparison
        }
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        username: true
      }
    });
    
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

      // User exists but not in household
      // Send a notification that requires acceptance instead of adding directly
      logger.debug(`[POST /api/v2/households/invite] Creating invite notification for existing user ${targetUser.id}`);
      
      // Check for existing pending invites
      const existingInvite = await prisma.notifications.findFirst({
        where: {
          user_id: targetUser.id,
          type: 'household_invite',
          is_read: false,
          metadata: {
            path: ['householdId'],
            equals: householdId
          }
        }
      });

      if (existingInvite) {
        logger.info(`[POST /api/v2/households/invite] Pending invite already exists`, { 
          userId: targetUser.id, 
          householdId,
          notificationId: existingInvite.id 
        });
        return NextResponse.json({
          success: true,
          message: 'Invitation already sent to this user'
        }, { status: 200 });
      }

      // Get inviter's name for the notification
      const inviter = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { full_name: true, username: true }
      });

      const inviterName = inviter?.full_name || inviter?.username || 'Someone';

      // Create notification with invite metadata
      await prisma.notifications.create({
        data: {
          id: crypto.randomUUID(),
          user_id: targetUser.id,
          title: `Convite para ${household.name}`,
          message: `${inviterName} convidou você para participar do domicílio "${household.name}". Você pode aceitar ou rejeitar este convite.`,
          type: 'household_invite',
          is_read: false,
          metadata: {
            householdId,
            householdName: household.name,
            invitedBy: user.id,
            inviterName,
            invitedAt: new Date().toISOString()
          },
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      logger.info(`[POST /api/v2/households/invite] Invite notification sent to existing user`, { 
        userId: targetUser.id, 
        householdId 
      });

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully. The user will need to accept it.'
      }, { status: 200 });

    } else {
      // User does not exist, send an invite via Supabase Auth
      const supabaseAdmin = createAdminClient();
      if (!supabaseAdmin) {
        logger.error('[POST /api/v2/households/invite] Failed to initialize admin client');
        return NextResponse.json({
          success: false,
          error: 'Failed to initialize admin client'
        }, { status: 500 });
      }

      const inviteRedirectUrl = `${request.nextUrl.origin}/api/auth/callback?redirect=/join?householdId=${householdId}`;

      logger.debug('[POST /api/v2/households/invite] Sending invite to new user', { email: targetEmail });
      
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        targetEmail,
        { redirectTo: inviteRedirectUrl }
      );

      if (inviteError) {
        logger.error('[POST /api/v2/households/invite] Supabase invite error', { inviteError });
        
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
    logger.error('[POST /api/v2/households/invite] Error processing household invite', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
});

