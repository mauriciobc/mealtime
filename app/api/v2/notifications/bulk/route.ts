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

// Schema de validação para operações em lote
const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  action: z.enum(['mark_as_read', 'mark_all_as_read']),
});

/**
 * PATCH /api/v2/notifications/bulk - Operações em lote em notificações
 * 
 * Ações suportadas:
 * - mark_as_read: Marcar notificações específicas como lidas (requer array de IDs)
 * - mark_all_as_read: Marcar todas as notificações do usuário como lidas
 */
export const PATCH = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    const body = await request.json();
    logger.debug("[PATCH /api/v2/notifications/bulk] Received body:", body);

    // Validar o corpo da requisição
    const validationResult = bulkUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error("[PATCH /api/v2/notifications/bulk] Invalid body", { 
        errors: validationResult.error.format() 
      });
      return NextResponse.json({
        success: false,
        error: "Invalid request data",
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const { ids, action } = validationResult.data;

    let updatedCount = 0;

    if (action === 'mark_as_read') {
      // Marcar notificações específicas como lidas
      if (!ids || ids.length === 0) {
        logger.error("[PATCH /api/v2/notifications/bulk] Missing ids for mark_as_read action");
        return NextResponse.json({
          success: false,
          error: "IDs are required for mark_as_read action"
        }, { status: 400 });
      }

      logger.debug(`[PATCH /api/v2/notifications/bulk] Marking ${ids.length} notifications as read for user ${user.id}`);

      const result = await prisma.notifications.updateMany({
        where: {
          id: { in: ids },
          user_id: user.id,
        },
        data: {
          is_read: true,
          updated_at: new Date(),
        },
      });

      updatedCount = result.count;
      logger.info(`[PATCH /api/v2/notifications/bulk] Marked ${updatedCount} notifications as read`);

    } else if (action === 'mark_all_as_read') {
      // Marcar todas as notificações não lidas como lidas
      logger.debug(`[PATCH /api/v2/notifications/bulk] Marking all notifications as read for user ${user.id}`);

      const result = await prisma.notifications.updateMany({
        where: {
          user_id: user.id,
          is_read: false,
        },
        data: {
          is_read: true,
          updated_at: new Date(),
        },
      });

      updatedCount = result.count;
      logger.info(`[PATCH /api/v2/notifications/bulk] Marked all ${updatedCount} notifications as read`);
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedCount,
        action,
      },
      message: `Successfully ${action === 'mark_all_as_read' ? 'marked all notifications' : `marked ${updatedCount} notification(s)`} as read`
    });

  } catch (error) {
    logger.error("[PATCH /api/v2/notifications/bulk] Error in bulk operation", { error });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
});

/**
 * DELETE /api/v2/notifications/bulk - Deletar múltiplas notificações
 */
export const DELETE = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    const body = await request.json();
    logger.debug("[DELETE /api/v2/notifications/bulk] Received body:", body);

    const deleteSchema = z.object({
      ids: z.array(z.string().uuid()).min(1).max(100),
    });

    // Validar o corpo da requisição
    const validationResult = deleteSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error("[DELETE /api/v2/notifications/bulk] Invalid body", { 
        errors: validationResult.error.format() 
      });
      return NextResponse.json({
        success: false,
        error: "Invalid request data",
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const { ids } = validationResult.data;

    logger.debug(`[DELETE /api/v2/notifications/bulk] Deleting ${ids.length} notifications for user ${user.id}`);

    const result = await prisma.notifications.deleteMany({
      where: {
        id: { in: ids },
        user_id: user.id,
      },
    });

    logger.info(`[DELETE /api/v2/notifications/bulk] Deleted ${result.count} notifications`);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.count,
      },
      message: `Successfully deleted ${result.count} notification(s)`
    });

  } catch (error) {
    logger.error("[DELETE /api/v2/notifications/bulk] Error in bulk delete", { error });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
});

