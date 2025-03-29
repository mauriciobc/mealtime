import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { catId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const catId = parseInt(params.catId);
    if (isNaN(catId)) {
      return NextResponse.json(
        { error: 'ID do gato inválido' },
        { status: 400 }
      );
    }

    // Verificar se o gato pertence ao usuário através do household
    const userHouseholds = await prisma.household.findMany({
      where: {
        users: {
          some: {
            id: Number(session.user.id)
          }
        }
      },
      select: {
        id: true
      }
    });

    const householdIds = userHouseholds.map(h => h.id);

    const cat = await prisma.cat.findFirst({
      where: {
        id: catId,
        householdId: {
          in: householdIds
        }
      }
    });

    if (!cat) {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }

    // Buscar última alimentação
    const lastFeeding = await prisma.feedingLog.findFirst({
      where: {
        catId
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    return NextResponse.json(lastFeeding);
  } catch (error) {
    console.error('Erro ao buscar última alimentação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 