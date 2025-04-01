import { FeedingLog, CatType } from '@/lib/types';
import { formatDateTimeForDisplay } from '@/lib/utils/dateUtils';
import { addHours, isBefore, differenceInHours } from 'date-fns';
import { getUserTimezone, calculateNextFeeding } from '../utils/dateUtils';
import { toDate } from 'date-fns-tz';
import { BaseCat, BaseFeedingLog, ID } from '../types/common';
import { Notification } from '../types/notification';
import { 
  generateFeedingNotifications,
  isDuplicateFeeding
} from './feeding-notification-service';
import { getData, setData, delay } from './apiService';

/**
 * Busca a última alimentação de um gato
 */
export const getLastFeeding = async (catId: number): Promise<BaseFeedingLog | null> => {
  try {
    const response = await fetch(`/api/feedings/last/${catId}`);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Erro ao buscar última alimentação:', error);
    return null;
  }
};

/**
 * Busca um gato específico
 */
export const getCat = async (catId: number): Promise<BaseCat | null> => {
  try {
    const response = await fetch(`/api/cats/${catId}`);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Erro ao buscar gato:', error);
    return null;
  }
};

/**
 * Registra uma nova alimentação
 */
export const registerFeeding = async (
  catId: number,
  userId: number,
  portionSize: number,
  notes?: string
): Promise<Response> => {
  try {
    // Buscar última alimentação do gato
    const lastFeeding = await getLastFeeding(catId);
    
    // Verificar se é uma alimentação duplicada
    if (lastFeeding && isDuplicateFeeding(new Date(lastFeeding.timestamp))) {
      const cat = await getCat(catId);
      if (cat) {
        const notifications = generateFeedingNotifications(
          cat,
          new Date(),
          userId,
          new Date(lastFeeding.timestamp)
        );
        await saveNotifications(notifications);
      }
      throw new Error('Tentativa de alimentação duplicada');
    }

    // Registrar a alimentação
    const response = await fetch('/api/feedings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        catId: catId.toString(),
        userId: userId.toString(),
        portionSize,
        notes,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao registrar alimentação');
    }

    // Buscar informações do gato para notificação
    const cat = await getCat(catId);
    if (cat) {
      const notifications = generateFeedingNotifications(
        cat,
        new Date(),
        userId,
        lastFeeding ? new Date(lastFeeding.timestamp) : null
      );
      await saveNotifications(notifications);
    }

    return response;
  } catch (error) {
    console.error('Erro ao registrar alimentação:', error);
    throw error;
  }
};

/**
 * Atualiza o horário de alimentação de um gato
 */
export const updateFeedingSchedule = async (
  catId: number,
  userId: number,
  newSchedule: {
    type: 'interval' | 'fixedTime';
    interval?: number;
    times?: string;
  }
): Promise<Response> => {
  try {
    const response = await fetch(`/api/cats/${catId}/schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newSchedule),
    });

    if (!response.ok) {
      throw new Error('Falha ao atualizar horário de alimentação');
    }

    // Buscar informações do gato para notificação
    const cat = await getCat(catId);
    if (cat) {
      const nextFeedingTime = await getNextFeedingTime(catId);
      if (nextFeedingTime) {
        const notifications = generateFeedingNotifications(
          cat,
          nextFeedingTime,
          userId
        );
        await saveNotifications(notifications);
      }
    }

    return response;
  } catch (error) {
    console.error('Erro ao atualizar horário de alimentação:', error);
    throw error;
  }
};

/**
 * Busca a próxima alimentação de um gato
 */
export const getNextFeedingTime = async (catId: number): Promise<Date | null> => {
  try {
    const response = await fetch(`/api/cats/${catId}/next-feeding`);
    if (!response.ok) {
      console.error('Erro ao buscar via API, tentando cálculo local');
      return calculateNextFeedingLocally(catId);
    }
    
    const data = await response.json();
    return data ? new Date(data) : null;
  } catch (error) {
    console.error('Erro ao buscar próxima alimentação:', error);
    return null;
  }
};

/**
 * Busca os logs de alimentação de um gato
 */
export const getFeedingLogs = async (catId: string, userTimezone?: string): Promise<FeedingLog[]> => {
  await delay(300);
  console.log('\n[getFeedingLogs] Buscando logs:');
  console.log('- CatId:', catId);
  console.log('- Timezone recebido:', userTimezone);
  
  const logs = await getData<FeedingLog>('feedingLogs');
  console.log('- Total de logs encontrados (antes do filtro):', logs.length);
  
  const timezone = getUserTimezone(userTimezone);
  console.log('- Timezone resolvido:', timezone);
  
  const filteredLogs = logs.filter(log => log.catId === parseInt(catId));
  console.log('- Total de logs após filtro por catId:', filteredLogs.length);
  
  const sortedLogs = filteredLogs.sort((a, b) => {
    const dateA = toDate(new Date(a.timestamp), { timeZone: timezone });
    const dateB = toDate(new Date(b.timestamp), { timeZone: timezone });
    return dateB.getTime() - dateA.getTime();
  });

  console.log('- Logs ordenados:', sortedLogs.map(log => ({
    id: log.id,
    catId: log.catId,
    timestamp: formatDateTimeForDisplay(new Date(log.timestamp), timezone)
  })));

  return sortedLogs.map(log => ({
    ...log,
    timestamp: log.timestamp || toDate(new Date(), { timeZone: timezone })
  }));
};

/**
 * Função auxiliar para cálculo local da próxima alimentação
 */
async function calculateNextFeedingLocally(catId: number, userTimezone?: string): Promise<Date | null> {
  try {
    const timezone = getUserTimezone(userTimezone);
    console.log('\n[calculateNextFeedingLocally] Iniciando cálculo:');
    console.log('- CatId:', catId);
    console.log('- Timezone recebido:', userTimezone);
    console.log('- Timezone resolvido:', timezone);
    
    const now = toDate(new Date(), { timeZone: timezone });
    console.log('- Data atual:', formatDateTimeForDisplay(now, timezone));
    
    // Obter logs ordenados por timestamp
    const logs = await getFeedingLogs(catId.toString(), timezone);
    console.log('- Total de logs encontrados:', logs.length);
    
    const lastFeeding = logs
      .sort((a, b) => {
        const dateA = toDate(new Date(a.timestamp), { timeZone: timezone });
        const dateB = toDate(new Date(b.timestamp), { timeZone: timezone });
        return dateB.getTime() - dateA.getTime();
      })[0];

    // Se não houver logs, retorna null
    if (!lastFeeding) {
      console.log('- Nenhum log de alimentação encontrado');
      return null;
    }

    console.log('- Última alimentação encontrada:', {
      id: lastFeeding.id,
      timestamp: formatDateTimeForDisplay(new Date(lastFeeding.timestamp), timezone)
    });

    // Obter gato e seu agendamento
    const response = await fetch(`/api/cats/${catId}`);
    if (!response.ok) {
      console.log('- Gato não encontrado');
      return null;
    }

    const cat = await response.json() as CatType;
    console.log('- Dados do gato:', {
      id: cat.id,
      name: cat.name,
      feeding_interval: cat.feeding_interval,
      schedules: cat.schedules?.map(s => ({
        enabled: s.enabled,
        type: s.type,
        interval: s.interval
      }))
    });

    // Se houver um agendamento ativo
    const activeSchedule = cat.schedules?.find(s => s.enabled);
    if (activeSchedule && activeSchedule.interval) {
      console.log('- Usando agendamento ativo:', {
        type: activeSchedule.type,
        interval: activeSchedule.interval
      });
      
      const nextFeeding = calculateNextFeeding(new Date(lastFeeding.timestamp), activeSchedule.interval, timezone);
      console.log('- Próxima alimentação calculada (agendamento):', formatDateTimeForDisplay(nextFeeding, timezone));
      return nextFeeding;
    }
    // Se não houver agendamento mas tiver intervalo padrão
    else if (cat.feeding_interval) {
      console.log('- Usando intervalo padrão:', cat.feeding_interval);
      const nextFeeding = calculateNextFeeding(new Date(lastFeeding.timestamp), cat.feeding_interval, timezone);
      console.log('- Próxima alimentação calculada (intervalo padrão):', formatDateTimeForDisplay(nextFeeding, timezone));
      return nextFeeding;
    }

    console.log('- Nenhum intervalo ou agendamento encontrado');
    return null;
  } catch (error) {
    console.error('[calculateNextFeedingLocally] Erro durante o cálculo local:', error);
    return null;
  }
}

/**
 * Salva notificações no banco de dados
 */
const saveNotifications = async (notifications: Notification[]): Promise<void> => {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notifications),
    });
  } catch (error) {
    console.error('Erro ao salvar notificações:', error);
  }
}; 