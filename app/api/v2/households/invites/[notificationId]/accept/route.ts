import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

/**
 * POST /api/v2/households/invites/[notificationId]/accept
 * Accept a household invitation
 */
export const POST = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ notificationId: string }> }
) => {
  const params = context ? await context.params : null;
  const notificationId = params?.notificationId || request.nextUrl.pathname.split('/')[5];

  logger.info('[POST /api/v2/households/invites/accept] Accept invite request', { 
    notificationId, 
    userId: user.id 
  });

  if (!notificationId) {
    return NextResponse.json({
      success: false,
      error: 'Notification ID is required'
    }, { status: 400 });
  }

  try {
    // Get the invitation notification
    const notification = await prisma.notifications.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return NextResponse.json({
        success: false,
        error: 'Invitation not found'
      }, { status: 404 });
    }

    // Verify the notification belongs to the user
    if (notification.user_id !== user.id) {
      logger.warn(`[POST /api/v2/households/invites/accept] User ${user.id} attempted to accept invite for ${notification.user_id}`);
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: This invitation is not for you'
      }, { status: 403 });
    }

    // Verify it's a household invite
    if (notification.type !== 'household_invite') {
      return NextResponse.json({
        success: false,
        error: 'Invalid notification type'
      }, { status: 400 });
    }

    // Extract household info from metadata
    const metadata = notification.metadata as any;
    const householdId = metadata?.householdId;

    if (!householdId) {
      logger.error('[POST /api/v2/households/invites/accept] Missing householdId in metadata', { 
        notificationId,
        metadata 
      });
      return NextResponse.json({
        success: false,
        error: 'Invalid invitation data'
      }, { status: 400 });
    }

    // Check if household still exists
    const household = await prisma.households.findUnique({
      where: { id: householdId }
    });

    if (!household) {
      // Mark notification as read and add error metadata
      await prisma.notifications.update({
        where: { id: notificationId },
        data: {
          is_read: true,
          metadata: {
            ...metadata,
            status: 'expired',
            reason: 'household_not_found'
          }
        }
      });

      return NextResponse.json({
        success: false,
        error: 'Household no longer exists'
      }, { status: 404 });
    }

    // Check if user is already a member
    const existingMembership = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: householdId
      }
    });

    if (existingMembership) {
      // Mark notification as read
      await prisma.notifications.update({
        where: { id: notificationId },
        data: {
          is_read: true,
          metadata: {
            ...metadata,
            status: 'already_member'
          }
        }
      });

      logger.info(`[POST /api/v2/households/invites/accept] User already member`, { 
        userId: user.id, 
        householdId 
      });

      return NextResponse.json({
        success: true,
        message: 'You are already a member of this household',
        household
      }, { status: 200 });
    }

    // Add user to household
    await prisma.household_members.create({
      data: {
        user_id: user.id,
        household_id: householdId,
        role: 'member'
      }
    });

    // Mark notification as read and accepted
    await prisma.notifications.update({
      where: { id: notificationId },
      data: {
        is_read: true,
        metadata: {
          ...metadata,
          status: 'accepted',
          acceptedAt: new Date().toISOString()
        }
      }
    });

    // Create a confirmation notification for the inviter
    const invitedBy = metadata?.invitedBy;
    if (invitedBy) {
      const acceptor = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { full_name: true, username: true }
      });

      const acceptorName = acceptor?.full_name || acceptor?.username || 'A user';

      await prisma.notifications.create({
        data: {
          id: crypto.randomUUID(),
          user_id: invitedBy,
          title: 'Convite Aceito',
          message: `${acceptorName} aceitou seu convite para participar do domicílio "${household.name}".`,
          type: 'household',
          is_read: false,
          metadata: {
            householdId,
            householdName: household.name,
            acceptedBy: user.id,
            acceptorName,
            acceptedAt: new Date().toISOString()
          },
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }

    logger.info(`[POST /api/v2/households/invites/accept] User accepted invite and joined household`, { 
      userId: user.id, 
      householdId,
      notificationId 
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully joined household',
      household
    }, { status: 200 });

  } catch (error) {
    logger.error('[POST /api/v2/households/invites/accept] Error accepting invite', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
});

