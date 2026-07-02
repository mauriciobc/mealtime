import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/monitoring/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/logout
 * Logout the current user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.warn('[POST /api/auth/logout] Supabase signOut error', { error: error.message });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    logger.info('[POST /api/auth/logout] User signed out successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[POST /api/auth/logout] Unexpected error', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
