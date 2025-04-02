import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { BaseCat } from '@/lib/types/common';

// GET /api/households/[id]/cats/[catId] - Obter um gato específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; catId: string } }
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
    const catId = parseInt(params.catId);
    
    if (isNaN(householdId) || isNaN(catId)) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário pertence ao domicílio
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
    
    const userId = parseInt(session.user.id as string);
    const userBelongsToHousehold = household.users.some(user => user.id === userId);
    
    if (!userBelongsToHousehold) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar este domicílio' },
        { status: 403 }
      );
    }
    
    // Buscar o gato
    const cat = await prisma.cat.findUnique({
      where: { id: catId },
      include: {
        schedules: true
      }
    });
    
    if (!cat) {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se o gato pertence ao domicílio
    if (cat.householdId !== householdId) {
      return NextResponse.json(
        { error: 'Este gato não pertence ao domicílio especificado' },
        { status: 400 }
      );
    }
    
    // Formatar os dados para a resposta
    const formattedCat: BaseCat = {
      id: cat.id,
      name: cat.name,
      photoUrl: cat.photoUrl || undefined,
      birthdate: cat.birthdate || undefined,
      weight: cat.weight || undefined,
      restrictions: cat.restrictions || undefined,
      householdId: cat.householdId,
      feedingInterval: cat.feedingInterval || 8
    };
    
    return NextResponse.json(formattedCat);
  } catch (error) {
    console.error('Erro ao buscar gato:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar o gato' },
      { status: 500 }
    );
  }
}

// PATCH /api/households/[id]/cats/[catId] - Atualizar um gato
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; catId: string } }
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
    const catId = parseInt(params.catId);
    
    if (isNaN(householdId) || isNaN(catId)) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário pertence ao domicílio
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
    
    const userId = parseInt(session.user.id as string);
    const userInHousehold = household.users.find(user => user.id === userId);
    
    if (!userInHousehold) {
      return NextResponse.json(
        { error: 'Você não pertence a este domicílio' },
        { status: 403 }
      );
    }
    
    // Buscar o gato
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    });
    
    if (!cat) {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se o gato pertence ao domicílio
    if (cat.householdId !== householdId) {
      return NextResponse.json(
        { error: 'Este gato não pertence ao domicílio especificado' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    console.log('Received update request with body:', body);
    
    // Validar dados
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
      return NextResponse.json(
        { error: 'Nome do gato inválido' },
        { status: 400 }
      );
    }

    if (body.feedingInterval !== undefined) {
      const interval = parseInt(String(body.feedingInterval));
      if (isNaN(interval) || interval < 1 || interval > 24) {
        return NextResponse.json(
          { error: 'O intervalo de alimentação deve estar entre 1 e 24 horas' },
          { status: 400 }
        );
      }
    }

    // Preparar dados para atualização
    const updateData = {
      name: body.name !== undefined ? body.name : undefined,
      photoUrl: body.photoUrl !== undefined ? body.photoUrl : undefined,
      birthdate: body.birthdate !== undefined 
        ? (body.birthdate ? new Date(body.birthdate) : null) 
        : undefined,
      weight: body.weight !== undefined ? body.weight : undefined,
      restrictions: body.restrictions !== undefined ? body.restrictions : undefined,
      notes: body.notes !== undefined ? body.notes : undefined,
      feedingInterval: body.feedingInterval !== undefined ? parseInt(String(body.feedingInterval)) : undefined,
      portion_size: body.portion_size !== undefined ? parseFloat(String(body.portion_size)) : undefined
    };

    console.log('Attempting to update cat with data:', updateData);
    
    // Atualizar o gato
    const updatedCat = await prisma.cat.update({
      where: { id: catId },
      data: updateData
    });
    
    console.log('Cat updated successfully:', updatedCat);
    
    // Formatar os dados para a resposta
    const formattedCat = {
      id: updatedCat.id.toString(),
      name: updatedCat.name,
      photoUrl: updatedCat.photoUrl,
      birthdate: updatedCat.birthdate,
      weight: updatedCat.weight,
      restrictions: updatedCat.restrictions,
      notes: updatedCat.notes,
      feedingInterval: updatedCat.feedingInterval,
      portion_size: updatedCat.portion_size,
      householdId: updatedCat.householdId
    };
    
    return NextResponse.json(formattedCat);
  } catch (error: any) {
    console.error('Erro ao atualizar gato:', error);
    console.error('Stack trace:', error.stack);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Conflito ao atualizar dados do gato' },
        { status: 409 }
      );
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Ocorreu um erro ao atualizar o gato: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/households/[id]/cats/[catId] - Excluir um gato
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; catId: string } }
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
    const catId = parseInt(params.catId);
    
    if (isNaN(householdId) || isNaN(catId)) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }
    
    // Verificar se o usuário pertence ao domicílio e é administrador
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
    
    const userId = parseInt(session.user.id as string);
    const userInHousehold = household.users.find(user => user.id === userId);
    
    if (!userInHousehold) {
      return NextResponse.json(
        { error: 'Você não pertence a este domicílio' },
        { status: 403 }
      );
    }
    
    // Buscar o gato
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    });
    
    if (!cat) {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se o gato pertence ao domicílio
    if (cat.householdId !== householdId) {
      return NextResponse.json(
        { error: 'Este gato não pertence ao domicílio especificado' },
        { status: 400 }
      );
    }
    
    // Excluir o gato (isso também excluirá as programações associadas)
    await prisma.cat.delete({
      where: { id: catId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir gato:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao excluir o gato' },
      { status: 500 }
    );
  }
} 