import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';

// Handler interno para processar a entrega de notificações agendadas
// Pode ser chamado com ou sem autenticação de usuário
async function deliverScheduledNotifications(request: NextRequest) {
  logger.debug('[POST /api/v2/scheduled-notifications/deliver] Processing scheduled notifications');

  try {
    const now = new Date();
    
    // 1. Fetch all due, undelivered notifications
    const due = await prisma.scheduledNotification.findMany({
      where: {
        delivered: false,
        deliverAt: { lte: now },
      },
    });

    if (due.length === 0) {
      logger.debug('[POST /api/v2/scheduled-notifications/deliver] No due notifications');
      return NextResponse.json({
        success: true,
        data: {
          delivered: 0,
          notifications: []
        }
      });
    }

    logger.debug('[POST /api/v2/scheduled-notifications/deliver] Found due notifications:', {
      count: due.length
    });

    // 2. Prepare batch for reminders
    const reminderPairs = due
      .filter((n) => n.type === 'reminder' && n.catId && n.deliverAt)
      .map((n) => ({ catId: n.catId!, deliverAt: n.deliverAt! }));

    // 3. Batch fetch all relevant feeding logs (in chunks to avoid oversized queries)
    let fedMap = new Map<string, Date>();
    if (reminderPairs.length > 0) {
      // Split reminderPairs into chunks of 150 items to avoid oversized OR queries
      const CHUNK_SIZE = 150;
      const chunks: Array<Array<{ catId: string; deliverAt: Date }>> = [];
      for (let i = 0; i < reminderPairs.length; i += CHUNK_SIZE) {
        chunks.push(reminderPairs.slice(i, i + CHUNK_SIZE));
      }

      // Execute findMany query for each chunk and aggregate results
      for (const chunk of chunks) {
        const fedLogs = await prisma.feeding_logs.findMany({
          where: {
            OR: chunk.map(({ catId, deliverAt }) => ({
              cat_id: catId,
              fed_at: { gte: deliverAt },
            })),
          },
          select: { cat_id: true, fed_at: true },
        });
        // For each log, mark that this cat has been fed after deliverAt
        for (const log of fedLogs) {
          fedMap.set(log.cat_id, log.fed_at);
        }
      }
    }

    // 4. Filter deliverable notifications
    const deliverable = due.filter((n) => {
      if (n.type === 'reminder' && n.catId && n.deliverAt) {
        // If any feeding log exists for this cat after deliverAt, skip
        return !fedMap.has(n.catId);
      }
      return true;
    });

    logger.debug('[POST /api/v2/scheduled-notifications/deliver] Deliverable notifications:', {
      count: deliverable.length,
      totalDue: due.length
    });

    // 5. Create actual notifications and mark as delivered in a transaction
    const notificationsToCreate = deliverable.map(n => ({
      id: crypto.randomUUID(),
      user_id: n.userId,
      title: n.title,
      message: n.message,
      type: n.type as any,
      metadata: {
        scheduledNotificationId: n.id,
        catId: n.catId
      },
      created_at: now,
      updated_at: now
    }));

    await prisma.$transaction(async (tx) => {
      // Create actual notifications
      if (notificationsToCreate.length > 0) {
        await tx.notifications.createMany({
          data: notificationsToCreate,
          skipDuplicates: true
        });
      }

      // Mark scheduled notifications as delivered
      await tx.scheduledNotification.updateMany({
        where: { id: { in: deliverable.map((n) => n.id) } },
        data: { delivered: true, deliveredAt: now },
      });
    });

    logger.info('[POST /api/v2/scheduled-notifications/deliver] Notifications delivered:', {
      count: deliverable.length
    });

    // --- Missed Feeding Warning Logic (same as V1) ---
    const twentyMinutesMs = 20 * 60 * 1000;
    // Get all cats with feeding_interval set
    const cats = await prisma.cats.findMany({
      where: { feeding_interval: { not: null, gt: 0 } },
      select: { id: true, name: true, household_id: true, feeding_interval: true }
    });

    if (cats.length > 0) {
      // Batch fetch last feeding logs for all cats
      const lastFeedings = await prisma.feeding_logs.findMany({
        where: { cat_id: { in: cats.map(c => c.id) } },
        orderBy: [{ cat_id: 'asc' }, { fed_at: 'desc' }],
        select: { cat_id: true, fed_at: true, fed_by: true },
      });
      
      // Map cat_id to last feeding
      const lastFeedingMap = new Map();
      for (const log of lastFeedings) {
        if (!lastFeedingMap.has(log.cat_id)) {
          lastFeedingMap.set(log.cat_id, log);
        }
      }

      // Prepare warnings to check
      const warningsToCheck = [];
      const nowMs = now.getTime();
      for (const cat of cats) {
        const lastFeeding = lastFeedingMap.get(cat.id);
        if (!lastFeeding) continue;
        if (!cat.feeding_interval) continue;
        const expectedTime = new Date(new Date(lastFeeding.fed_at).getTime() + cat.feeding_interval * 60 * 60 * 1000);
        const warningTime = new Date(expectedTime.getTime() + twentyMinutesMs);
        if (nowMs > warningTime.getTime()) {
          warningsToCheck.push({
            cat,
            lastFeeding,
            expectedTime,
            warningTime
          });
        }
      }

      // Batch fetch all feeding logs after expectedTime for all cats
      const fedAfterLogs = await prisma.feeding_logs.findMany({
        where: {
          OR: warningsToCheck.map(({ cat, expectedTime }) => ({
            cat_id: cat.id,
            fed_at: { gt: expectedTime },
          }))
        },
        select: { cat_id: true, fed_at: true },
      });
      
      const fedAfterMap = new Map();
      for (const log of fedAfterLogs) {
        fedAfterMap.set(log.cat_id, log.fed_at);
      }

      // Prepare notifications to create
      let notifications = [];
      const notificationKeys = [];
      for (const { cat, lastFeeding, expectedTime } of warningsToCheck) {
        if (fedAfterMap.has(cat.id)) continue; // Cat was fed after expectedTime
        const key = `${cat.id}|${expectedTime.toISOString()}`;
        notificationKeys.push(key);
      }

      // Batch fetch existing warnings
      const existingWarnings = await prisma.notifications.findMany({
        where: {
          type: 'warning',
        },
        select: { metadata: true, type: true },
      });
      
      const existingSet = new Set(
        existingWarnings
          .filter(w => typeof w.metadata === 'object' && w.metadata !== null && 'catId' in w.metadata && 'expectedTime' in w.metadata)
          .map(w => `${(w.metadata as any).catId}|${(w.metadata as any).expectedTime}`)
      );

      // Batch fetch all household members for all cats
      const householdIds = Array.from(new Set(cats.map(c => c.household_id)));
      const allMembers = await prisma.household_members.findMany({
        where: { household_id: { in: householdIds } },
        select: { household_id: true, user_id: true },
      });

      // For each warning, create notifications for all household members except last feeder
      for (const { cat, lastFeeding, expectedTime } of warningsToCheck) {
        const key = `${cat.id}|${expectedTime.toISOString()}`;
        if (existingSet.has(key)) continue;
        const members = allMembers.filter(m => m.household_id === cat.household_id && m.user_id !== lastFeeding.fed_by);
        for (const member of members) {
          notifications.push({
            id: crypto.randomUUID(),
            user_id: member.user_id,
            title: "Alimentação não realizada",
            message: `O gato ${cat.name} não foi alimentado no horário previsto.`,
            type: "warning",
            metadata: { catId: cat.id, expectedTime: expectedTime.toISOString() },
            created_at: now,
            updated_at: now
          });
        }
      }

      // Insert notifications in a transaction, ignore duplicates
      if (notifications.length > 0) {
        try {
          await prisma.notifications.createMany({
            data: notifications,
            skipDuplicates: true
          });
          logger.debug('[POST /api/v2/scheduled-notifications/deliver] Missed feeding warnings created:', {
            count: notifications.length
          });
        } catch (e) {
          logger.error('[POST /api/v2/scheduled-notifications/deliver] Error creating missed feeding warnings:', { error: e });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        delivered: deliverable.length,
        notifications: deliverable.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          deliverAt: n.deliverAt
        }))
      }
    });
  } catch (error: any) {
    logger.logError(error, {
      message: 'Erro ao entregar notificações agendadas',
      requestUrl: request.nextUrl.toString()
    });
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// POST /api/v2/scheduled-notifications/deliver - Entregar notificações pendentes
// Aceita chamadas de cron jobs (via X-Cron-Secret) ou usuários autenticados
export const POST = async (request: NextRequest, context?: { params: Promise<any> }) => {
  // Verifica se é uma chamada de cron job
  const cronSecret = request.headers.get('X-Cron-Secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
    // Autenticação via cron secret - permite chamadas sem contexto de usuário
    logger.debug('[POST /api/v2/scheduled-notifications/deliver] Authenticated via X-Cron-Secret');
    return deliverScheduledNotifications(request);
  }

  // Caso contrário, usa autenticação híbrida para usuários autenticados
  const authenticatedHandler = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
    logger.debug('[POST /api/v2/scheduled-notifications/deliver] Authenticated via user auth');
    return deliverScheduledNotifications(request);
  });
  
  const handlerContext = context || { params: Promise.resolve({}) };
  return authenticatedHandler(request, handlerContext);
};

