import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';
import { requireCatAccess } from '@/lib/authz/household-access';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';

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
      return v2Err('Invalid request body', 400, validatedBody.error.format());
    }

    const catAccess = await requireCatAccess(user.id, validatedBody.data.catId);
    if (!catAccess.ok) return catAccess.response;

    const result = await createWeightLogAndUpdateCat(validatedBody.data, user.id);
    
    logger.info('[POST /api/v2/weight-logs] Weight log created:', { logId: result.id, catId: validatedBody.data.catId });

    return v2Ok(result, 201);

  } catch (error) {
    logger.error('[POST /api/v2/weight-logs] Error', { error });
    if (error instanceof z.ZodError) {
      return v2Err('Invalid request body', 400, error.format());
    }
    return v2Err('Internal Server Error', 500);
  }
});

// GET handler for fetching weight logs for a cat
export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug('[GET /api/v2/weight-logs] Request from user', { userId: user.id });

    const { searchParams } = new URL(request.url);
    const catId = searchParams.get('catId');

    if (!catId || typeof catId !== 'string' || !z.string().uuid().safeParse(catId).success) {
      return v2Err('Valid catId query parameter is required', 400);
    }

    const catAccess = await requireCatAccess(user.id, catId);
    if (!catAccess.ok) return catAccess.response;

    const weightLogs = await prisma.cat_weight_logs.findMany({
      where: {
        cat_id: catId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    logger.info(`[GET /api/v2/weight-logs] Retrieved ${weightLogs.length} logs for cat ${catId}`);

    return v2Ok(weightLogs);

  } catch (error) {
    logger.error('[GET /api/v2/weight-logs] Error', { error });
    return v2Err('Internal Server Error', 500);
  }
});

// PUT handler for updating an existing weight log
export const PUT = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug('[PUT /api/v2/weight-logs] Request from user', { userId: user.id });

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');
    
    if (!logId || !z.string().uuid().safeParse(logId).success) {
      return v2Err('Valid log ID query parameter is required', 400);
    }

    const json = await request.json();
    const validatedBody = UpdateWeightLogBodySchema.safeParse(json);
    
    if (!validatedBody.success) {
      logger.warn('[PUT /api/v2/weight-logs] Invalid request body', { error: validatedBody.error.format() });
      return v2Err('Invalid request body', 400, validatedBody.error.format());
    }

    const { catId, weight, date, notes } = validatedBody.data;
    const logDate = new Date(date);

    const catAccess = await requireCatAccess(user.id, catId);
    if (!catAccess.ok) return catAccess.response;

    // Verify the log belongs to the specified cat
    const existingLog = await prisma.cat_weight_logs.findUnique({
      where: { id: logId },
      select: { cat_id: true }
    });

    if (!existingLog) {
      return v2Err('Log not found', 404);
    }
    
    if (existingLog.cat_id !== catId) {
      return v2Err('Forbidden: Cannot change the cat associated with this log', 403);
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

    return v2Ok(updatedLog);

  } catch (error) {
    logger.error('[PUT /api/v2/weight-logs] Error', { error });
    return v2Err('Internal Server Error', 500);
  }
});

// DELETE handler for deleting a weight log
export const DELETE = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    logger.debug('[DELETE /api/v2/weight-logs] Request from user', { userId: user.id });

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');
    
    if (!logId || !z.string().uuid().safeParse(logId).success) {
      return v2Err('Valid log ID query parameter is required', 400);
    }

    // Find the log to be deleted to get the catId
    const logToDelete = await prisma.cat_weight_logs.findUnique({
      where: { id: logId },
      select: { cat_id: true }
    });

    if (!logToDelete) {
      return v2Err('Log not found', 404);
    }

    const catId = logToDelete.cat_id;

    const catAccess = await requireCatAccess(user.id, catId);
    if (!catAccess.ok) return catAccess.response;

    await prisma.$transaction(async (tx) => {
      await tx.cat_weight_logs.delete({
        where: { id: logId },
      });

      await syncCatWeightWithLatestLog(tx, catId);
    });

    logger.info('[DELETE /api/v2/weight-logs] Weight log deleted:', { logId, catId });

    return v2Ok({ message: 'Weight log deleted successfully' });

  } catch (error) {
    logger.error('[DELETE /api/v2/weight-logs] Error', { error });
    return v2Err('Internal Server Error', 500);
  }
});

