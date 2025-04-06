import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BaseCat } from '@/lib/types/common';

// GET /api/feedings/cats - Listar gatos para o formulário de alimentação
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json(
        { error: 'householdId é obrigatório' },
        { status: 400 }
      );
    }

    // Consulta para obter gatos com informações necessárias para alimentação
    const cats = await prisma.cat.findMany({
      where: {
        householdId: parseInt(householdId)
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Converter para o formato BaseCat
    const formattedCats: BaseCat[] = cats.map(cat => ({
      id: cat.id,
      name: cat.name,
      photoUrl: cat.photoUrl || undefined,
      birthdate: cat.birthdate || undefined,
      weight: cat.weight || undefined,
      restrictions: cat.restrictions || undefined,
      householdId: cat.householdId,
      feeding_interval: cat.feeding_interval || 8
    }));

    console.log(`Encontrados ${formattedCats.length} gatos para a residência ${householdId}`);
    
    return NextResponse.json(formattedCats);
  } catch (error) {
    console.error('Erro ao buscar gatos para o formulário de alimentação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os gatos' },
      { status: 500 }
    );
  }
} 