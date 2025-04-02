import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// PATCH /api/households/[id]/members/[userId] - Atualizar papel de um membro
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const householdId = parseInt(params.id);
    const memberUserId = parseInt(params.userId);
    const currentUserId = parseInt(session.user.id);
    
    if (isNaN(householdId) || isNaN(memberUserId)) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Validar dados
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
    
    const currentUser = household.users.find(user => user.id === currentUserId);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Você não pertence a este domicílio' },
        { status: 403 }
      );
    }
    
    const isOwner = household.ownerId === currentUserId;
    if (!isOwner && currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem alterar papéis de membros' },
        { status: 403 }
      );
    }
    
    // Verificar se o usuário a ser atualizado existe no domicílio
    const memberUser = household.users.find(user => user.id === memberUserId);
    
    if (!memberUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado no domicílio' },
        { status: 404 }
      );
    }
    
    // Não permitir remover o último administrador
    if (memberUser.role === 'admin' && body.role !== 'admin') {
      const adminCount = household.users.filter(user => user.role === 'admin').length;
      
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Não é possível remover o último administrador do domicílio' },
          { status: 400 }
        );
      }
    }
    
    // Atualizar papel do usuário
    const updatedUser = await prisma.user.update({
      where: { id: memberUserId },
      data: {
        role: body.role
      }
    });
    
    // Formatar os dados para a resposta
    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role
    });
  } catch (error) {
    console.error('Erro ao atualizar papel do membro:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao atualizar o papel do membro' },
      { status: 500 }
    );
  }
}

// DELETE /api/households/[id]/members/[userId] - Remover membro do domicílio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const householdId = parseInt(params.id);
    const memberUserId = parseInt(params.userId);
    const currentUserId = parseInt(session.user.id);
    
    if (isNaN(householdId) || isNaN(memberUserId)) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }
    
    // Verificar se o domicílio existe
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
    
    // Verificar permissões
    // Um usuário pode remover a si mesmo ou um administrador pode remover qualquer membro
    const currentUser = household.users.find(user => user.id === currentUserId);
    const memberUser = household.users.find(user => user.id === memberUserId);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Você não pertence a este domicílio' },
        { status: 403 }
      );
    }
    
    if (!memberUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado no domicílio' },
        { status: 404 }
      );
    }
    
    // Verificar casos especiais:
    // 1. Se for o último administrador, não pode sair
    // 2. Se não for admin, só pode remover a si mesmo
    if (memberUser.role === 'admin') {
      const adminCount = household.users.filter(user => user.role === 'admin').length;
      
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Não é possível remover o último administrador do domicílio' },
          { status: 400 }
        );
      }
    }
    
    if (currentUser.role !== 'admin' && currentUserId !== memberUserId) {
      return NextResponse.json(
        { error: 'Apenas administradores podem remover outros membros' },
        { status: 403 }
      );
    }
    
    // Remover usuário do domicílio
    await prisma.user.update({
      where: { id: memberUserId },
      data: {
        householdId: null
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover membro:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao remover o membro' },
      { status: 500 }
    );
  }
} 