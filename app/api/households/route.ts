import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface PrismaError extends Error {
  code?: string;
}

// GET /api/households - Obter todos os domicílios do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Buscar domicílios do usuário
    const households = await prisma.household.findMany({
      where: {
        users: {
          some: {
            id: parseInt(userId as string)
          }
        }
      },
      include: {
        users: true,
        cats: true,
        owner: true
      }
    });
    
    // Formatar os dados para a resposta
    const formattedHouseholds = households.map(household => ({
      id: household.id.toString(),
      name: household.name,
      inviteCode: household.inviteCode,
      createdAt: household.createdAt,
      owner: household.owner ? {
        id: household.owner.id,
        name: household.owner.name,
        email: household.owner.email
      } : null,
      members: household.users.map(user => ({
        id: user.id.toString(),
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      })),
      cats: household.cats.map(cat => ({
        id: cat.id.toString(),
        name: cat.name,
        photoUrl: cat.photoUrl
      }))
    }));
    
    return NextResponse.json(formattedHouseholds);
  } catch (error: PrismaError) {
    console.error('Erro ao buscar domicílios:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os domicílios' },
      { status: 500 }
    );
  }
}

// POST /api/households - Criar um novo domicílio
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
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Nome do domicílio é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se o userId é válido
    const userId = parseInt(session.user.id as string);
    if (isNaN(userId)) {
      console.error('ID de usuário inválido:', session.user.id);
      return NextResponse.json(
        { error: 'ID de usuário inválido' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!userExists) {
      console.error('Usuário não encontrado:', userId);
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Gerar código de convite
    const inviteCode = uuidv4().substring(0, 8).toUpperCase();
    
    // Criar o domicílio com o usuário como owner e membro
    const household = await prisma.household.create({
      data: {
        name: body.name,
        inviteCode: inviteCode,
        ownerId: userId,  // Set the owner
        users: {
          connect: {
            id: userId
          }
        }
      },
      include: {
        users: true,
        owner: true
      }
    });
    
    // Atualizar o papel do usuário para admin no domicílio recém-criado
    await prisma.user.update({
      where: { id: userId },
      data: { 
        role: 'admin',
        householdId: household.id
      }
    });
    
    // Formatar a resposta
    const formattedHousehold = {
      ...household,
      owner: household.owner ? {
        id: household.owner.id,
        name: household.owner.name,
        email: household.owner.email
      } : null,
      members: household.users.map(user => ({
        id: user.id.toString(),
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }))
    };
    
    return NextResponse.json(formattedHousehold);
  } catch (error: PrismaError) {
    console.error('Erro ao criar domicílio:', error);
    
    // Verificar se é um erro do Prisma para tratamento específico
    if (error.code) {
      // Erro de conflito (por exemplo, inviteCode já existe)
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Não foi possível criar o domicílio. Tente novamente.' },
          { status: 409 }
        );
      }
      
      // Erro de restrição de referência (usuário não encontrado)
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Ocorreu um erro ao criar o domicílio. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
} 