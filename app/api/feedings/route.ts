import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BaseFeedingLog } from '@/lib/types/common';

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
    
    if (householdId) {
      where.cat = {
        householdId: parseInt(householdId)
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
            feeding_interval: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    // Converter para o formato BaseFeedingLog
    const formattedFeedings: BaseFeedingLog[] = feedings.map(feeding => ({
      id: feeding.id,
      catId: feeding.catId,
      userId: feeding.userId,
      timestamp: feeding.timestamp,
      portionSize: feeding.portionSize || undefined,
      notes: feeding.notes || undefined,
      createdAt: feeding.createdAt,
      status: feeding.status || undefined
    }));

    return NextResponse.json(formattedFeedings);
  } catch (error) {
    console.error('Erro ao buscar registros de alimentação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os registros de alimentação' },
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
      where: { id: catId }
    });

    if (!cat) {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
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
        portionSize: portionSize ? parseFloat(String(portionSize)) : null,
        notes,
        status
      }
    });

    return NextResponse.json(feedingLog, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar registro de alimentação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao criar o registro de alimentação' },
      { status: 500 }
    );
  }
} 