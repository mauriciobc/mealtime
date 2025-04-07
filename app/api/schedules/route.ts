import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/schedules - Listar agendamentos (filtragem opcional por catId)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const catId = searchParams.get('catId');

    const where = catId 
      ? { catId: parseInt(catId) } 
      : {};

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao buscar os agendamentos' },
      { status: 500 }
    );
  }
}

// POST /api/schedules - Criar um novo agendamento
export async function POST(request: NextRequest) {
  try {
    const {
      catId,
      type,
      interval,
      times,
      overrideUntil
    } = await request.json();

    if (!catId || !type) {
      return NextResponse.json(
        { error: 'ID do gato e tipo de agendamento são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar o tipo de agendamento
    if (type !== 'interval' && type !== 'fixedTime') {
      return NextResponse.json(
        { error: 'Tipo de agendamento inválido' },
        { status: 400 }
      );
    }

    // Validar os dados específicos do tipo
    if (type === 'interval' && (!interval || interval <= 0)) {
      return NextResponse.json(
        { error: 'Intervalo deve ser maior que zero' },
        { status: 400 }
      );
    }

    if (type === 'fixedTime' && (!times || times.trim() === '')) {
      return NextResponse.json(
        { error: 'Horários são obrigatórios para agendamentos de horário fixo' },
        { status: 400 }
      );
    }

    // Verificar se o gato existe
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    });

    if (!cat) {
      return NextResponse.json(
        { error: 'Gato não encontrado' },
        { status: 404 }
      );
    }

    // Criar o agendamento
    const schedule = await prisma.schedule.create({
      data: {
        catId,
        type,
        interval: type === 'interval' ? interval : 0,
        times: type === 'fixedTime' ? times : '',
        overrideUntil: overrideUntil ? new Date(overrideUntil) : null
      }
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao criar o agendamento' },
      { status: 500 }
    );
  }
}

// PATCH /api/schedules/:id - Atualizar um agendamento existente
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
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

    // Atualizar o agendamento
    const updatedSchedule = await prisma.schedule.update({
      where: { id },
      data: {
        type: type || existingSchedule.type,
        interval: interval || existingSchedule.interval,
        times: times || existingSchedule.times,
        overrideUntil: overrideUntil ? new Date(overrideUntil) : existingSchedule.overrideUntil
      }
    });

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro ao atualizar o agendamento' },
      { status: 500 }
    );
  }
} 