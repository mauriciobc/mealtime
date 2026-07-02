import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const completeSchema = z.object({
  notes: z.string().max(500).optional(),
  amount: z.number().positive().optional(),
  fed_at: z.string().datetime().optional(),
});

/**
 * POST /api/feedings/:id/complete
 * Mark a feeding as completed (creates or updates the feeding log)
 */
export const POST = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  const params = context ? await context.params : null;
  const feedingId = params?.id;

  if (!feedingId) {
    return NextResponse.json(
      { success: false, error: 'Feeding ID is required' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const validationResult = completeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { notes, amount, fed_at } = validationResult.data;

    // Check if feeding log exists
    const existingLog = await prisma.feeding_logs.findUnique({
      where: { id: feedingId },
    });

    let feedingLog;

    if (existingLog) {
      // Update existing log
      feedingLog = await prisma.feeding_logs.update({
        where: { id: feedingId },
        data: {
          status: 'completed',
          fed_by: user.id,
          fed_at: fed_at ? new Date(fed_at) : new Date(),
          ...(notes && { notes }),
          ...(amount && { amount }),
          updated_at: new Date(),
        },
      });
    } else {
      // If no existing log with this ID, return error
      // (In the future, this could create a new log if the ID is a schedule ID)
      return NextResponse.json(
        { success: false, error: 'Feeding log not found' },
        { status: 404 }
      );
    }

    logger.info('[POST /api/feedings/:id/complete] Feeding completed', {
      feedingId,
      userId: user.id,
    });

    return NextResponse.json({ success: true, data: feedingLog });
  } catch (error) {
    logger.error('[POST /api/feedings/:id/complete] Error', { error, feedingId });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
