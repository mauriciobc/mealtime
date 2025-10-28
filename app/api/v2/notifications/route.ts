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

// Schema de validação para criação de notificação
const createNotificationSchema = z.object({
  title: z.string().min(1).max(255, { message: "Title must be between 1 and 255 characters" }),
  message: z.string().min(1).max(1000, { message: "Message must be between 1 and 1000 characters" }),
  type: z.enum(['feeding', 'reminder', 'household', 'system', 'info', 'warning', 'error']),
  isRead: z.boolean().default(false).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Schema de validação para listagem
const listNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  unreadOnly: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
});

/**
 * POST /api/v2/notifications - Criar uma nova notificação
 * 
 * Esta rota cria notificações para o usuário autenticado.
 * Notificações do sistema só podem ser criadas internamente (server-side).
 */
export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    const body = await request.json();
    logger.debug("[POST /api/v2/notifications] Received body:", body);

    // Validar o corpo da requisição
    const validationResult = createNotificationSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error("[POST /api/v2/notifications] Invalid body", { 
        errors: validationResult.error.format() 
      });
      return NextResponse.json({
        success: false,
        error: "Invalid request data",
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const { title, message, type, isRead, metadata } = validationResult.data;

    // Criar a notificação
    logger.debug(`[POST /api/v2/notifications] Creating notification for user ${user.id}`);
    
    const notification = await prisma.notifications.create({
      data: {
        id: crypto.randomUUID(),
        user_id: user.id,
        title,
        message,
        type,
        is_read: isRead ?? false,
        metadata: metadata || {},
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    logger.info(`[POST /api/v2/notifications] Notification created successfully: ${notification.id}`);

    // Normalizar resposta para o formato esperado pelo frontend
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
    }, { status: 201 });

  } catch (error) {
    logger.error("[POST /api/v2/notifications] Error creating notification", { error });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
});

/**
 * GET /api/v2/notifications - Listar notificações do usuário
 * 
 * Query params:
 * - page: número da página (default: 1)
 * - limit: itens por página (default: 10, max: 100)
 * - unreadOnly: 'true' para apenas não lidas (default: false)
 */
export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validar query params
    const validationResult = listNotificationsSchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      unreadOnly: searchParams.get('unreadOnly'),
    });

    if (!validationResult.success) {
      logger.error("[GET /api/v2/notifications] Invalid query params", { 
        errors: validationResult.error.format() 
      });
      return NextResponse.json({
        success: false,
        error: "Invalid query parameters",
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const { page, limit, unreadOnly } = validationResult.data;
    const skip = (page - 1) * limit;

    logger.debug(`[GET /api/v2/notifications] Fetching notifications for user ${user.id}`, {
      page,
      limit,
      unreadOnly,
    });

    // Construir filtros
    const where: any = { user_id: user.id };
    if (unreadOnly) {
      where.is_read = false;
    }

    // Buscar notificações e total em paralelo
    const [notifications, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notifications.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    logger.info(`[GET /api/v2/notifications] Found ${notifications.length} notifications (total: ${total})`);

    // Normalizar notificações para o formato esperado
    const normalizedNotifications = notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
      userId: n.user_id,
      metadata: n.metadata || {},
    }));

    return NextResponse.json({
      success: true,
      data: {
        notifications: normalizedNotifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore,
        }
      }
    });

  } catch (error) {
    logger.error("[GET /api/v2/notifications] Error fetching notifications", { error });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
});

