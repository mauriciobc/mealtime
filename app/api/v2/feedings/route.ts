import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from "zod";
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { isDuplicateFeeding } from '@/lib/services/feeding-notification-service';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

// Explicitly set runtime to Node.js
export const runtime = 'nodejs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Schema de validação
const createFeedingSchema = z.object({
  catId: z.string().uuid({ message: "Invalid cat ID format" }),
  amount: z.union([z.number().positive(), z.null()]).optional(),
  notes: z.string().max(255).optional(),
  meal_type: z.enum(['manual', 'scheduled', 'automatic']).default('manual'),
  unit: z.enum(['g', 'ml', 'cups', 'oz']).default('g'),
  food_type: z.string().max(255).optional(),
});

// POST /api/v2/feedings - Criar um novo registro de alimentação
export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    const body = await request.json();
    logger.debug("[POST /api/v2/feedings] Received body:", body);

    // Validate the request body against schema
    const validationResult = createFeedingSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error("[POST /api/v2/feedings] Invalid body", { errors: validationResult.error.format() });
      return NextResponse.json({
        success: false,
        error: "Invalid request data",
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const { catId, amount, notes, meal_type: mealType, unit, food_type } = validationResult.data;

    // Authorization & Validation
    logger.debug(`[POST /api/v2/feedings] Verifying access for user ${user.id} and cat ${catId}`);
    const [cat, userProfile, lastFeedingLog] = await Promise.all([
      prisma.cats.findUnique({
        where: { id: catId },
        select: { id: true, name: true, photo_url: true, household_id: true, feeding_interval: true, portion_size: true }
      }),
      prisma.household_members.findFirst({
        where: { user_id: user.id },
        select: { household_id: true }
      }),
      prisma.feeding_logs.findFirst({
        where: { cat_id: catId },
        orderBy: { fed_at: 'desc' }
      })
    ]);

    const userHouseholdId = userProfile?.household_id;

    if (!cat) {
      logger.warn(`[POST /api/v2/feedings] Cat not found: ${catId}`);
      return NextResponse.json({
        success: false,
        error: 'Cat not found'
      }, { status: 404 });
    }
    if (!userHouseholdId) {
      logger.warn(`[POST /api/v2/feedings] User ${user.id} not associated with any household.`);
      return NextResponse.json({
        success: false,
        error: 'User household not found'
      }, { status: 403 });
    }
    if (cat.household_id !== userHouseholdId) {
      logger.warn(`[POST /api/v2/feedings] Access Denied: Cat ${catId} (household ${cat.household_id}) does not belong to user ${user.id} (household ${userHouseholdId})`);
      return NextResponse.json({
        success: false,
        error: 'Access denied: Cat does not belong to user\'s household'
      }, { status: 403 });
    }
    
    logger.info(`[POST /api/v2/feedings] Access granted for user ${user.id} to cat ${catId} in household ${userHouseholdId}`);

    // Duplicate Feeding Detection
    if (lastFeedingLog && isDuplicateFeeding(new Date(lastFeedingLog.fed_at))) {
      try {
        await prisma.notifications.create({
          data: {
            id: crypto.randomUUID(),
            user_id: user.id, // Recipient: the authenticated user attempting the duplicate feeding
            title: 'Alimentação duplicada',
            message: `O gato ${cat.name} já foi alimentado recentemente.`,
            type: 'warning',
            metadata: {
              catId: cat.id,
              userId: user.id, // Added for consistency with other notifications
              householdId: String(cat.household_id),
              actionUrl: `/cats/${cat.id}`,
              duplicate: true,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      } catch (notifyError) {
        logger.error('[POST /api/v2/feedings] Failed to create duplicate warning notification', { notifyError });
      }
      return NextResponse.json({
        success: false,
        error: 'Tentativa de alimentação duplicada'
      }, { status: 409 });
    }

    // Create the feeding record
    logger.debug(`[POST /api/v2/feedings] Creating feeding log...`);
    const feedingLog = await prisma.feeding_logs.create({
      data: {
        cat_id: catId,
        meal_type: mealType,
        amount: amount != null ? new Prisma.Decimal(amount) : new Prisma.Decimal(0),
        unit: unit,
        notes: notes ?? null,
        food_type: food_type ?? null,
        fed_by: user.id,
        household_id: String(userHouseholdId),
        fed_at: new Date(),
      },
      include: {
        feeder: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true
          }
        }
      }
    });
    logger.info(`[POST /api/v2/feedings] Feeding log created successfully: ${feedingLog.id}`);

    // Event-driven notification: feeding (for the user who registered the feeding)
    try {
      await prisma.notifications.create({
        data: {
          id: crypto.randomUUID(),
          user_id: user.id, // Recipient: the user who registered the feeding
          title: `Alimentação registrada para o gato`,
          message: `O gato foi alimentado com sucesso.`,
          type: 'feeding',
          metadata: {
            catId: catId,
            userId: user.id,
            feedingLogId: feedingLog.id,
            householdId: userHouseholdId,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    } catch (notifyError) {
      logger.error('[POST /api/v2/feedings] Failed to create feeding notification', { notifyError });
    }

    // Notify all other users in the household
    const householdMembers = await prisma.household_members.findMany({
      where: {
        household_id: userHouseholdId,
        user_id: { not: user.id }
      },
      select: { user_id: true }
    });

    const feederProfile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { full_name: true }
    });

    const notificationsData = householdMembers.map(member => ({
      id: crypto.randomUUID(),
      user_id: member.user_id,
      title: "Alimentação registrada",
      message: `Seu gato ${cat.name} foi alimentado por ${feederProfile?.full_name || "alguém"}.`,
      type: "feeding",
      metadata: {
        catId: cat.id,
        catName: cat.name,
        feederId: user.id,
        feederName: feederProfile?.full_name,
        fedAt: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    if (notificationsData.length > 0) {
      await prisma.notifications.createMany({ data: notificationsData });
    }

    // Schedule feeding reminder
    if (cat.feeding_interval && cat.feeding_interval > 0) {
      const reminderTime = new Date(Date.now() + cat.feeding_interval * 60 * 60 * 1000);
      const reminderMembers = householdMembers.map(member => member.user_id);
      logger.debug('[POST /api/v2/feedings] Scheduling reminders for:', { reminderMembers });
      
      const reminderNotifications = reminderMembers.map(userId => ({
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
          const result = await prisma.scheduledNotification.createMany({ data: reminderNotifications });
          logger.debug('[POST /api/v2/feedings] Scheduled notifications created successfully:', result);
        } catch (err) {
          logger.error('[POST /api/v2/feedings] Failed to create scheduled notifications', { err });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: feedingLog
    }, { status: 201 });

  } catch (error) {
    logger.error("[POST /api/v2/feedings] Error creating feeding log", { error });
    return NextResponse.json({
      success: false,
      error: "Failed to create feeding log",
      details: (error instanceof Error) ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

// GET /api/v2/feedings - Obter registros de alimentação
export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  const { searchParams } = new URL(request.url);
  const householdId = searchParams.get('householdId');

  if (!householdId) {
    return NextResponse.json({
      success: false,
      error: 'Household ID is required'
    }, { status: 400 });
  }

  // Verify user access
  try {
    const userAccess = await prisma.household_members.findFirst({
      where: { household_id: householdId, user_id: user.id }
    });
    
    if (!userAccess) {
      return NextResponse.json({
        success: false,
        error: 'Access denied to this household'
      }, { status: 403 });
    }
  } catch (error) {
    logger.error('[GET /api/v2/feedings] Failed to verify household access', { error });
    return NextResponse.json({
      success: false,
      error: 'Failed to verify household access',
      details: (error instanceof Error) ? error.message : 'Unknown error'
    }, { status: 500 });
  }

  // Fetch feedings
  try {
    const feedings = await prisma.feeding_logs.findMany({
      where: { household_id: householdId },
      include: {
        feeder: { select: { id: true, full_name: true, avatar_url: true } },
        cat: { select: { id: true, name: true, photo_url: true } }
      },
      orderBy: { fed_at: 'desc' },
      take: 50
    });
    
    return NextResponse.json({
      success: true,
      data: feedings,
      count: feedings.length
    });
  } catch (error) {
    logger.error("[GET /api/v2/feedings] Error fetching feeding data", { error });
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch feeding data',
      details: (error instanceof Error) ? error.message : 'Unknown database error'
    }, { status: 500 });
  }
});

