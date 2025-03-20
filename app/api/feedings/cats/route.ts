import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/feedings/cats - Listar gatos para o formulário de alimentação
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');

    const where = householdId 
      ? { householdId: parseInt(householdId) } 
      : {};

    // Consulta simplificada para obter apenas o necessário para o formulário de alimentação
    const cats = await prisma.cat.findMany({
      where,
      select: {
        id: true,
        name: true,
        photoUrl: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(cats);
  } catch (error) {
    console.error('Erro ao buscar gatos para o formulário de alimentação:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os gatos' },
      { status: 500 }
    );
  }
} 