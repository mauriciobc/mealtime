import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/households/[id] - Obter um domicílio específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Você precisa estar logado para acessar esta página' },
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    // Aguardar os parâmetros da rota
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const householdId = parseInt(id);
    
    if (isNaN(householdId)) {
      return NextResponse.json(
        { error: 'ID do domicílio inválido' },
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        users: true,
        cats: true
      }
    });

    if (!household) {
      return NextResponse.json(
        { error: 'Domicílio não encontrado' },
        { 
          status: 404,
          headers: corsHeaders
        }
      );
    }

    if (session.user.householdId !== householdId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar este domicílio' },
        { 
          status: 403,
          headers: corsHeaders
        }
      );
    }

    return NextResponse.json(household, {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Erro ao buscar household:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os detalhes do domicílio. Tente novamente mais tarde.' },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

// PATCH /api/households/[id] - Atualizar um domicílio
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Validar se a household existe
    const household = await prisma.household.findUnique({
      where: { id: parseInt(id) }
    });

    if (!household) {
      return NextResponse.json(
        { error: 'Household não encontrada' },
        { 
          status: 404,
          headers: corsHeaders
        }
      );
    }

    // Verificar se o usuário tem acesso à household
    if (session.user.householdId !== parseInt(id)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { 
          status: 403,
          headers: corsHeaders
        }
      );
    }

    // Atualizar a household
    const updatedHousehold = await prisma.household.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name,
        inviteCode: body.inviteCode
      }
    });

    return NextResponse.json(updatedHousehold, {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Erro ao atualizar household:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar household' },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

// DELETE /api/households/[id] - Excluir um domicílio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    const { id } = params;

    // Validar se a household existe
    const household = await prisma.household.findUnique({
      where: { id: parseInt(id) }
    });

    if (!household) {
      return NextResponse.json(
        { error: 'Household não encontrada' },
        { 
          status: 404,
          headers: corsHeaders
        }
      );
    }

    // Verificar se o usuário tem acesso à household
    if (session.user.householdId !== parseInt(id)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { 
          status: 403,
          headers: corsHeaders
        }
      );
    }

    // Excluir a household
    await prisma.household.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ message: 'Household excluída com sucesso' }, {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Erro ao excluir household:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir household' },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
} 