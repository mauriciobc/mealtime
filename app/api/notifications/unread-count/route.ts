import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

// Cache unread count for 30 seconds, tagged for revalidation
const getCachedUnreadCount = unstable_cache(
  async (userId: number) => {
    console.log(`[getCachedUnreadCount] Fetching unread count for userId=${userId} from DB`);
    const count = await prisma.notification.count({
      where: {
        userId: userId,
        isRead: false,
      },
    });
    console.log(`[getCachedUnreadCount] DB result for userId=${userId}: ${count}`);
    return count;
  },
  ['unread-count'], // Cache tag specific to unread count
  { revalidate: 30 } // Revalidate every 30 seconds (or adjust as needed)
);

// GET /api/notifications/unread-count - Obter contagem de notificações não lidas
export async function GET(request: NextRequest) {
  console.log("\n--- [GET /api/notifications/unread-count] Start ---");
  try {
    const session = await getServerSession(authOptions);
    console.log("[GET /unread-count] Session:", session ? { user: session.user } : "null");

    if (!session || !session.user) {
      console.error("[GET /unread-count] Unauthorized: No session or user");
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    console.log(`[GET /unread-count] User ID parsed: ${userId}`);

    if (isNaN(userId)) {
      console.error("[GET /unread-count] Invalid User ID format after parsing");
      return NextResponse.json(
        { error: 'Formato de ID de usuário inválido' },
        { status: 400 }
      );
    }
    
    // Get count using the cached function
    console.log(`[GET /unread-count] Calling getCachedUnreadCount for userId=${userId}`);
    const count = await getCachedUnreadCount(userId);
    console.log(`[GET /unread-count] Count received from cache/DB: ${count}`);

    const responseData = { count };
    console.log("[GET /unread-count] Sending response:", responseData);
    console.log("--- [GET /api/notifications/unread-count] End ---");
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[GET /api/notifications/unread-count] Error:', error);
     console.log("--- [GET /api/notifications/unread-count] End with Error ---");
    return NextResponse.json(
      { error: 'Erro ao buscar contagem de notificações não lidas' },
      { status: 500 }
    );
  }
} 