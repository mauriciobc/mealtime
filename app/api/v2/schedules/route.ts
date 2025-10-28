import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError, handleAuthError, handleValidationError } from '@/lib/utils/api-error-handling';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

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

    // Authorization Check
    logger.debug(`[GET /api/v2/schedules] Verifying access for user ${user.id} to household ${householdId}`);
    const userAccess = await prisma.household_members.findFirst({
      where: {
        user_id: user.id,
        household_id: householdId,
      },
    });

    if (!userAccess) {
      logger.warn(`[GET /api/v2/schedules] Access denied for user ${user.id} to household ${householdId}`);
      return NextResponse.json({
        success: false,
        error: 'Access denied to this household'
      }, { status: 403 });
    }

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
    logger.error('[GET /api/v2/schedules] Error:', error);
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
    
    // Authorization & Validation
    const [cat, userProfile] = await Promise.all([
      prisma.cats.findUnique({ where: { id: catId }, select: { household_id: true } }),
      prisma.profiles.findUnique({ where: { id: user.id }, select: { household_members: { select: { household_id: true }, take: 1 } } })
    ]);

    const userHouseholdId = userProfile?.household_members[0]?.household_id;

    if (!cat) {
      return NextResponse.json({
        success: false,
        error: 'Cat not found'
      }, { status: 404 });
    }
    
    if (!userHouseholdId) {
      return NextResponse.json({
        success: false,
        error: 'User profile or household not found'
      }, { status: 403 });
    }
    
    if (cat.household_id !== userHouseholdId) {
      logger.warn(`[POST /api/v2/schedules] Access denied: Cat ${catId} not in user ${user.id} household`);
      return NextResponse.json({
        success: false,
        error: 'Access denied: Cat does not belong to user\'s household'
      }, { status: 403 });
    }

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

    // Create the schedule
    logger.debug(`[POST /api/v2/schedules] Creating schedule for cat ${catId} in household ${userHouseholdId}`);
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
    logger.error('[POST /api/v2/schedules] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create schedule',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
});

