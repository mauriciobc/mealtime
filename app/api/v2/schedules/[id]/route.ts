import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError, handleValidationError } from '@/lib/utils/api-error-handling';
import { createNotification } from '@/lib/services/notificationService';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

// GET /api/v2/schedules/[id] - Get a specific schedule
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    const params = context ? await context.params : null;
    const id = params?.id || request.nextUrl.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Invalid ID'
      }, { status: 400 });
    }

    logger.debug(`[GET /api/v2/schedules/${id}] Request from user: ${user.id}`);

    const schedule = await prisma.schedules.findUnique({
      where: { id },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            household_id: true
          }
        }
      }
    });

    if (!schedule) {
      return NextResponse.json({
        success: false,
        error: 'Schedule not found'
      }, { status: 404 });
    }

    // Verify user has access to the cat's household
    if (schedule.cat.household_id !== user.household_id) {
      logger.warn(`[GET /api/v2/schedules/${id}] Access denied for user ${user.id}`);
      return NextResponse.json({
        success: false,
        error: 'Access denied to this schedule'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    // Log full error details server-side for debugging (including stack trace)
    logger.error('[GET /api/v2/schedules/[id]] Error', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.id 
    });
    
    // Return generic error message to client (no internal details)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch schedule'
    }, { status: 500 });
  }
});

// PATCH /api/v2/schedules/[id] - Update a schedule
export const PATCH = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    const params = context ? await context.params : null;
    const id = params?.id || request.nextUrl.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Invalid ID'
      }, { status: 400 });
    }

    logger.debug(`[PATCH /api/v2/schedules/${id}] Request from user: ${user.id}`);

    const {
      type,
      interval,
      times,
      overrideUntil
    } = await request.json();

    // Check if schedule exists
    const existingSchedule = await prisma.schedules.findUnique({
      where: { id },
      include: { 
        cat: { 
          select: { 
            id: true, 
            name: true, 
            household_id: true 
          } 
        } 
      }
    });

    if (!existingSchedule) {
      return NextResponse.json({
        success: false,
        error: 'Schedule not found'
      }, { status: 404 });
    }

    // Verify user has access to the cat's household
    if (existingSchedule.cat.household_id !== user.household_id) {
      logger.warn(`[PATCH /api/v2/schedules/${id}] Access denied for user ${user.id}`);
      return NextResponse.json({
        success: false,
        error: 'Access denied to this schedule'
      }, { status: 403 });
    }

    // Validate schedule type if provided
    if (type && type !== 'interval' && type !== 'fixedTime') {
      return NextResponse.json({
        success: false,
        error: 'Invalid schedule type'
      }, { status: 400 });
    }

    // Determine the effective type (new type or existing type)
    const effectiveType = type ?? existingSchedule.type;

    // Validate type-specific data against the effective type
    if (effectiveType === 'interval' && interval !== undefined && interval <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Interval must be greater than zero'
      }, { status: 400 });
    }

    if (effectiveType === 'fixedTime' && times !== undefined) {
      const trimmedTimes = typeof times === 'string' ? times.trim() : '';
      if (trimmedTimes === '') {
        return NextResponse.json({
          success: false,
          error: 'Times are required for fixed time schedules'
        }, { status: 400 });
      }
    }

    // Build update data in a single clear pass
    const updateData: any = {};
    const updatedFields: string[] = [];

    // Include type if provided
    if (type !== undefined) {
      updateData.type = type;
      updatedFields.push('type');
    }

    // Handle interval type: set interval and clear times
    if (effectiveType === 'interval' && interval !== undefined) {
      updateData.interval = interval;
      updateData.times = '';
      updatedFields.push('interval');
    }

    // Handle fixed time type: set times and clear interval
    if (effectiveType === 'fixedTime' && times !== undefined) {
      updateData.times = times;
      updateData.interval = 0;
      updatedFields.push('times');
    }

    // Handle overrideUntil independently
    if (overrideUntil !== undefined) {
      updateData.overrideUntil = overrideUntil ? new Date(overrideUntil) : null;
      updatedFields.push('overrideUntil');
    }

    // Update schedule
    const schedule = await prisma.schedules.update({
      where: { id },
      data: updateData,
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

    // Trigger system notification for schedule update
    try {
      await createNotification({
        title: 'Horário de alimentação atualizado',
        message: `O agendamento do gato ${existingSchedule.cat.name} foi atualizado.`,
        type: 'system',
        metadata: {
          catId: existingSchedule.cat.id,
          scheduleId: id,
          updatedFields,
        },
      });
    } catch (notifyError) {
      logger.error('[PATCH /api/v2/schedules/[id]] Failed to create schedule update notification', { notifyError });
    }

    logger.info(`[PATCH /api/v2/schedules/${id}] Schedule updated successfully`);

    return NextResponse.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    // Log full error details server-side for debugging (including stack trace)
    logger.error('[PATCH /api/v2/schedules/[id]] Error', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.id 
    });
    
    // Return generic error message to client (no internal details)
    return NextResponse.json({
      success: false,
      error: 'Failed to update schedule'
    }, { status: 500 });
  }
});

// DELETE /api/v2/schedules/[id] - Delete a schedule
export const DELETE = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    const params = context ? await context.params : null;
    const id = params?.id || request.nextUrl.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Invalid ID'
      }, { status: 400 });
    }

    logger.debug(`[DELETE /api/v2/schedules/${id}] Request from user: ${user.id}`);

    // Check if schedule exists and verify access
    const existingSchedule = await prisma.schedules.findUnique({
      where: { id },
      include: {
        cat: {
          select: {
            household_id: true
          }
        }
      }
    });

    if (!existingSchedule) {
      return NextResponse.json({
        success: false,
        error: 'Schedule not found'
      }, { status: 404 });
    }

    // Verify user has access to the cat's household
    if (existingSchedule.cat.household_id !== user.household_id) {
      logger.warn(`[DELETE /api/v2/schedules/${id}] Access denied for user ${user.id}`);
      return NextResponse.json({
        success: false,
        error: 'Access denied to this schedule'
      }, { status: 403 });
    }

    // Delete schedule
    await prisma.schedules.delete({
      where: { id }
    });

    logger.info(`[DELETE /api/v2/schedules/${id}] Schedule deleted successfully`);

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    // Log full error details server-side for debugging (including stack trace)
    logger.error('[DELETE /api/v2/schedules/[id]] Error', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.id 
    });
    
    // Return generic error message to client (no internal details)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete schedule'
    }, { status: 500 });
  }
});

