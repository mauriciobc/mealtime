import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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
    
    const userId = session.user.id;
    
    // Obter notificações do banco de dados
    const notifications = await prisma.notification.findMany({
      where: {
        userId: parseInt(userId as string)
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(notifications);
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
    
    const {
      title,
      message,
      type,
      relatedId,
      relatedType
    } = await request.json();
    
    // Validar campos obrigatórios
    if (!title || !message || !type) {
      return NextResponse.json(
        { error: 'Título, mensagem e tipo são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Criar notificação no banco de dados
    const notification = await prisma.notification.create({
      data: {
        userId: parseInt(session.user.id as string),
        title,
        message,
        type,
        relatedId,
        relatedType,
        isRead: false
      }
    });
    
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao criar a notificação' },
      { status: 500 }
    );
  }
} 