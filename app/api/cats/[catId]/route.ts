import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNumericId } from '@/lib/utils/api-utils';

// GET /api/cats/[catId] - Obter um gato pelo ID
export async function GET(
  request: NextRequest,
  context: { params: { catId: string } }
) {
  try {
    const params = await context.params;
    // Obter e validar o ID
    const id = await getNumericId(params.catId);

    const cat = await prisma.cat.findUnique({
      where: { id },
      include: {
        household: {
          select: {
            id: true,
            name: true
          }
        },
        schedules: true,
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
    if (error instanceof Error && error.message === 'ID inválido') {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os detalhes do gato' },
      { status: 500 }
    );
  }
}

// PUT /api/cats/[catId] - Atualizar um gato
export async function PUT(
  request: NextRequest,
  context: { params: { catId: string } }
) {
  try {
    const params = await context.params;
    // Obter e validar o ID
    const id = await getNumericId(params.catId);
    
    const {
      name,
      photoUrl,
      birthdate,
      weight,
      restrictions,
      notes,
      householdId,
      schedules,
      feeding_interval
    } = await request.json();

    // Verificar se o gato existe
    const existingCat = await prisma.cat.findUnique({
      where: { id },
      include: {
        schedules: true,
        feedingLogs: {
          take: 5,
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    if (!existingCat) {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }

    // Validar o intervalo de alimentação se fornecido
    if (feeding_interval !== undefined) {
      const interval = parseInt(String(feeding_interval));
      if (isNaN(interval) || interval < 1 || interval > 24) {
        return NextResponse.json(
          { error: 'O intervalo de alimentação deve estar entre 1 e 24 horas' },
          { status: 400 }
        );
      }
    }

    // Atualizar o gato com tratamento adequado dos campos
    const updatedCat = await prisma.cat.update({
      where: { id },
      data: {
        name: name || undefined,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
        birthdate: birthdate ? new Date(birthdate) : undefined,
        weight: weight !== undefined ? parseFloat(String(weight)) : undefined,
        restrictions: restrictions !== undefined ? restrictions : undefined,
        notes: notes !== undefined ? notes : undefined,
        householdId: householdId || undefined,
        feeding_interval: feeding_interval !== undefined ? parseInt(String(feeding_interval)) : undefined,
        schedules: schedules ? {
          deleteMany: {}, // Remove schedules existentes
          create: schedules.map((schedule: any) => ({
            type: schedule.type,
            interval: schedule.interval,
            times: schedule.times || "[]", // Fornecer um valor padrão para times
            overrideUntil: schedule.overrideUntil ? new Date(schedule.overrideUntil) : null,
            createdAt: schedule.createdAt || new Date()
          }))
        } : undefined
      },
      include: {
        schedules: true,
        feedingLogs: {
          take: 5,
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    return NextResponse.json(updatedCat);
  } catch (error: any) {
    console.error('Erro ao atualizar gato:', error);
    
    if (error.message === 'ID inválido') {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Ocorreu um erro ao atualizar o gato' },
      { status: 500 }
    );
  }
}

// DELETE /api/cats/[catId] - Excluir um gato
export async function DELETE(
  request: NextRequest,
  context: { params: { catId: string } }
) {
  try {
    // Obter e validar o ID
    const id = await getNumericId(context.params.catId);

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
    if (error instanceof Error && error.message === 'ID inválido') {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Ocorreu um erro ao excluir o gato' },
      { status: 500 }
    );
  }
} 