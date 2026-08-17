import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';
import { requireCatAccess, requireHouseholdMember } from '@/lib/authz/household-access';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';
import { createScheduleSchema } from '@/lib/validations/schedules';

// GET /api/v2/schedules - Listar agendamentos for a specific household
export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug(`[GET /api/v2/schedules] Request from user: ${user.id}`);

    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return v2Err('Household ID is required', 400);
    }

    const access = await requireHouseholdMember(user.id, householdId);
    if (!access.ok) return access.response;

    // Fetch schedules for the specified household
    logger.debug(`[GET /api/v2/schedules] Fetching schedules for household ${householdId}`);
    const schedules = await prisma.schedules.findMany({
      where: {
        cat: {
          household_id: householdId
        }
      },
      include: {
        cat: {
          select: { id: true, name: true, photo_url: true }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    logger.info(`[GET /api/v2/schedules] Found ${schedules.length} schedules for household ${householdId}`);

    // Always include a 'days' property (empty array) for frontend compatibility
    const mappedSchedules = schedules.map(s => ({
      ...s,
      days: [],
    }));
    
    return v2Ok(mappedSchedules);
  } catch (error) {
    logger.error('[GET /api/v2/schedules] Error', { error });
    return v2Err('Failed to fetch schedules', 500, error instanceof Error ? error.message : String(error));
  }
});

// POST /api/v2/schedules - Criar um novo agendamento
export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug(`[POST /api/v2/schedules] Request from user: ${user.id}`);

    const body = await request.json();
    const parsed = createScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return v2Err('Invalid schedule data', 400, parsed.error.flatten());
    }
    const { catId, type, interval, times, enabled } = parsed.data;
    
    const catAccess = await requireCatAccess(user.id, catId);
    if (!catAccess.ok) return catAccess.response;
    const cat = catAccess.data.cat;

    // Create the schedule
    logger.debug(`[POST /api/v2/schedules] Creating schedule for cat ${catId} in household ${cat.household_id}`);
    const schedule = await prisma.schedules.create({
      data: {
        cat_id: catId,
        type: type,
        interval: type === 'interval' ? interval : null,
        times: type === 'fixedTime' ? times : [],
        enabled: enabled ?? true,
      },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photo_url: true
          }
        }
      }
    });
    
    logger.info(`[POST /api/v2/schedules] Schedule created successfully: ${schedule.id}`);

    return v2Ok(schedule, 201);
  } catch (error) {
    logger.error('[POST /api/v2/schedules] Error', { error });
    return v2Err('Failed to create schedule', 500, error instanceof Error ? error.message : String(error));
  }
});

