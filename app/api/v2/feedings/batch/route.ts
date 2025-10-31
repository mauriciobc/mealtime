import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

/**
 * Helper function to report errors to monitoring/alerting services
 * Currently logs to console with detailed context, but can be extended
 * to integrate with Sentry, Datadog, or other monitoring services.
 */
function reportSchedulingError(
  error: unknown,
  context: {
    catId: string;
    catName: string;
    feedingId: string;
    reminderCount: number;
    userId: string;
    householdId: string;
  }
) {
  const errorDetails = {
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : String(error),
    context,
    timestamp: new Date().toISOString(),
    severity: 'warning' as const
  };

  // Log with detailed context for debugging
  logger.error('[POST /api/v2/feedings/batch] Scheduling notification failed', errorDetails);

  // TODO: Integrate with external monitoring services
  // Example for Sentry:
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, {
  //     tags: { component: 'notification-scheduling' },
  //     extra: context
  //   });
  // }
  
  // Example for Datadog:
  // if (process.env.DATADOG_API_KEY) {
  //   datadogLogger.error('Notification scheduling failed', errorDetails);
  // }
}

// Explicitly set runtime to Node.js
export const runtime = 'nodejs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Schema matching frontend payload and database requirements
const FeedingBatchSchema = z.object({
  catId: z.string().uuid({ message: "Invalid cat ID format" }),
  portionSize: z.number().min(0),
  timestamp: z.string().datetime(),
  notes: z.string().optional(),
  status: z.enum(["Normal", "Comeu Pouco", "Recusou", "Vomitou", "Outro"]).optional(),
  mealType: z.enum(["dry", "wet", "treat", "medicine", "water", "manual", "scheduled", "automatic"]).default("manual"),
  unit: z.enum(['g', 'ml', 'cups', 'oz']).default('g'),
  tempId: z.string().optional(), // Identificador temporário para lookup do status
});

const BatchPayloadSchema = z.object({
  logs: z.array(FeedingBatchSchema).min(1, { message: "At least one feeding log is required" })
});

// POST /api/v2/feedings/batch - Create multiple feeding logs
export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    const body = await request.json();
    logger.debug('[POST /api/v2/feedings/batch] Received batch request', {
      userId: user.id,
      logsCount: body.logs?.length
    });
    
    // Validate request body against schema
    const validationResult = BatchPayloadSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('[POST /api/v2/feedings/batch] Invalid request data', {
        validationError: validationResult.error.format()
      });
      return NextResponse.json({
        success: false,
        error: "Invalid request data",
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const { logs } = validationResult.data;

    // Get user's household ID
    logger.debug(`[POST /api/v2/feedings/batch] Getting household for user ${user.id}`);
    const userHousehold = await prisma.household_members.findFirst({
      where: {
        user_id: user.id
      },
      select: {
        household_id: true
      }
    });

    if (!userHousehold) {
      logger.warn(`[POST /api/v2/feedings/batch] User ${user.id} not associated with any household`);
      return NextResponse.json({
        success: false,
        error: "User not associated with any household"
      }, { status: 403 });
    }

    // Verify user has access to all cats through their household
    const catIds = [...new Set(logs.map(f => f.catId))];
    logger.debug(`[POST /api/v2/feedings/batch] Verifying access to cats:`, { catIds });
    
    const accessibleCats = await prisma.cats.findMany({
      where: {
        id: { in: catIds },
        household_id: userHousehold.household_id
      },
      select: { 
        id: true,
        name: true,
        feeding_interval: true,
        household_id: true
      }
    });

    const accessibleCatIds = new Set(accessibleCats.map(c => c.id));
    const unauthorizedCats = catIds.filter(id => !accessibleCatIds.has(id));

    if (unauthorizedCats.length > 0) {
      logger.warn(`[POST /api/v2/feedings/batch] Unauthorized access to cats`, { unauthorizedCats });
      return NextResponse.json({
        success: false,
        error: `Unauthorized access to cats: ${unauthorizedCats.join(", ")}`
      }, { status: 403 });
    }

    // Create a map of cat info for later use
    const catInfoMap = new Map(accessibleCats.map(cat => [cat.id, cat]));

    // Create all feeding logs in a transaction
    logger.debug(`[POST /api/v2/feedings/batch] Creating ${logs.length} feeding logs`);
    const createdFeedings = await prisma.$transaction(
      logs.map(log => 
        prisma.feeding_logs.create({
          data: {
            cat_id: log.catId,
            household_id: userHousehold.household_id,
            meal_type: log.mealType,
            amount: new Prisma.Decimal(log.portionSize),
            unit: log.unit,
            notes: log.notes ?? null,
            fed_by: user.id,
            fed_at: new Date(log.timestamp),
            // Include status only when provided (null/undefined-safe)
            ...(log.status !== undefined && log.status !== null && { status: log.status })
          }
        })
      )
    );

    logger.info(`[POST /api/v2/feedings/batch] Created ${createdFeedings.length} feeding logs`);

    // Fetch household members once (excluding the user who fed)
    const householdMembers = await prisma.household_members.findMany({
      where: {
        household_id: userHousehold.household_id,
        user_id: { not: user.id }
      },
      select: { user_id: true }
    });
    
    const reminderMemberIds = householdMembers.map(member => member.user_id);

    // Track scheduling warnings to include in response
    const schedulingWarnings: string[] = [];

    // Scheduled notification logic for each feeding
    for (const feeding of createdFeedings) {
      const cat = catInfoMap.get(feeding.cat_id);

      if (!cat || !cat.feeding_interval || cat.feeding_interval <= 0) {
        logger.debug(`[POST /api/v2/feedings/batch] Skipping scheduling for cat ${feeding.cat_id} (no interval)`);
        continue;
      }

      if (reminderMemberIds.length === 0) {
        logger.debug(`[POST /api/v2/feedings/batch] No reminder members for cat ${feeding.cat_id}`);
        continue;
      }

      const reminderTime = new Date(new Date(feeding.fed_at).getTime() + cat.feeding_interval * 60 * 60 * 1000);
      const reminderNotifications = reminderMemberIds.map(userId => ({
        id: crypto.randomUUID(),
        userId: userId,
        catId: cat.id,
        type: "reminder",
        title: "Lembrete de alimentação",
        message: `Está na hora de alimentar o gato ${cat.name}.`,
        deliverAt: reminderTime,
        delivered: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      if (reminderNotifications.length > 0) {
        try {
          await prisma.scheduledNotification.createMany({ data: reminderNotifications });
          logger.debug(`[POST /api/v2/feedings/batch] Scheduled ${reminderNotifications.length} reminder notifications for cat ${cat.id}`);
        } catch (err) {
          // Report error to monitoring/alerting with detailed context
          reportSchedulingError(err, {
            catId: cat.id,
            catName: cat.name,
            feedingId: feeding.id,
            reminderCount: reminderNotifications.length,
            userId: user.id,
            householdId: cat.household_id
          });

          // Add warning to response payload
          schedulingWarnings.push(
            `Falha ao agendar ${reminderNotifications.length} lembrete(s) para o gato ${cat.name}. Os lembretes podem não ser enviados.`
          );
        }
      }
    }

    // Map created logs to include original tempId
    const logsWithTempId = createdFeedings.map((feeding, index) => ({
      ...feeding,
      tempId: logs[index]?.tempId
    }));

    // Build response payload with optional warnings
    const responsePayload: {
      success: boolean;
      data: {
        count: number;
        logs: typeof logsWithTempId;
      };
      warnings?: string[];
    } = {
      success: true,
      data: {
        count: createdFeedings.length,
        logs: logsWithTempId
      }
    };

    // Include warnings if any scheduling failures occurred
    if (schedulingWarnings.length > 0) {
      responsePayload.warnings = schedulingWarnings;
      logger.warn(`[POST /api/v2/feedings/batch] Response includes ${schedulingWarnings.length} scheduling warning(s)`, {
        warnings: schedulingWarnings,
        userId: user.id
      });
    }

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/v2/feedings/batch] Error creating batch feeding logs', { error });
    return NextResponse.json({
      success: false,
      error: 'Failed to create feeding logs',
      ...(process.env.NODE_ENV !== 'production' && {
        details: (error instanceof Error) ? error.message : 'Unknown error'
      })
    }, { status: 500 });
  }
});

