import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateNextFeedingTime } from '@/lib/utils/dateUtils';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

export const dynamic = 'force-dynamic';

export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ catId: string }> }
) => {
  // Extrair catId do context ou da URL
  const params = context ? await context.params : null;
  const catId = params?.catId || request.nextUrl.pathname.split('/').filter(Boolean)[3];

  if (typeof catId !== 'string' || !catId) {
    logger.error('[GET /api/v2/cats/[catId]/next-feeding] Invalid or missing catId parameter', { catId });
    return NextResponse.json({
      success: false,
      error: 'Invalid cat ID'
    }, { status: 400 });
  }

  logger.debug(`[GET /api/v2/cats/${catId}/next-feeding] Request from user ${user.id}`);

  try {
    // 1. Fetch Cat and Verify Ownership/Household Access
    logger.debug(`[GET /api/v2/cats/${catId}/next-feeding] Fetching cat and verifying access...`);
    const cat = await prisma.cats.findUnique({
      where: { id: catId },
      select: {
        household_id: true,
      }
    });

    if (!cat) {
      logger.warn(`[GET /api/v2/cats/${catId}/next-feeding] Cat not found`);
      return NextResponse.json({
        success: false,
        error: 'Cat not found'
      }, { status: 404 });
    }

    const householdId = cat.household_id;
    if (!householdId) {
      logger.error(`[GET /api/v2/cats/${catId}/next-feeding] Cat ${catId} has no household ID`);
      return NextResponse.json({
        success: false,
        error: 'Cat not linked to a household'
      }, { status: 500 });
    }

    const userAccess = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: householdId
      }
    });

    if (!userAccess) {
      logger.warn(`[GET /api/v2/cats/${catId}/next-feeding] User ${user.id} not member of household ${householdId}`);
      return NextResponse.json({
        success: false,
        error: 'Access denied to this cat\'s household'
      }, { status: 403 });
    }
    
    logger.info(`[GET /api/v2/cats/${catId}/next-feeding] Access verified for user ${user.id}`);

    // 2. Fetch Required Data for Calculation
    logger.debug(`[GET /api/v2/cats/${catId}/next-feeding] Fetching schedules and last feeding log...`);
    const [rawSchedules, lastFeedingLog] = await Promise.all([
      prisma.schedules.findMany({
        where: {
          cat_id: catId,
          enabled: true
        },
        select: { type: true, interval: true, times: true }
      }),
      prisma.feeding_logs.findFirst({
        where: { cat_id: catId },
        orderBy: { fed_at: 'desc' },
        select: { fed_at: true }
      })
    ]);
    
    // Map schedules to required type for calculateNextFeedingTime
    const schedules = rawSchedules.map(sch => ({
      type: sch.type,
      interval: sch.interval,
      times: Array.isArray(sch.times) ? sch.times.join(',') : sch.times,
      enabled: true
    }));
    
    logger.debug(`[GET /api/v2/cats/${catId}/next-feeding] Found ${schedules.length} enabled schedules`);
    logger.debug(`[GET /api/v2/cats/${catId}/next-feeding] Last feeding time: ${lastFeedingLog?.fed_at}`);

    // 3. Calculate Next Feeding Time
    const nextFeedingDate = calculateNextFeedingTime(schedules, lastFeedingLog?.fed_at ?? null);

    if (nextFeedingDate) {
      logger.info(`[GET /api/v2/cats/${catId}/next-feeding] Calculated next feeding time: ${nextFeedingDate.toISOString()}`);
    } else {
      logger.debug(`[GET /api/v2/cats/${catId}/next-feeding] No upcoming feeding could be calculated`);
    }

    // 4. Return Result
    return NextResponse.json({
      success: true,
      data: {
        nextFeeding: nextFeedingDate ? nextFeedingDate.toISOString() : null,
        catId: catId,
        hasSchedules: schedules.length > 0,
        lastFeedingTime: lastFeedingLog?.fed_at?.toISOString() || null
      }
    });

  } catch (error) {
    logger.error(`[GET /api/v2/cats/${catId}/next-feeding] Error`, { error });
    return NextResponse.json({
      success: false,
      error: 'Failed to calculate next feeding time',
      details: (error instanceof Error) ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

