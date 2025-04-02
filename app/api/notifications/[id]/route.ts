import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidateTag } from 'next/cache';

// DELETE /api/notifications/[id] - Deletar uma notificação
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log(`\n--- [DELETE /api/notifications/${params.id}] Start ---`);
  try {
    const session = await getServerSession(authOptions);
    console.log(`[DELETE /${params.id}] Session:`, session ? { user: session.user } : "null");

    if (!session || !session.user) {
      console.error(`[DELETE /${params.id}] Unauthorized: No session or user`);
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const notificationId = parseInt(params.id);
    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    console.log(`[DELETE /${params.id}] User ID: ${userId}, Notification ID: ${notificationId}`);

    if (isNaN(notificationId)) {
      console.error(`[DELETE /${params.id}] Invalid Notification ID format:`, params.id);
      return NextResponse.json({ error: 'Formato de ID de notificação inválido' }, { status: 400 });
    }

    // Buscar notificação para verificar propriedade antes de deletar
    console.log(`[DELETE /${params.id}] Fetching notification to verify ownership`);
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      console.error(`[DELETE /${params.id}] Notification not found: ${notificationId}`);
      // Return 200 OK even if not found, as the end result (not existing) is the same
      // This prevents errors if the user clicks delete twice quickly
      console.log(`[DELETE /${params.id}] Notification not found, returning 200 OK`);
      console.log(`--- [DELETE /api/notifications/${params.id}] End (Not Found) ---`);
      return NextResponse.json({ message: 'Notificação não encontrada' }, { status: 200 });
    }

    if (notification.userId !== userId) {
      console.error(`[DELETE /${params.id}] Forbidden: User ${userId} does not own notification ${notificationId}`);
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    
    // Delete the notification
    console.log(`[DELETE /${params.id}] Deleting notification ${notificationId}`);
    await prisma.notification.delete({
      where: { id: notificationId },
    });
    console.log(`[DELETE /${params.id}] Notification deleted successfully`);

    // --- Add Cache Invalidation --- 
    console.log(`[DELETE /${params.id}] Revalidating cache tag: 'notifications'`);
    revalidateTag('notifications');
    console.log(`[DELETE /${params.id}] Revalidating cache tag: 'unread-count'`);
    revalidateTag('unread-count');
    // ------------------------------

    console.log(`[DELETE /${params.id}] Sending success response (Status 204)`);
    console.log(`--- [DELETE /api/notifications/${params.id}] End ---`);
    return new NextResponse(null, { status: 204 }); // Return 204 No Content
  } catch (error) {
    console.error(`[DELETE /api/notifications/${params.id}] Error:`, error);
    console.log(`--- [DELETE /api/notifications/${params.id}] End with Error ---`);
    return NextResponse.json(
      { error: 'Erro ao deletar notificação' },
      { status: 500 }
    );
  }
} 