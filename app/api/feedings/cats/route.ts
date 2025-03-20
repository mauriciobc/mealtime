import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    // Usando o select: true para selecionar todas as colunas e evitar o erro de tipagem
    const cats = await prisma.cat.findMany({
      where: {
        householdId: parseInt(householdId)
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`Encontrados ${cats.length} gatos para a residência ${householdId}`);
    
    return NextResponse.json(cats);
  } catch (error) {
    console.error('Erro ao buscar gatos para o formulário de alimentação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os gatos' },
      { status: 500 }
    );
  }
} 