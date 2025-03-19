import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schedules/[id] - Obter um agendamento específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      }
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar o agendamento' },
      { status: 500 }
    );
  }
}

// PATCH /api/schedules/[id] - Atualizar um agendamento
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const {
      type,
      interval,
      times,
      overrideUntil
    } = await request.json();

    // Verificar se o agendamento existe
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id }
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    // Validar o tipo de agendamento, se fornecido
    if (type && type !== 'interval' && type !== 'fixedTime') {
      return NextResponse.json(
        { error: 'Tipo de agendamento inválido' },
        { status: 400 }
      );
    }

    // Validar os dados específicos do tipo
    if (type === 'interval' && interval !== undefined && interval <= 0) {
      return NextResponse.json(
        { error: 'Intervalo deve ser maior que zero' },
        { status: 400 }
      );
    }

    if (type === 'fixedTime' && times !== undefined && times.trim() === '') {
      return NextResponse.json(
        { error: 'Horários são obrigatórios para agendamentos de horário fixo' },
        { status: 400 }
      );
    }

    // Preparar os dados para atualização
    const updateData: any = {};

    if (type !== undefined) updateData.type = type;
    
    if (type === 'interval' && interval !== undefined) {
      updateData.interval = interval;
      updateData.times = '';
    } else if (type === 'fixedTime' && times !== undefined) {
      updateData.times = times;
      updateData.interval = 0;
    } else {
      // Se apenas o intervalo ou os horários forem atualizados, sem mudar o tipo
      if (interval !== undefined && existingSchedule.type === 'interval') {
        updateData.interval = interval;
      }
      if (times !== undefined && existingSchedule.type === 'fixedTime') {
        updateData.times = times;
      }
    }

    if (overrideUntil !== undefined) {
      updateData.overrideUntil = overrideUntil ? new Date(overrideUntil) : null;
    }

    // Atualizar o agendamento
    const schedule = await prisma.schedule.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao atualizar o agendamento' },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules/[id] - Excluir um agendamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Verificar se o agendamento existe
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id }
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      );
    }

    // Excluir o agendamento
    await prisma.schedule.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Agendamento excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao excluir o agendamento' },
      { status: 500 }
    );
  }
} 