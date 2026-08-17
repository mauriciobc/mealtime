import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateNextFeedingTime } from '@/lib/utils/dateUtils';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';
import { requireCatAccess } from '@/lib/authz/household-access';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';

export const dynamic = 'force-dynamic';

export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ catId: string }> }
) => {
  // Extrair catId do context
  if (!context?.params) {
    logger.error('[GET /api/v2/cats/[catId]/next-feeding] Missing context.params');
    return v2Err('Internal routing error: missing route parameters', 500);
  }
  
  const params = await context.params;
  const catId = params.catId;

  if (typeof catId !== 'string' || !catId) {
    logger.error('[GET /api/v2/cats/[catId]/next-feeding] Invalid or missing catId parameter', { catId });
    return v2Err('Invalid cat ID', 400);
  }

  logger.debug(`[GET /api/v2/cats/${catId}/next-feeding] Request from user ${user.id}`);

  try {
    const catAccess = await requireCatAccess(user.id, catId);
    if (!catAccess.ok) return catAccess.response;
    
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
    return v2Ok({
        nextFeeding: nextFeedingDate ? nextFeedingDate.toISOString() : null,
        catId: catId,
        hasSchedules: schedules.length > 0,
        lastFeedingTime: lastFeedingLog?.fed_at?.toISOString() || null
      });

  } catch (error) {
    logger.error(`[GET /api/v2/cats/${catId}/next-feeding] Error`, { error });
    return v2Err('Failed to calculate next feeding time', 500, (error instanceof Error) ? error.message : 'Unknown error');
  }
});

