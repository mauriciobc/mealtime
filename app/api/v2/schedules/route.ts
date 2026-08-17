import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError, handleAuthError, handleValidationError } from '@/lib/utils/api-error-handling';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';
import { requireCatAccess, requireHouseholdMember } from '@/lib/authz/household-access';

// GET /api/v2/schedules - Listar agendamentos for a specific household
export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug(`[GET /api/v2/schedules] Request from user: ${user.id}`);

    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json({
        success: false,
        error: 'Household ID is required'
      }, { status: 400 });
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
    
    return NextResponse.json({
      success: true,
      data: mappedSchedules,
      count: mappedSchedules.length
    });
  } catch (error) {
    logger.error('[GET /api/v2/schedules] Error', { error });
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch schedules',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
});

// POST /api/v2/schedules - Criar um novo agendamento
export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug(`[POST /api/v2/schedules] Request from user: ${user.id}`);

    const body = await request.json();
    const {
      catId,
      type,
      interval,
      times,
      enabled,
    } = body;

    if (!catId || !type) {
      return NextResponse.json({
        success: false,
        error: 'Cat ID and schedule type are required'
      }, { status: 400 });
    }
    
    const catAccess = await requireCatAccess(user.id, catId);
    if (!catAccess.ok) return catAccess.response;
    const cat = catAccess.data.cat;

    // Validate schedule type
    if (type !== 'interval' && type !== 'fixedTime') {
      return NextResponse.json({
        success: false,
        error: 'Invalid schedule type'
      }, { status: 400 });
    }

    // Validate type-specific data
    if (type === 'interval' && (!interval || interval <= 0)) {
      return NextResponse.json({
        success: false,
        error: 'Interval must be greater than zero'
      }, { status: 400 });
    }
    
    if (type === 'fixedTime' && (!Array.isArray(times) || times.length === 0)) {
      return NextResponse.json({
        success: false,
        error: 'Times array is required for fixed time schedules'
      }, { status: 400 });
    }

    // Validate each time entry format for fixedTime schedules
    if (type === 'fixedTime') {
      const timeFormatRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      const invalidTimes: string[] = [];

      times.forEach((time: unknown, index: number) => {
        if (typeof time !== 'string') {
          invalidTimes.push(`Entry at index ${index} is not a string: ${JSON.stringify(time)}`);
        } else if (!timeFormatRegex.test(time)) {
          invalidTimes.push(`"${time}" (invalid format, expected HH:MM)`);
        }
      });

      if (invalidTimes.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Invalid time format detected',
          details: `The following times are invalid: ${invalidTimes.join(', ')}. Times must be in HH:MM 24-hour format (e.g., "08:30", "14:00", "23:59").`
        }, { status: 400 });
      }
    }

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

    return NextResponse.json({
      success: true,
      data: schedule
    }, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/v2/schedules] Error', { error });
    return NextResponse.json({
      success: false,
      error: 'Failed to create schedule',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
});

