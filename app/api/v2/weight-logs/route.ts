import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

// Zod schema for request body validation
const CreateWeightLogBodySchema = z.object({
  catId: z.string().uuid(),
  weight: z.number().positive(),
  date: z.string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, { message: "Date must be in YYYY-MM-DD format." })
    .refine((dateStr) => {
      // Parse the date components
      // The regex already ensures the format is YYYY-MM-DD, so we can safely assert non-null
      const [yearStr, monthStr, dayStr] = dateStr.split('-');
      const year = parseInt(yearStr!, 10);
      const month = parseInt(monthStr!, 10);
      const day = parseInt(dayStr!, 10);
      
      // Create a UTC date to avoid timezone issues
      const date = new Date(Date.UTC(year, month - 1, day));
      
      // Check if the date is valid and matches the input components
      // This catches invalid dates like 2024-02-30, 2024-13-01, etc.
      return (
        !isNaN(date.getTime()) &&
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    }, { message: "Invalid calendar date" }),
  notes: z.string().optional(),
});

// Zod schema for request body validation for PUT requests
const UpdateWeightLogBodySchema = CreateWeightLogBodySchema.extend({});

export type CreateWeightLogBody = z.infer<typeof CreateWeightLogBodySchema>;
export type UpdateWeightLogBody = z.infer<typeof UpdateWeightLogBodySchema>;

async function createWeightLogAndUpdateCat(data: CreateWeightLogBody, measuredById: string) {
  const { catId, weight, date, notes } = data;
  const logDate = new Date(date);

  return prisma.$transaction(async (tx) => {
    const newLog = await tx.cat_weight_logs.create({
      data: {
        cat_id: catId,
        weight: weight,
        date: logDate,
        notes: notes ?? null,
        measured_by: measuredById,
      },
    });

    const latestLogForCat = await tx.cat_weight_logs.findFirst({
      where: { cat_id: catId },
      orderBy: { date: 'desc' },
    });

    if (latestLogForCat && latestLogForCat.id === newLog.id) {
      await tx.cats.update({
        where: { id: catId },
        data: { weight: newLog.weight },
      });
    }
    
    return newLog;
  });
}

async function syncCatWeightWithLatestLog(tx: Prisma.TransactionClient, catId: string) {
  const latestLog = await tx.cat_weight_logs.findFirst({
    where: { cat_id: catId },
    orderBy: { date: 'desc' },
  });

  await tx.cats.update({
    where: { id: catId },
    data: { weight: latestLog ? latestLog.weight : null },
  });
}

// POST handler for creating a new weight log
export const POST = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug('[POST /api/v2/weight-logs] Request from user', { userId: user.id });

    const json = await request.json();
    const validatedBody = CreateWeightLogBodySchema.safeParse(json);

    if (!validatedBody.success) {
      logger.warn('[POST /api/v2/weight-logs] Invalid request body', { error: validatedBody.error.format() });
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: validatedBody.error.format()
      }, { status: 400 });
    }

    // Verify user has access to the cat
    const cat = await prisma.cats.findUnique({
      where: { id: validatedBody.data.catId },
      select: { household_id: true }
    });

    if (!cat) {
      return NextResponse.json({
        success: false,
        error: 'Cat not found'
      }, { status: 404 });
    }

    // Deny access if household IDs don't match (no admin bypass currently implemented)
    // TODO: Add admin role check when MobileAuthUser includes role information
    if (cat.household_id !== user.household_id) {
      logger.warn(`[POST /api/v2/weight-logs] User ${user.id} not authorized for cat ${validatedBody.data.catId}`);
      return NextResponse.json({
        success: false,
        error: 'Access denied to this cat'
      }, { status: 403 });
    }

    const result = await createWeightLogAndUpdateCat(validatedBody.data, user.id);
    
    logger.info('[POST /api/v2/weight-logs] Weight log created:', { logId: result.id, catId: validatedBody.data.catId });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 201 });

  } catch (error) {
    logger.error('[POST /api/v2/weight-logs] Error', { error });
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: error.format()
      }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
});

// GET handler for fetching weight logs for a cat
export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug('[GET /api/v2/weight-logs] Request from user', { userId: user.id });

    const { searchParams } = new URL(request.url);
    const catId = searchParams.get('catId');

    if (!catId || typeof catId !== 'string' || !z.string().uuid().safeParse(catId).success) {
      return NextResponse.json({
        success: false,
        error: 'Valid catId query parameter is required'
      }, { status: 400 });
    }

    // Verify user has access to the cat
    const cat = await prisma.cats.findUnique({
      where: { id: catId },
      select: { household_id: true }
    });

    if (!cat) {
      return NextResponse.json({
        success: false,
        error: 'Cat not found'
      }, { status: 404 });
    }

    // Deny access if household IDs don't match (no admin bypass currently implemented)
    // TODO: Add admin role check when MobileAuthUser includes role information
    if (cat.household_id !== user.household_id) {
      logger.warn(`[GET /api/v2/weight-logs] User ${user.id} not authorized for cat ${catId}`);
      return NextResponse.json({
        success: false,
        error: 'Access denied to this cat'
      }, { status: 403 });
    }

    const weightLogs = await prisma.cat_weight_logs.findMany({
      where: {
        cat_id: catId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    logger.info(`[GET /api/v2/weight-logs] Retrieved ${weightLogs.length} logs for cat ${catId}`);

    return NextResponse.json({
      success: true,
      data: weightLogs,
      count: weightLogs.length
    });

  } catch (error) {
    logger.error('[GET /api/v2/weight-logs] Error', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
});

// PUT handler for updating an existing weight log
export const PUT = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug('[PUT /api/v2/weight-logs] Request from user', { userId: user.id });

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');
    
    if (!logId || !z.string().uuid().safeParse(logId).success) {
      return NextResponse.json({
        success: false,
        error: 'Valid log ID query parameter is required'
      }, { status: 400 });
    }

    const json = await request.json();
    const validatedBody = UpdateWeightLogBodySchema.safeParse(json);
    
    if (!validatedBody.success) {
      logger.warn('[PUT /api/v2/weight-logs] Invalid request body', { error: validatedBody.error.format() });
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: validatedBody.error.format()
      }, { status: 400 });
    }

    const { catId, weight, date, notes } = validatedBody.data;
    const logDate = new Date(date);

    // Verify user has access to the cat
    const catToUpdate = await prisma.cats.findUnique({
      where: { id: catId },
      select: { household_id: true }
    });

    if (!catToUpdate) {
      return NextResponse.json({
        success: false,
        error: 'Cat not found'
      }, { status: 404 });
    }

    // Deny access if household IDs don't match (no admin bypass currently implemented)
    // TODO: Add admin role check when MobileAuthUser includes role information
    if (catToUpdate.household_id !== user.household_id) {
      logger.warn(`[PUT /api/v2/weight-logs] User ${user.id} not authorized for cat ${catId}`);
      return NextResponse.json({
        success: false,
        error: 'Forbidden: You do not have access to this cat'
      }, { status: 403 });
    }
    
    // Verify the log belongs to the specified cat
    const existingLog = await prisma.cat_weight_logs.findUnique({
      where: { id: logId },
      select: { cat_id: true }
    });

    if (!existingLog) {
      return NextResponse.json({
        success: false,
        error: 'Log not found'
      }, { status: 404 });
    }
    
    if (existingLog.cat_id !== catId) {
      return NextResponse.json({
        success: false,
        error: 'Forbidden: Cannot change the cat associated with this log'
      }, { status: 403 });
    }

    const updatedLog = await prisma.$transaction(async (tx) => {
      const log = await tx.cat_weight_logs.update({
        where: { id: logId },
        data: {
          weight: weight,
          date: logDate,
          notes: notes ?? null,
          measured_by: user.id,
        },
      });

      await syncCatWeightWithLatestLog(tx, catId);

      return log;
    });

    logger.info('[PUT /api/v2/weight-logs] Weight log updated:', { logId, catId });

    return NextResponse.json({
      success: true,
      data: updatedLog
    });

  } catch (error) {
    logger.error('[PUT /api/v2/weight-logs] Error', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
});

// DELETE handler for deleting a weight log
export const DELETE = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug('[DELETE /api/v2/weight-logs] Request from user', { userId: user.id });

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');
    
    if (!logId || !z.string().uuid().safeParse(logId).success) {
      return NextResponse.json({
        success: false,
        error: 'Valid log ID query parameter is required'
      }, { status: 400 });
    }

    // Find the log to be deleted to get the catId
    const logToDelete = await prisma.cat_weight_logs.findUnique({
      where: { id: logId },
      select: { cat_id: true }
    });

    if (!logToDelete) {
      return NextResponse.json({
        success: false,
        error: 'Log not found'
      }, { status: 404 });
    }

    const catId = logToDelete.cat_id;

    // Verify user has access to the cat
    const cat = await prisma.cats.findUnique({
      where: { id: catId },
      select: { household_id: true }
    });

    if (!cat) {
      return NextResponse.json({
        success: false,
        error: 'Cat not found'
      }, { status: 404 });
    }

    // Deny access if household IDs don't match (no admin bypass currently implemented)
    // TODO: Add admin role check when MobileAuthUser includes role information
    if (cat.household_id !== user.household_id) {
      logger.warn(`[DELETE /api/v2/weight-logs] User ${user.id} not authorized for cat ${catId}`);
      return NextResponse.json({
        success: false,
        error: 'Forbidden: You do not have access to this cat'
      }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.cat_weight_logs.delete({
        where: { id: logId },
      });

      await syncCatWeightWithLatestLog(tx, catId);
    });

    logger.info('[DELETE /api/v2/weight-logs] Weight log deleted:', { logId, catId });

    return NextResponse.json({
      success: true,
      message: 'Weight log deleted successfully'
    });

  } catch (error) {
    logger.error('[DELETE /api/v2/weight-logs] Error', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
});

