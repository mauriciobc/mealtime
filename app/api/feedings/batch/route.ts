import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/feedings/batch - Criar múltiplos registros de alimentação
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { logs } = await request.json();

    if (!Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum registro de alimentação fornecido' },
        { status: 400 }
      );
    }

    // Verificar se todos os gatos pertencem à mesma residência do usuário
    const userHouseholdId = session.user.householdId;
    if (!userHouseholdId) {
      return NextResponse.json(
        { error: 'Usuário não pertence a nenhuma residência' },
        { status: 400 }
      );
    }

    // Buscar todos os gatos mencionados nos logs
    const catIds = [...new Set(logs.map(log => log.catId))];
    const cats = await prisma.cat.findMany({
      where: {
        id: { in: catIds },
        householdId: userHouseholdId
      }
    });

    // Verificar se todos os gatos foram encontrados e pertencem à residência
    if (cats.length !== catIds.length) {
      return NextResponse.json(
        { error: 'Um ou mais gatos não encontrados ou não pertencem à sua residência' },
        { status: 400 }
      );
    }

    // Criar os registros de alimentação
    const createdLogs = await prisma.$transaction(
      logs.map(log => 
        prisma.feedingLog.create({
          data: {
            catId: log.catId,
            userId: parseInt(session.user.id!),
            timestamp: log.timestamp,
            portionSize: log.portionSize || null,
            notes: log.notes || null,
            status: 'completed'
          },
          include: {
            cat: {
              select: {
                id: true,
                name: true,
                photoUrl: true,
                portion_size: true,
                feedingInterval: true
              }
            },
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })
      )
    );

    return NextResponse.json(createdLogs, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar registros de alimentação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao criar os registros de alimentação' },
      { status: 500 }
    );
  }
} 