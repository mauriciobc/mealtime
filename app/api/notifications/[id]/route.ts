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
    const userId = session.user.id;
    
    // Verificar se a notificação existe e pertence ao usuário
    const existingNotification = await prisma.$queryRaw`
      SELECT * FROM Notification 
      WHERE id = ${id} AND userId = ${userId}
    `;
    
    if (!existingNotification || (Array.isArray(existingNotification) && existingNotification.length === 0)) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      );
    }
    
    // Remover a notificação
    await prisma.$executeRaw`
      DELETE FROM Notification 
      WHERE id = ${id}
    `;
    
    return NextResponse.json({ message: 'Notificação removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover notificação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao remover a notificação' },
      { status: 500 }
    );
  }
} 