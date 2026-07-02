import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;
    const supabase = await createClient();
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mealtime.app.br'}/auth/reset-password`,
    });

    if (error) {
      logger.warn('[POST /api/auth/forgot-password] Supabase error', { error: error.message });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    logger.info('[POST /api/auth/forgot-password] Password reset email sent', { email });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[POST /api/auth/forgot-password] Unexpected error', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
