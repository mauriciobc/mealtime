import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { unstable_cache } from 'next/cache';

// Cache da contagem de notificações não lidas por 5 segundos
const getCachedUnreadCount = unstable_cache(
  async (userId: number) => {
    console.log(`[UnreadCount] Fetching unread count for user: ${userId}`);
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
    console.log(`[UnreadCount] Database returned unread count: ${count}`);
    return count;
  },
  ['unread-count'],
  { revalidate: 5 }
);

// GET /api/notifications/unread-count - Obter contagem de notificações não lidas
export async function GET(request: NextRequest) {
  console.log(`[UnreadCount] Received request for unread count`);
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      console.log(`[UnreadCount] Unauthorized request - no session or user`);
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const userId = parseInt(session.user.id as string);
    console.log(`[UnreadCount] Processing request for user: ${userId}`);
    
    // Obter contagem com cache
    const count = await getCachedUnreadCount(userId);
    console.log(`[UnreadCount] Returning count: ${count}`);
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error(`[UnreadCount] Error processing request:`, error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar a contagem de notificações não lidas' },
      { status: 500 }
    );
  }
} 