import { type NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

/**
 * POST /api/v2/households/invites/[notificationId]/reject
 * Reject a household invitation
 */
export const POST = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ notificationId: string }> }
) => {
  const params = context ? await context.params : null;
  const notificationId = params?.notificationId || request.nextUrl.pathname.split('/')[5];

  logger.info('[POST /api/v2/households/invites/reject] Reject invite request', { 
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
      logger.warn(`[POST /api/v2/households/invites/reject] User ${user.id} attempted to reject invite for ${notification.user_id}`);
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

    // Extract metadata
    const metadata = notification.metadata as any;

    // Mark notification as read and rejected
    await prisma.notifications.update({
      where: { id: notificationId },
      data: {
        is_read: true,
        metadata: {
          ...metadata,
          status: 'rejected',
          rejectedAt: new Date().toISOString()
        }
      }
    });

    // Optionally notify the inviter (commented out to avoid spam, can be enabled if needed)
    /*
    const invitedBy = metadata?.invitedBy;
    const householdName = metadata?.householdName;
    if (invitedBy && householdName) {
      const rejector = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { full_name: true, username: true }
      });

      const rejectorName = rejector?.full_name || rejector?.username || 'A user';

      await prisma.notifications.create({
        data: {
          id: crypto.randomUUID(),
          user_id: invitedBy,
          title: 'Convite Recusado',
          message: `${rejectorName} recusou seu convite para participar do domicílio "${householdName}".`,
          type: 'household',
          is_read: false,
          metadata: {
            householdId: metadata.householdId,
            householdName,
            rejectedBy: user.id,
            rejectorName,
            rejectedAt: new Date().toISOString()
          },
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }
    */

    logger.info(`[POST /api/v2/households/invites/reject] User rejected invite`, { 
      userId: user.id, 
      notificationId 
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation rejected successfully'
    }, { status: 200 });

  } catch (error) {
    logger.error('[POST /api/v2/households/invites/reject] Error rejecting invite', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
});

