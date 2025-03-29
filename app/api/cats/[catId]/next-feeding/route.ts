import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { addHours, addMinutes, format, parse } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: { catId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const catId = parseInt(params.catId);
    if (isNaN(catId)) {
      return NextResponse.json(
        { error: 'ID do gato inválido' },
        { status: 400 }
      );
    }

    // Verificar se o gato pertence ao usuário através do household
    const userHouseholds = await prisma.household.findMany({
      where: {
        users: {
          some: {
            id: Number(session.user.id)
          }
        }
      },
      select: {
        id: true
      }
    });

    const householdIds = userHouseholds.map(h => h.id);

    const cat = await prisma.cat.findFirst({
      where: {
        id: catId,
        householdId: {
          in: householdIds
        }
      },
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

    // Buscar última alimentação
    const lastFeeding = await prisma.feedingLog.findFirst({
      where: {
        catId
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    const now = new Date();
    let nextFeedingTime: Date | null = null;

    // Se houver um agendamento
    if (cat.schedules && cat.schedules.length > 0) {
      const schedule = cat.schedules[0];

      if (schedule.type === 'interval') {
        // Se for baseado em intervalo
        if (lastFeeding) {
          nextFeedingTime = addHours(new Date(lastFeeding.timestamp), schedule.interval);
        } else {
          nextFeedingTime = addHours(now, schedule.interval);
        }
      } else if (schedule.type === 'fixedTime') {
        // Se for horário fixo
        const times = schedule.times.split(',');
        const timesList = times.map(time => {
          const [hours, minutes] = time.split(':').map(Number);
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          
          // Se o horário já passou hoje, agendar para amanhã
          if (date < now) {
            date.setDate(date.getDate() + 1);
          }
          
          return date;
        });
        
        // Ordenar para encontrar o próximo horário
        timesList.sort((a, b) => a.getTime() - b.getTime());
        nextFeedingTime = timesList[0];
      }
    } else {
      // Se não houver agendamento, usar o intervalo padrão
      if (lastFeeding) {
        nextFeedingTime = addHours(new Date(lastFeeding.timestamp), cat.feeding_interval);
      } else {
        nextFeedingTime = addHours(now, cat.feeding_interval);
      }
    }

    return NextResponse.json(nextFeedingTime?.toISOString() || null);
  } catch (error) {
    console.error('Erro ao buscar próxima alimentação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 