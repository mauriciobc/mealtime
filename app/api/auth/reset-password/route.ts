import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { token, password } = validationResult.data;
    const supabase = await createClient();
    
    // Verify the token by setting the session
    const { error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (sessionError) {
      logger.warn('[POST /api/auth/reset-password] Invalid token', { error: sessionError.message });
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      logger.warn('[POST /api/auth/reset-password] Update error', { error: updateError.message });
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    logger.info('[POST /api/auth/reset-password] Password reset successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[POST /api/auth/reset-password] Unexpected error', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
