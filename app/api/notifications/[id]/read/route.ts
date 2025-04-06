import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidateTag } from 'next/cache';

// PATCH /api/notifications/[id]/read - Marcar notificação como lida
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`\n--- [PATCH /api/notifications/${params.id}/read] Start ---`);
  try {
    const session = await getServerSession(authOptions);
    console.log(`[PATCH /${params.id}/read] Session:`, session ? { user: session.user } : "null");
    
    if (!session || !session.user) {
      console.error(`[PATCH /${params.id}/read] Unauthorized: No session or user`);
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const notificationId = parseInt(params.id);
    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    console.log(`[PATCH /${params.id}/read] User ID: ${userId}, Notification ID: ${notificationId}`);
    
    if (isNaN(notificationId)) {
      console.error(`[PATCH /${params.id}/read] Invalid Notification ID format:`, params.id);
      return NextResponse.json(
        { error: 'Formato de ID de notificação inválido' },
        { status: 400 }
      );
    }
    
    // Buscar notificação para verificar propriedade
    console.log(`[PATCH /${params.id}/read] Fetching notification to verify ownership`);
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    
    if (!notification) {
      console.error(`[PATCH /${params.id}/read] Notification not found: ${notificationId}`);
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      );
    }
    
    if (notification.userId !== userId) {
      console.error(`[PATCH /${params.id}/read] Forbidden: User ${userId} does not own notification ${notificationId}`);
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }
    
    // Mark notification as read
    console.log(`[PATCH /${params.id}/read] Updating notification to isRead: true`);
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    console.log(`[PATCH /${params.id}/read] Notification updated successfully`);

    // --- Add Cache Invalidation --- 
    console.log(`[PATCH /${params.id}/read] Revalidating cache tag: 'notifications'`);
    revalidateTag('notifications');
    console.log(`[PATCH /${params.id}/read] Revalidating cache tag: 'unread-count'`);
    revalidateTag('unread-count');
    // ------------------------------

    console.log(`[PATCH /${params.id}/read] Sending response:`, updatedNotification);
    console.log(`--- [PATCH /api/notifications/${params.id}/read] End ---`);
    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error(`[PATCH /api/notifications/${params.id}/read] Error:`, error);
    console.log(`--- [PATCH /api/notifications/${params.id}/read] End with Error ---`);
    return NextResponse.json(
      { error: 'Erro ao marcar notificação como lida' },
      { status: 500 }
    );
  }
} 