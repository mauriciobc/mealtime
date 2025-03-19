import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// PATCH /api/notifications/[id]/read - Marcar notificação como lida
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const id = params.id;
    
    // Verificar se a notificação existe e pertence ao usuário
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: parseInt(session.user.id as string)
      }
    });
    
    if (!notification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      );
    }
    
    // Atualizar notificação para marcá-la como lida
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    
    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao marcar a notificação como lida' },
      { status: 500 }
    );
  }
} 