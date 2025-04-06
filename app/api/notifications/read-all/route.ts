import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidateTag } from 'next/cache';

// POST /api/notifications/read-all - Marcar todas as notificações como lidas
export async function POST(request: NextRequest) {
  console.log("\n--- [POST /api/notifications/read-all] Start ---");
  try {
    const session = await getServerSession(authOptions);
    console.log("[POST /read-all] Session:", session ? { user: session.user } : "null");

    if (!session || !session.user) {
      console.error("[POST /read-all] Unauthorized: No session or user");
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    console.log(`[POST /read-all] User ID: ${userId}`);

    // Mark all notifications for the user as read
    console.log(`[POST /read-all] Updating notifications for userId=${userId} to isRead: true`);
    const updateResult = await prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false, // Only update unread notifications
      },
      data: { isRead: true },
    });
    console.log(`[POST /read-all] Successfully updated ${updateResult.count} notifications.`);

    // --- Add Cache Invalidation --- 
    console.log(`[POST /read-all] Revalidating cache tag: 'notifications'`);
    revalidateTag('notifications');
    console.log(`[POST /read-all] Revalidating cache tag: 'unread-count'`);
    revalidateTag('unread-count');
    // ------------------------------

    console.log(`[POST /read-all] Sending success response (Status 200)`);
    console.log("--- [POST /api/notifications/read-all] End ---");
    return NextResponse.json({ message: 'Todas as notificações foram marcadas como lidas', count: updateResult.count }, { status: 200 }); // Return 200 OK with count
  } catch (error) {
    console.error('[POST /api/notifications/read-all] Error:', error);
    console.log("--- [POST /api/notifications/read-all] End with Error ---");
    return NextResponse.json(
      { error: 'Erro ao marcar todas as notificações como lidas' },
      { status: 500 }
    );
  }
} 