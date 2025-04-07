import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { unstable_cache, revalidateTag } from 'next/cache';
import { Notification } from '@/lib/types/notification';

// Function to fetch notifications directly from DB (extracted logic)
async function fetchNotificationsFromDB(userId: number, page: number, limit: number) {
  console.log(`[fetchNotificationsFromDB] Fetching notifications for userId=${userId}, page=${page}, limit=${limit} directly from DB`);
  const skip = (page - 1) * limit;
  
  // Add log to check prisma instance
  console.log("[fetchNotificationsFromDB] Checking prisma instance before query:", typeof prisma, prisma ? Object.keys(prisma) : 'undefined');

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        createdAt: true,
        actionUrl: true,
        data: true
      }
    }),
    prisma.notification.count({
      where: { userId }
    })
  ]);
  console.log(`[fetchNotificationsFromDB] DB result for userId=${userId}, page=${page}: Found ${notifications.length} notifications, Total: ${total}`);

  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + notifications.length < total
  };
}

/* // Temporarily disable caching for debugging
// Cache de notificações por 30 segundos
const getCachedNotifications = unstable_cache(
  fetchNotificationsFromDB, // Use the extracted function
  ['notifications'],
  { revalidate: 30 }
);
*/

// GET /api/notifications - Obter notificações do usuário
export async function GET(request: NextRequest) {
  console.log("\n--- [GET /api/notifications] Start ---");
  try {
    const session = await getServerSession(authOptions);
    console.log("[GET /api/notifications] Session:", session ? { user: session.user } : "null");
    
    if (!session || !session.user) {
      console.error("[GET /api/notifications] Unauthorized: No session or user");
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const userIdString = String(session.user.id);
    const userId = parseInt(userIdString, 10);
    console.log(`[GET /api/notifications] User ID parsed: ${userId}`);
    
    if (isNaN(userId)) {
      console.error("[GET /api/notifications] Invalid User ID format after parsing:", userIdString);
      return NextResponse.json(
        { error: 'Formato de ID de usuário inválido' },
        { status: 400 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    console.log("[GET /api/notifications] Search Params:", searchParams.toString());
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    console.log(`[GET /api/notifications] Pagination: Page=${page}, Limit=${limit}`);
    
    if (page < 1 || limit < 1 || limit > 50) {
       console.error("[GET /api/notifications] Invalid pagination parameters:", { page, limit });
      return NextResponse.json(
        { error: 'Parâmetros de paginação inválidos' },
        { status: 400 }
      );
    }
    
    // --- Temporarily fetch directly from DB --- 
    console.log(`[GET /api/notifications] Fetching directly from DB for userId=${userId}, page=${page}, limit=${limit}`);
    const result = await fetchNotificationsFromDB(userId, page, limit); 
    // ------------------------------------------
    
    // Original call using cache:
    // console.log(`[GET /api/notifications] Calling getCachedNotifications for userId=${userId}, page=${page}, limit=${limit}`);
    // const result = await getCachedNotifications(userId, page, limit);
    console.log("[GET /api/notifications] Result from DB fetch:", {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
        notificationCount: result.notifications.length
    });
    
    // Format response to match PaginatedResponse interface
    const responseData = {
      data: result.notifications,
      totalPages: result.totalPages,
      hasMore: result.hasMore
    };
    
    console.log("[GET /api/notifications] Sending response:", responseData);
    console.log("--- [GET /api/notifications] End ---\n");
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[GET /api/notifications] Error:', error);
    console.log("--- [GET /api/notifications] End with Error ---\n");
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar as notificações' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Criar uma nova notificação
export async function POST(request: NextRequest) {
  console.log("\n--- [POST /api/notifications] Start ---");
  try {
    const session = await getServerSession(authOptions);
    console.log("[POST /api/notifications] Session:", session ? { user: session.user } : "null");
    
    if (!session || !session.user) {
      console.error('[POST /api/notifications] Unauthorized request: No session or user');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    console.log("[POST /api/notifications] Received payload:", payload);
    const notifications = Array.isArray(payload) ? payload : [payload];
    
    // Validar se todas as notificações pertencem ao usuário
    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    console.log(`[POST /api/notifications] Authenticated User ID: ${userId}`);
    const validNotifications = notifications.every(n => n.userId === userId);
    
    if (!validNotifications) {
      console.error('[POST /api/notifications] Invalid notifications: User ID mismatch', {
        authenticatedUserId: userId,
        notificationUserIds: notifications.map(n => n.userId)
      });
      return NextResponse.json(
        { error: 'Notificações inválidas (ID de usuário não corresponde)' },
        { status: 400 }
      );
    }

    // Validar campos obrigatórios
    const requiredFields = ['title', 'message', 'type', 'userId'];
    const missingFields = notifications.map((n, index) => 
      requiredFields.filter(field => !n[field]).map(field => ({ index, field }))
    ).flat();

    if (missingFields.length > 0) {
      console.error('[POST /api/notifications] Missing required fields:', missingFields);
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando', details: missingFields },
        { status: 400 }
      );
    }

    // Validar tipos de notificação
    const validTypes = ['feeding', 'reminder', 'household', 'system', 'info', 'warning', 'error'];
    const invalidNotifications = notifications
        .map((n, index) => ({ index, type: n.type, isValid: validTypes.includes(n.type) }))
        .filter(n => !n.isValid);

    if (invalidNotifications.length > 0) {
      console.error('[POST /api/notifications] Invalid notification types:', invalidNotifications);
      return NextResponse.json(
        { error: 'Tipo de notificação inválido', details: invalidNotifications },
        { status: 400 }
      );
    }

    console.log('[POST /api/notifications] Payload validated. Preparing to save:', {
      userId,
      count: notifications.length,
      types: notifications.map(n => n.type)
    });

    // Salvar notificações no banco de dados
    const savedNotifications = await Promise.all(
      notifications.map(notification => {
        const dataToSave = {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          isRead: notification.isRead ?? false,
          userId: notification.userId,
          catId: notification.catId,
          householdId: notification.householdId,
          actionUrl: notification.actionUrl,
          icon: notification.icon,
          timestamp: notification.timestamp,
          // Ensure data is stringified or null
          data: notification.data ? (typeof notification.data === 'string' ? notification.data : JSON.stringify(notification.data)) : null
        };
        console.log('[POST /api/notifications] Saving notification data:', dataToSave);
        return prisma.notification.create({
          data: dataToSave
        });
      })
    );

    console.log('[POST /api/notifications] Successfully created notifications in DB:', {
      count: savedNotifications.length,
      ids: savedNotifications.map(n => n.id)
    });

    // --- Add Cache Invalidation --- 
    console.log("[POST /api/notifications] Revalidating cache tag: 'notifications'");
    revalidateTag('notifications');
    console.log("[POST /api/notifications] Revalidating cache tag: 'unread-count'");
    revalidateTag('unread-count');
    // ------------------------------

    const responseData = Array.isArray(payload) ? savedNotifications : savedNotifications[0];
    console.log("[POST /api/notifications] Sending response:", responseData);
    console.log("--- [POST /api/notifications] End ---\n");
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[POST /api/notifications] Error saving notifications:', error);
    console.log("--- [POST /api/notifications] End with Error ---\n");
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 