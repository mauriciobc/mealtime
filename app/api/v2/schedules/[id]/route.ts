import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError, handleValidationError } from '@/lib/utils/api-error-handling';
import { createNotification } from '@/lib/services/notificationService';
import { buildScheduleUpdateNotification } from '@/lib/notifications/event-payloads';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';
import { requireHouseholdMember } from '@/lib/authz/household-access';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';

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
      return v2Err('Invalid ID', 400);
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
      return v2Err('Schedule not found', 404);
    }

    const access = await requireHouseholdMember(user.id, schedule.cat.household_id);
    if (!access.ok) return access.response;

    return v2Ok(schedule);
  } catch (error) {
    // Log full error details server-side for debugging (including stack trace)
    logger.error('[GET /api/v2/schedules/[id]] Error', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.id 
    });
    
    // Return generic error message to client (no internal details)
    return v2Err('Failed to fetch schedule', 500);
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
      return v2Err('Invalid ID', 400);
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
      return v2Err('Schedule not found', 404);
    }

    const patchAccess = await requireHouseholdMember(user.id, existingSchedule.cat.household_id);
    if (!patchAccess.ok) return patchAccess.response;

    // Validate schedule type if provided
    if (type && type !== 'interval' && type !== 'fixedTime') {
      return v2Err('Invalid schedule type', 400);
    }

    // Determine the effective type (new type or existing type)
    const effectiveType = type ?? existingSchedule.type;

    // Validate type-specific data against the effective type
    if (effectiveType === 'interval' && interval !== undefined && interval <= 0) {
      return v2Err('Interval must be greater than zero', 400);
    }

    if (effectiveType === 'fixedTime' && times !== undefined) {
      const trimmedTimes = typeof times === 'string' ? times.trim() : '';
      if (trimmedTimes === '') {
        return v2Err('Times are required for fixed time schedules', 400);
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
      await createNotification(
        buildScheduleUpdateNotification({
          catId: existingSchedule.cat.id,
          catName: existingSchedule.cat.name,
          scheduleId: id,
          updatedFields,
        })
      );
    } catch (notifyError) {
      logger.error('[PATCH /api/v2/schedules/[id]] Failed to create schedule update notification', { notifyError });
    }

    logger.info(`[PATCH /api/v2/schedules/${id}] Schedule updated successfully`);

    return v2Ok(schedule);
  } catch (error) {
    // Log full error details server-side for debugging (including stack trace)
    logger.error('[PATCH /api/v2/schedules/[id]] Error', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.id 
    });
    
    // Return generic error message to client (no internal details)
    return v2Err('Failed to update schedule', 500);
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
      return v2Err('Invalid ID', 400);
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
      return v2Err('Schedule not found', 404);
    }

    const deleteAccess = await requireHouseholdMember(user.id, existingSchedule.cat.household_id);
    if (!deleteAccess.ok) return deleteAccess.response;

    // Delete schedule
    await prisma.schedules.delete({
      where: { id }
    });

    logger.info(`[DELETE /api/v2/schedules/${id}] Schedule deleted successfully`);

    return v2Ok({ message: 'Schedule deleted successfully' });
  } catch (error) {
    // Log full error details server-side for debugging (including stack trace)
    logger.error('[DELETE /api/v2/schedules/[id]] Error', { 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.id 
    });
    
    // Return generic error message to client (no internal details)
    return v2Err('Failed to delete schedule', 500);
  }
});

