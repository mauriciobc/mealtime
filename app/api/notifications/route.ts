import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CookieOptions } from '@supabase/ssr';
import { logger } from '@/utils/logger';
import { createRouteHandlerCookieStore } from '@/lib/supabase/cookie-store';

// Helper function to create Supabase client with standardized cookie store
async function createSupabaseRouteClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: await createRouteHandlerCookieStore()
    }
  );
}

// GET /api/notifications - Get all notifications for the user
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createSupabaseRouteClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return as an object with notifications property and pagination fields
  return NextResponse.json({
    notifications: notifications || [],
    total: notifications ? notifications.length : 0,
    page: 1,
    totalPages: 1,
    hasMore: false
  });
}

// POST /api/notifications - Create a new notification
export async function POST(request: Request) {
  const supabase = await createSupabaseRouteClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, message, type, metadata = {} } = await request.json();

  const { data: notification, error } = await supabase
    .from('notifications')
    .insert([
      {
        id: crypto.randomUUID(),
        user_id: user.id,
        title,
        message,
        type,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(notification);
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  console.log("\n--- [PATCH /api/notifications] Start ---");

  try {
    // Get authenticated user using getUser() for security
    const supabase = await createSupabaseRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[PATCH /api/notifications] Authorization Error:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const authUserId = user.id;
    console.log(`[PATCH /api/notifications] Authenticated User ID: ${authUserId}`);

    const { notificationIds, read } = await request.json();
    console.log("[PATCH /api/notifications] Received payload:", { notificationIds, read });

    if (!Array.isArray(notificationIds) || notificationIds.length === 0 || typeof read !== 'boolean') {
      console.error('[PATCH /api/notifications] Invalid payload format');
      return NextResponse.json(
        { error: 'Invalid payload format. Expecting { notificationIds: string[], read: boolean }' },
        { status: 400 }
      );
    }

    const updateResult = await prisma.notifications.updateMany({
      where: {
        id: { in: notificationIds },
        user_id: authUserId
      },
      data: {
        is_read: read,
        updated_at: new Date()
      }
    });

    console.log(`[PATCH /api/notifications] Update result for user ${authUserId}:`, updateResult);

    revalidateTag('notifications');
    revalidateTag('unread-count');

    return NextResponse.json(updateResult);
  } catch (error) {
    console.error('[PATCH /api/notifications] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  console.log("\n--- [DELETE /api/notifications] Start ---");

  try {
    // Get authenticated user using getUser() for security
    const supabase = await createSupabaseRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[DELETE /api/notifications] Authorization Error:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const authUserId = user.id;
    console.log(`[DELETE /api/notifications] Authenticated User ID: ${authUserId}`);

    const { notificationIds } = await request.json();
    console.log("[DELETE /api/notifications] Received payload:", { notificationIds });

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      console.error('[DELETE /api/notifications] Invalid payload format');
      return NextResponse.json(
        { error: 'Invalid payload format. Expecting { notificationIds: string[] }' },
        { status: 400 }
      );
    }

    const deleteResult = await prisma.notifications.deleteMany({
      where: {
        id: { in: notificationIds },
        user_id: authUserId
      }
    });

    console.log(`[DELETE /api/notifications] Delete result for user ${authUserId}:`, deleteResult);

    revalidateTag('notifications');
    revalidateTag('unread-count');

    return NextResponse.json(deleteResult);
  } catch (error) {
    console.error('[DELETE /api/notifications] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
} 