import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// DELETE /api/notifications/[id] - Remover uma notificação
export async function DELETE(
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
    
    const id = parseInt(params.id);
    const userId = parseInt(session.user.id as string);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de notificação inválido' },
        { status: 400 }
      );
    }
    
    // Verificar se a notificação existe e pertence ao usuário
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada ou não pertence ao usuário' },
        { status: 404 }
      );
    }
    
    // Remover a notificação
    await prisma.notification.delete({
      where: {
        id
      }
    });
    
    return NextResponse.json({ message: 'Notificação removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover notificação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao remover a notificação' },
      { status: 500 }
    );
  }
} 