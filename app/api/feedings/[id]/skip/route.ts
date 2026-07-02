import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const skipSchema = z.object({
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/feedings/:id/skip
 * Mark a feeding as skipped
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
    const validationResult = skipSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { reason } = validationResult.data;

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
          status: 'skipped',
          skip_reason: reason || null,
          fed_by: user.id,
          updated_at: new Date(),
        },
      });
    } else {
      // If no existing log with this ID, return error
      return NextResponse.json(
        { success: false, error: 'Feeding log not found' },
        { status: 404 }
      );
    }

    logger.info('[POST /api/feedings/:id/skip] Feeding skipped', {
      feedingId,
      userId: user.id,
      reason,
    });

    return NextResponse.json({ success: true, data: feedingLog });
  } catch (error) {
    logger.error('[POST /api/feedings/:id/skip] Error', { error, feedingId });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
