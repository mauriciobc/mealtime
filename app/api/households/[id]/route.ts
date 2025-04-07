import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Verificar se o usuário atual pertence ao domicílio
    const userId = parseInt(session.user.id as string);
    const userBelongsToHousehold = household.users.some(user => user.id === userId);

    if (!userBelongsToHousehold) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar este domicílio' },
        { 
          status: 403,
          headers: corsHeaders
        }
      );
    }

    // Formatar a resposta
    const formattedHousehold = {
      id: String(household.id as unknown),
      name: household.name,
      inviteCode: household.inviteCode,
      members: household.users.map(user => ({
        id: String(user.id as unknown),
        name: user.name,
        email: user.email,
        role: user.role,
        isCurrentUser: user.id === userId
      })),
      cats: household.cats.map(cat => ({
        id: String(cat.id as unknown),
        name: cat.name,
        photoUrl: cat.photoUrl
      }))
    };

    return NextResponse.json(formattedHousehold, {
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

    const body = await request.json();

    // Validar se a household existe e buscar usuários
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        users: true
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

    // Verificar se o usuário atual pertence ao domicílio e é admin
    const userId = parseInt(session.user.id as string);
    const currentUser = household.users.find(user => user.id === userId);

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar este domicílio' },
        { 
          status: 403,
          headers: corsHeaders
        }
      );
    }

    const isOwner = household.ownerId === userId;
    if (!isOwner && currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem editar o domicílio' },
        { 
          status: 403,
          headers: corsHeaders
        }
      );
    }

    // Atualizar a household
    const updatedHousehold = await prisma.household.update({
      where: { id: householdId },
      data: {
        name: body.name,
        inviteCode: body.inviteCode
      },
      include: {
        users: true,
        cats: true
      }
    });

    // Formatar a resposta
    const formattedHousehold = {
      id: String(updatedHousehold.id as unknown),
      name: updatedHousehold.name,
      inviteCode: updatedHousehold.inviteCode,
      members: updatedHousehold.users.map(user => ({
        id: String(user.id as unknown),
        name: user.name,
        email: user.email,
        role: user.role,
        isCurrentUser: user.id === userId
      })),
      cats: updatedHousehold.cats.map(cat => ({
        id: String(cat.id as unknown),
        name: cat.name,
        photoUrl: cat.photoUrl
      }))
    };

    return NextResponse.json(formattedHousehold, {
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