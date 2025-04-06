import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getToken } from 'next-auth/jwt';

// POST /api/households/join - Entrar em um domicílio usando um código de convite
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validar dados
    if (!body.inviteCode || typeof body.inviteCode !== 'string') {
      return NextResponse.json(
        { error: 'Código de convite é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar o domicílio pelo código de convite
    const household = await prisma.household.findUnique({
      where: { inviteCode: body.inviteCode },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        cats: true
      }
    });
    
    if (!household) {
      return NextResponse.json(
        { error: 'Código de convite inválido' },
        { status: 404 }
      );
    }
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'ID do usuário inválido' },
        { status: 400 }
      );
    }
    
    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    
    // Verificar se o usuário já pertence ao domicílio
    const userAlreadyInHousehold = household.users.some(user => Number(user.id) === userId);
    
    if (userAlreadyInHousehold) {
      return NextResponse.json(
        { error: 'Você já pertence a este domicílio' },
        { status: 400 }
      );
    }
    
    // Adicionar usuário ao domicílio como membro
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        householdId: household.id,
        role: 'member' // Novos usuários sempre entram como membros
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    // Buscar o domicílio atualizado com todos os membros
    const updatedHousehold = await prisma.household.findUnique({
      where: { id: household.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        cats: true
      }
    });
    
    if (!updatedHousehold) {
      return NextResponse.json(
        { error: 'Erro ao buscar domicílio atualizado' },
        { status: 500 }
      );
    }
    
    // Formatar a resposta
    const formattedHousehold = {
      id: household.id,
      name: household.name,
      inviteCode: household.inviteCode,
      members: updatedHousehold.users.map(user => ({
        id: user.id.toString(),
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      })),
      cats: updatedHousehold.cats
    };
    
    // Atualizar o token com o novo householdId
    const token = await getToken({ req: request });
    if (token) {
      token.householdId = household.id;
    }

    // Retornar o novo householdId junto com os dados do domicílio
    return NextResponse.json({
      ...formattedHousehold,
      newHouseholdId: household.id
    });
  } catch (error) {
    console.error('Erro ao entrar no domicílio:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao entrar no domicílio' },
      { status: 500 }
    );
  }
} 