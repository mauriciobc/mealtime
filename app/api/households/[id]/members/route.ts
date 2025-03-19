import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/households/[id]/members - Listar membros de um domicílio
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
    const userBelongsToHousehold = household.users.some(user => user.id === userId);
    
    if (!userBelongsToHousehold) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar este domicílio' },
        { status: 403 }
      );
    }
    
    // Formatar os dados para a resposta
    const members = household.users.map(user => ({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isCurrentUser: user.id === userId
    }));
    
    return NextResponse.json(members);
  } catch (error) {
    console.error('Erro ao buscar membros:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os membros' },
      { status: 500 }
    );
  }
}

// POST /api/households/[id]/members - Adicionar membro ao domicílio
export async function POST(
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
    
    const householdId = parseInt(params.id);
    
    if (isNaN(householdId)) {
      return NextResponse.json(
        { error: 'ID de domicílio inválido' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Validar dados
    if (!body.userId || typeof body.userId !== 'string') {
      return NextResponse.json(
        { error: 'ID de usuário é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!body.role || (body.role !== 'admin' && body.role !== 'member')) {
      return NextResponse.json(
        { error: 'Papel inválido. Deve ser "admin" ou "member"' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário atual é administrador do domicílio
    const household = await prisma.household.findUnique({
      where: { id: householdId },
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
    
    const currentUserId = parseInt(session.user.id as string);
    const currentUser = household.users.find(user => user.id === currentUserId);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Você não pertence a este domicílio' },
        { status: 403 }
      );
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem adicionar membros' },
        { status: 403 }
      );
    }
    
    const userIdToAdd = parseInt(body.userId);
    
    // Verificar se o usuário já está no domicílio
    const userAlreadyInHousehold = household.users.some(user => user.id === userIdToAdd);
    
    if (userAlreadyInHousehold) {
      return NextResponse.json(
        { error: 'Este usuário já pertence ao domicílio' },
        { status: 400 }
      );
    }
    
    // Adicionar usuário ao domicílio
    await prisma.user.update({
      where: { id: userIdToAdd },
      data: {
        householdId: householdId,
        role: body.role
      }
    });
    
    // Buscar o usuário atualizado
    const updatedUser = await prisma.user.findUnique({
      where: { id: userIdToAdd }
    });
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Erro ao buscar usuário atualizado' },
        { status: 500 }
      );
    }
    
    // Formatar os dados para a resposta
    const member = {
      id: updatedUser.id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role
    };
    
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar membro:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao adicionar o membro' },
      { status: 500 }
    );
  }
} 