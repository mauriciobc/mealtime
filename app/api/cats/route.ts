import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/cats - Listar todos os gatos (filtragem opcional por householdId)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');

    const where = householdId 
      ? { householdId: parseInt(householdId) } 
      : {};

    const cats = await prisma.cat.findMany({
      where,
      include: {
        household: {
          select: {
            id: true,
            name: true
          }
        },
        feedingLogs: {
          take: 1,
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    return NextResponse.json(cats);
  } catch (error) {
    console.error('Erro ao buscar gatos:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os gatos' },
      { status: 500 }
    );
  }
}

// POST /api/cats - Criar um novo perfil de gato
export async function POST(request: NextRequest) {
  try {
    const {
      name,
      photoUrl,
      birthdate,
      weight,
      restrictions,
      notes,
      householdId
    } = await request.json();

    if (!name || !householdId) {
      return NextResponse.json(
        { error: 'Nome e ID do domicílio são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o domicílio existe
    const household = await prisma.household.findUnique({
      where: { id: householdId }
    });

    if (!household) {
      return NextResponse.json(
        { error: 'Domicílio não encontrado' },
        { status: 404 }
      );
    }

    // Criar o perfil do gato
    const cat = await prisma.cat.create({
      data: {
        name,
        photoUrl,
        birthdate: birthdate ? new Date(birthdate) : null,
        weight: weight ? parseFloat(weight) : null,
        restrictions,
        notes,
        householdId
      }
    });

    return NextResponse.json(cat, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar perfil de gato:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao criar o perfil do gato' },
      { status: 500 }
    );
  }
} 