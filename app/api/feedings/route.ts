import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BaseFeedingLog } from '@/lib/types/common';
import { FeedingLog } from '@/lib/types';

// GET /api/feedings - Listar registros de alimentação (filtragem opcional por catId ou householdId)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const catId = searchParams.get('catId');
    const householdId = searchParams.get('householdId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let where: any = {};
    
    if (catId) {
      where.catId = parseInt(catId);
    }
    
    // Always filter by householdId, either from query params or from cat's householdId
    if (householdId) {
      where.cat = {
        householdId: parseInt(householdId)
      };
    } else {
      // If no householdId provided, we still need to filter by cat's householdId
      where.cat = {
        householdId: {
          not: null
        }
      };
    }

    const feedings = await prisma.feedingLog.findMany({
      where,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            portion_size: true,
            feedingInterval: true,
            birthdate: true,
            weight: true,
            restrictions: true,
            notes: true,
            householdId: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            householdId: true,
            role: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    // Filter out logs that don't belong to the requested household
    const filteredLogs = householdId 
      ? feedings.filter(log => log.cat?.householdId === parseInt(householdId))
      : feedings;

    const formattedLogs: FeedingLog[] = filteredLogs.map(log => ({
      id: log.id,
      catId: log.catId,
      userId: log.userId,
      timestamp: log.timestamp,
      portionSize: log.portionSize || undefined,
      notes: log.notes || undefined,
      status: log.status || undefined,
      createdAt: log.createdAt,
      cat: log.cat ? {
        id: log.cat.id,
        name: log.cat.name,
        photoUrl: log.cat.photoUrl,
        birthdate: log.cat.birthdate,
        weight: log.cat.weight,
        restrictions: log.cat.restrictions,
        notes: log.cat.notes,
        householdId: log.cat.householdId,
        feedingInterval: log.cat.feedingInterval,
        portion_size: log.cat.portion_size
      } : undefined,
      user: log.user ? {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
        householdId: log.user.householdId,
        role: log.user.role,
        preferences: {
          timezone: "UTC",
          language: "pt-BR",
          notifications: {
            pushEnabled: true,
            emailEnabled: true,
            feedingReminders: true,
            missedFeedingAlerts: true,
            householdUpdates: true
          }
        }
      } : undefined
    }));

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error('Erro ao buscar registros de alimentação:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    return NextResponse.json(
      { 
        error: 'Ocorreu um erro ao buscar os registros de alimentação',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/feedings - Criar um novo registro de alimentação
export async function POST(request: NextRequest) {
  try {
    const {
      catId,
      userId,
      portionSize,
      notes,
      status,
      timestamp
    } = await request.json();

    if (!catId || !userId) {
      return NextResponse.json(
        { error: 'ID do gato e ID do usuário são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o gato existe
    const cat = await prisma.cat.findUnique({
      where: { id: catId },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        portion_size: true,
        feedingInterval: true,
        birthdate: true,
        weight: true,
        restrictions: true,
        notes: true,
        householdId: true
      }
    });

    if (!cat) {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        householdId: true,
        preferences: true,
        role: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Garantir que o timestamp seja UTC
    const utcTimestamp = timestamp ? new Date(timestamp) : new Date();
    utcTimestamp.setMilliseconds(0); // Remover milissegundos para consistência

    // Criar o registro de alimentação
    const feedingLog = await prisma.feedingLog.create({
      data: {
        catId,
        userId,
        timestamp: utcTimestamp,
        portionSize: portionSize ? parseFloat(String(portionSize)) : undefined,
        notes,
        status
      }
    });

    const formattedLog: FeedingLog = {
      id: feedingLog.id,
      catId: feedingLog.catId,
      userId: feedingLog.userId,
      timestamp: feedingLog.timestamp,
      portionSize: feedingLog.portionSize || undefined,
      notes: feedingLog.notes || undefined,
      status: feedingLog.status || undefined,
      createdAt: feedingLog.createdAt,
      cat,
      user
    };

    return NextResponse.json(formattedLog, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar registro de alimentação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao criar o registro de alimentação' },
      { status: 500 }
    );
  }
} 