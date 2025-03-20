import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cache } from 'react';

// Função para obter o ID do parâmetro usando cache
const getCatId = cache(async (params: { id: string }) => {
  return params.id;
});

// GET /api/cats/[id] - Obter um gato pelo ID
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Usar cache para obter o id
    const paramId = await getCatId(context.params);
    const id = parseInt(paramId);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const cat = await prisma.cat.findUnique({
      where: { id },
      include: {
        household: {
          select: {
            id: true,
            name: true
          }
        },
        feedingLogs: {
          take: 5,
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    if (!cat) {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(cat);
  } catch (error) {
    console.error('Erro ao buscar gato:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os detalhes do gato' },
      { status: 500 }
    );
  }
}

// PUT /api/cats/[id] - Atualizar um gato
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Usar cache para obter o id
    const paramId = await getCatId(context.params);
    const id = parseInt(paramId);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const {
      name,
      photoUrl,
      birthdate,
      weight,
      restrictions,
      notes,
      householdId
    } = await request.json();

    // Verificar se o gato existe
    const existingCat = await prisma.cat.findUnique({
      where: { id }
    });

    if (!existingCat) {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar o gato
    const updatedCat = await prisma.cat.update({
      where: { id },
      data: {
        name: name || undefined,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
        birthdate: birthdate ? new Date(birthdate) : undefined,
        weight: weight !== undefined ? parseFloat(String(weight)) : undefined,
        restrictions: restrictions !== undefined ? restrictions : undefined,
        notes: notes !== undefined ? notes : undefined,
        householdId: householdId || undefined
      }
    });

    return NextResponse.json(updatedCat);
  } catch (error: any) {
    console.error('Erro ao atualizar gato:', error);
    
    if (error.code) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Gato não encontrado' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Ocorreu um erro ao atualizar o gato' },
      { status: 500 }
    );
  }
}

// DELETE /api/cats/[id] - Excluir um gato
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Usar cache para obter o id
    const paramId = await getCatId(context.params);
    const id = parseInt(paramId);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Verificar se o gato existe
    const existingCat = await prisma.cat.findUnique({
      where: { id }
    });

    if (!existingCat) {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }

    // Excluir os registros de alimentação associados
    await prisma.feedingLog.deleteMany({
      where: { catId: id }
    });

    // Excluir o gato
    await prisma.cat.delete({
      where: { id }
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