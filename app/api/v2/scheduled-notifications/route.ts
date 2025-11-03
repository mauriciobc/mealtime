import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { z } from 'zod';

// Schema de validação para criação de notificação agendada
const createScheduledNotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  scheduledFor: z.string().datetime(),
  catId: z.string().uuid().optional().nullable(),
}).strict();

// GET /api/v2/scheduled-notifications - Listar notificações agendadas
export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  logger.debug('[GET /api/v2/scheduled-notifications] Authenticated user:', { userId: user.id });

  try {
    const { searchParams } = new URL(request.url);
    const delivered = searchParams.get('delivered');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {
      userId: user.id
    };

    if (delivered !== null) {
      where.delivered = delivered === 'true';
    }

    const [notifications, total] = await Promise.all([
      prisma.scheduledNotification.findMany({
        where,
        orderBy: { deliverAt: 'desc' },
        take: Math.min(limit, 100), // Max 100 per page
        skip: offset
      }),
      prisma.scheduledNotification.count({ where })
    ]);

    logger.info('[GET /api/v2/scheduled-notifications] Notifications retrieved:', {
      count: notifications.length,
      total,
      userId: user.id
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + notifications.length < total
        }
      }
    });
  } catch (error: any) {
    logger.logError(error, {
      message: 'Erro ao buscar notificações agendadas',
      requestUrl: request.nextUrl.toString()
    });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao buscar notificações agendadas'
    }, { status: 500 });
  }
});

// POST /api/v2/scheduled-notifications - Criar notificação agendada
export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  logger.debug('[POST /api/v2/scheduled-notifications] Authenticated user:', { userId: user.id });

  try {
    const body = await request.json();
    const validationResult = createScheduledNotificationSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[POST /api/v2/scheduled-notifications] Invalid request body:', {
        errors: validationResult.error.format()
      });
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const { type, title, message, scheduledFor, catId } = validationResult.data;

    const deliverAtDate = new Date(scheduledFor);
    if (isNaN(deliverAtDate.getTime()) || deliverAtDate <= new Date()) {
      logger.warn('[POST /api/v2/scheduled-notifications] Invalid scheduledFor:', { scheduledFor });
      return NextResponse.json({
        success: false,
        error: 'scheduledFor deve ser uma data futura válida em formato ISO-8601 (UTC)'
      }, { status: 400 });
    }

    // Create scheduled notification
    const scheduled = await prisma.scheduledNotification.create({
      data: {
        userId: user.id,
        catId: catId || null,
        type,
        title,
        message,
        deliverAt: deliverAtDate,
      },
    });

    logger.info('[POST /api/v2/scheduled-notifications] Scheduled notification created:', {
      scheduledId: scheduled.id,
      userId: user.id,
      deliverAt: scheduled.deliverAt
    });

    return NextResponse.json({
      success: true,
      data: scheduled
    }, { status: 201 });
  } catch (error: any) {
    logger.logError(error, {
      message: 'Erro ao agendar notificação',
      requestUrl: request.nextUrl.toString()
    });
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
});

