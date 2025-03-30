import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { unstable_cache } from 'next/cache';
import { Notification } from '@/lib/types/notification';

// Cache de notificações por 30 segundos
const getCachedNotifications = unstable_cache(
  async (userId: number, page: number, limit: number) => {
    const skip = (page - 1) * limit;
    
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

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + notifications.length < total
    };
  },
  ['notifications'],
  { revalidate: 30 }
);

// GET /api/notifications - Obter notificações do usuário
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
    const searchParams = request.nextUrl.searchParams;
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Validar parâmetros
    if (page < 1 || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Parâmetros de paginação inválidos' },
        { status: 400 }
      );
    }
    
    // Obter notificações com cache
    const result = await getCachedNotifications(userId, page, limit);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar as notificações' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Criar uma nova notificação
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const notifications = Array.isArray(payload) ? payload : [payload];
    
    // Validar se todas as notificações pertencem ao usuário
    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const validNotifications = notifications.every(n => n.userId === userId);
    
    if (!validNotifications) {
      return NextResponse.json(
        { error: 'Notificações inválidas' },
        { status: 400 }
      );
    }

    // Salvar notificações no banco de dados
    const savedNotifications = await Promise.all(
      notifications.map(notification =>
        prisma.notification.create({
          data: {
            title: notification.title,
            message: notification.message,
            type: notification.type,
            isRead: notification.isRead,
            userId: notification.userId,
            catId: notification.catId,
            householdId: notification.householdId,
            actionUrl: notification.actionUrl,
            icon: notification.icon,
            timestamp: notification.timestamp,
            data: notification.data ? JSON.stringify(notification.data) : null
          }
        })
      )
    );

    return NextResponse.json(Array.isArray(payload) ? savedNotifications : savedNotifications[0]);
  } catch (error) {
    console.error('Erro ao salvar notificações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 