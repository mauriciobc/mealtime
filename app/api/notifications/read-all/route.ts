import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// POST /api/notifications/read-all - Marcar todas as notificações como lidas
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    // Atualizar todas as notificações não lidas do usuário
    const result = await prisma.notification.updateMany({
      where: {
        userId: parseInt(session.user.id as string),
        isRead: false
      },
      data: {
        isRead: true
      }
    });
    
    return NextResponse.json({
      message: `${result.count} notificações marcadas como lidas`,
      count: result.count
    });
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao marcar as notificações como lidas' },
      { status: 500 }
    );
  }
} 