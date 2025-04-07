import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addHours, addMinutes, format, parse } from 'date-fns';
import { getNumericId } from '@/lib/utils/api-utils';

export async function GET(
  request: Request,
  { params }: { params: { catId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { catId: catIdParam } = params;
    console.log(`[API /cats/[id]/next-feeding] Received catId param: '${catIdParam}'`);

    if (typeof catIdParam !== 'string' || !catIdParam) {
      console.error('[API /cats/[id]/next-feeding] Invalid or missing catId parameter.');
      return NextResponse.json({ error: 'ID do gato inválido ou ausente' }, { status: 400 });
    }

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    console.log(`[API /cats/[id]/next-feeding] Calling getNumericId with: '${catIdParam}'`);
    const catId = await getNumericId(catIdParam);
    console.log(`[API /cats/[id]/next-feeding] Got numeric catId: ${catId}`);

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
    const lastFeedingTimestamp = lastFeeding?.timestamp ? new Date(lastFeeding.timestamp) : null;
    const isValidLastFeeding = lastFeedingTimestamp && !isNaN(lastFeedingTimestamp.getTime());

    // Se houver um agendamento
    if (cat.schedules && cat.schedules.length > 0) {
      const schedule = cat.schedules[0];

      if (schedule.type === 'interval') {
        // Se for baseado em intervalo
        if (typeof schedule.interval === 'number' && !isNaN(schedule.interval)) {
          if (isValidLastFeeding) {
            nextFeedingTime = addHours(lastFeedingTimestamp, schedule.interval);
          } else {
            nextFeedingTime = addHours(now, schedule.interval);
          }
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
        if (timesList.length > 0 && !isNaN(timesList[0].getTime())) {
           nextFeedingTime = timesList[0];
        }
      }
    } else {
      // Se não houver agendamento, usar o intervalo padrão
      if (typeof cat.feedingInterval === 'number' && !isNaN(cat.feedingInterval)) {
        if (lastFeedingTimestamp) {
          nextFeedingTime = addHours(lastFeedingTimestamp, cat.feedingInterval);
        } else {
          nextFeedingTime = addHours(now, cat.feedingInterval);
        }
      }
    }

    // Only attempt toISOString if nextFeedingTime is a valid Date
    const responseBody = nextFeedingTime instanceof Date && !isNaN(nextFeedingTime.getTime()) 
      ? nextFeedingTime.toISOString() 
      : null;

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Erro ao buscar próxima alimentação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 