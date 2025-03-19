import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/households/[id] - Obter um domicílio específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de domicílio inválido' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário pertence ao domicílio
    const household = await prisma.household.findUnique({
      where: { id },
      include: {
        users: true,
        cats: true
      }
    });
    
    if (!household) {
      return NextResponse.json(
        { error: 'Domicílio não encontrado' },
        { status: 404 }
      );
    }
    
    const userId = parseInt(session.user.id as string);
    const userBelongsToHousehold = household.users.some(user => user.id === userId);
    
    if (!userBelongsToHousehold) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar este domicílio' },
        { status: 403 }
      );
    }
    
    // Formatar os dados para a resposta
    const formattedHousehold = {
      id: household.id.toString(),
      name: household.name,
      inviteCode: household.inviteCode,
      members: household.users.map(user => ({
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isCurrentUser: user.id === userId
      })),
      cats: household.cats.map(cat => ({
        id: cat.id.toString(),
        name: cat.name,
        photoUrl: cat.photoUrl
      }))
    };
    
    return NextResponse.json(formattedHousehold);
  } catch (error) {
    console.error('Erro ao buscar domicílio:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar o domicílio' },
      { status: 500 }
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
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de domicílio inválido' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Verificar se o usuário é administrador do domicílio
    const household = await prisma.household.findUnique({
      where: { id },
      include: {
        users: true
      }
    });
    
    if (!household) {
      return NextResponse.json(
        { error: 'Domicílio não encontrado' },
        { status: 404 }
      );
    }
    
    const userId = parseInt(session.user.id as string);
    const userInHousehold = household.users.find(user => user.id === userId);
    
    if (!userInHousehold) {
      return NextResponse.json(
        { error: 'Você não pertence a este domicílio' },
        { status: 403 }
      );
    }
    
    if (userInHousehold.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem atualizar o domicílio' },
        { status: 403 }
      );
    }
    
    // Validar dados
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
      return NextResponse.json(
        { error: 'Nome do domicílio inválido' },
        { status: 400 }
      );
    }
    
    // Atualizar o domicílio
    const updatedHousehold = await prisma.household.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined
      },
      include: {
        users: true
      }
    });
    
    // Formatar os dados para a resposta
    const formattedHousehold = {
      id: updatedHousehold.id.toString(),
      name: updatedHousehold.name,
      inviteCode: updatedHousehold.inviteCode,
      members: updatedHousehold.users.map(user => ({
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }))
    };
    
    return NextResponse.json(formattedHousehold);
  } catch (error) {
    console.error('Erro ao atualizar domicílio:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao atualizar o domicílio' },
      { status: 500 }
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
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de domicílio inválido' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário é administrador do domicílio
    const household = await prisma.household.findUnique({
      where: { id },
      include: {
        users: true
      }
    });
    
    if (!household) {
      return NextResponse.json(
        { error: 'Domicílio não encontrado' },
        { status: 404 }
      );
    }
    
    const userId = parseInt(session.user.id as string);
    const userInHousehold = household.users.find(user => user.id === userId);
    
    if (!userInHousehold) {
      return NextResponse.json(
        { error: 'Você não pertence a este domicílio' },
        { status: 403 }
      );
    }
    
    if (userInHousehold.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir o domicílio' },
        { status: 403 }
      );
    }
    
    // Remover o domicílio (isso também removerá as relações com usuários e gatos)
    await prisma.household.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir domicílio:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao excluir o domicílio' },
      { status: 500 }
    );
  }
} 