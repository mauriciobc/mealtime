import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

// Explicitly set runtime to Node.js
export const runtime = 'nodejs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Schema de validação para atualização
const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
});

/**
 * GET /api/v2/notifications/[id] - Buscar uma notificação específica
 */
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    if (!context?.params) {
      logger.error(`[GET /api/v2/notifications/[id]] Missing params context`);
      return NextResponse.json({
        success: false,
        error: 'Invalid request: missing notification ID'
      }, { status: 400 });
    }
    
    const params = await context.params;
    const { id } = params;
    
    logger.debug(`[GET /api/v2/notifications/${id}] Fetching notification for user ${user.id}`);

    const notification = await prisma.notifications.findFirst({
      where: {
        id,
        user_id: user.id,
      },
    });

    if (!notification) {
      logger.warn(`[GET /api/v2/notifications/${id}] Notification not found or access denied`);
      return NextResponse.json({
        success: false,
        error: 'Notification not found'
      }, { status: 404 });
    }

    logger.info(`[GET /api/v2/notifications/${id}] Notification found`);

    return NextResponse.json({
      success: true,
      data: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.is_read,
        createdAt: notification.created_at,
        updatedAt: notification.updated_at,
        userId: notification.user_id,
        metadata: notification.metadata || {},
      }
    });

  } catch (error) {
    logger.error(`[GET /api/v2/notifications/[id]] Error fetching notification`, { error });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
});

/**
 * PATCH /api/v2/notifications/[id] - Atualizar uma notificação (marcar como lida/não lida)
 */
export const PATCH = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    if (!context?.params) {
      logger.error(`[PATCH /api/v2/notifications/[id]] Missing params context`);
      return NextResponse.json({
        success: false,
        error: 'Invalid request: missing notification ID'
      }, { status: 400 });
    }
    
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    
    logger.debug(`[PATCH /api/v2/notifications/${id}] Received body:`, body);

    // Validar o corpo da requisição
    const validationResult = updateNotificationSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error(`[PATCH /api/v2/notifications/${id}] Invalid body`, { 
        errors: validationResult.error.format() 
      });
      return NextResponse.json({
        success: false,
        error: "Invalid request data",
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const { isRead } = validationResult.data;

    // Verificar se a notificação existe e pertence ao usuário
    const existingNotification = await prisma.notifications.findFirst({
      where: {
        id,
        user_id: user.id,
      },
    });

    if (!existingNotification) {
      logger.warn(`[PATCH /api/v2/notifications/${id}] Notification not found or access denied`);
      return NextResponse.json({
        success: false,
        error: 'Notification not found'
      }, { status: 404 });
    }

    // Atualizar a notificação
    const updatedNotification = await prisma.notifications.update({
      where: { id },
      data: {
        is_read: isRead ?? existingNotification.is_read,
        updated_at: new Date(),
      },
    });

    logger.info(`[PATCH /api/v2/notifications/${id}] Notification updated successfully`);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedNotification.id,
        title: updatedNotification.title,
        message: updatedNotification.message,
        type: updatedNotification.type,
        isRead: updatedNotification.is_read,
        createdAt: updatedNotification.created_at,
        updatedAt: updatedNotification.updated_at,
        userId: updatedNotification.user_id,
        metadata: updatedNotification.metadata || {},
      }
    });

  } catch (error) {
    logger.error(`[PATCH /api/v2/notifications/[id]] Error updating notification`, { error });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
});

/**
 * DELETE /api/v2/notifications/[id] - Deletar uma notificação
 */
export const DELETE = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    if (!context?.params) {
      logger.error(`[DELETE /api/v2/notifications/[id]] Missing params context`);
      return NextResponse.json({
        success: false,
        error: 'Invalid request: missing notification ID'
      }, { status: 400 });
    }
    
    const params = await context.params;
    const { id } = params;
    
    logger.debug(`[DELETE /api/v2/notifications/${id}] Deleting notification for user ${user.id}`);

    // Verificar se a notificação existe e pertence ao usuário
    const existingNotification = await prisma.notifications.findFirst({
      where: {
        id,
        user_id: user.id,
      },
    });

    if (!existingNotification) {
      logger.warn(`[DELETE /api/v2/notifications/${id}] Notification not found or access denied`);
      return NextResponse.json({
        success: false,
        error: 'Notification not found'
      }, { status: 404 });
    }

    // Deletar a notificação
    await prisma.notifications.delete({
      where: { id },
    });

    logger.info(`[DELETE /api/v2/notifications/${id}] Notification deleted successfully`);

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    logger.error(`[DELETE /api/v2/notifications/[id]] Error deleting notification`, { error });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
});

