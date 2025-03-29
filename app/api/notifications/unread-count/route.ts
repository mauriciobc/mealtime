import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { unstable_cache } from 'next/cache';

// Cache da contagem de notificações não lidas por 30 segundos
const getCachedUnreadCount = unstable_cache(
  async (userId: number) => {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
    return count;
  },
  ['unread-count'],
  { revalidate: 30 }
);

// GET /api/notifications/unread-count - Obter contagem de notificações não lidas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const userId = parseInt(session.user.id as string);
    
    // Obter contagem com cache
    const count = await getCachedUnreadCount(userId);
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Erro ao buscar contagem de notificações não lidas:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar a contagem de notificações não lidas' },
      { status: 500 }
    );
  }
} 