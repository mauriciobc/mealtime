import { FeedingLog, CatType } from '@/lib/types';
import { BaseCat, BaseFeedingLog } from '../types/common';
import { Notification } from '../types/notification';
import { 
  generateFeedingNotifications,
  isDuplicateFeeding
} from './feeding-notification-service';
import { v2Get, v2Post } from '@/lib/api/v2-client';

/**
 * Busca a última alimentação de um gato
 */
export const getLastFeeding = async (catId: string): Promise<BaseFeedingLog | null> => {
  try {
    return await v2Get<BaseFeedingLog>(`/api/v2/feedings/last/${catId}`);
  } catch (_error) {
    console.error('Erro ao buscar última alimentação:', _error);
    return null;
  }
};

/**
 * Busca um gato específico
 */
export const getCat = async (catId: string): Promise<BaseCat | null> => {
  try {
    return await v2Get<BaseCat>(`/api/v2/cats/${catId}`);
  } catch (_error) {
    console.error('Erro ao buscar gato:', _error);
    return null;
  }
};

/**
 * Registra uma nova alimentação
 */
export const registerFeeding = async (
  catId: string,
  userId: string,
  portionSize: number,
  notes?: string
): Promise<Response> => {
  try {
    const lastFeeding = await getLastFeeding(catId);
    
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

    const data = await v2Post<{ id: string }>('/api/v2/feedings', {
      catId,
      amount: portionSize,
      notes,
    });

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

    return new Response(JSON.stringify(data), { status: 201 });
  } catch (_error) {
    console.error('Erro ao registrar alimentação:', _error);
    throw _error;
  }
};

/**
 * Atualiza o horário de alimentação de um gato
 */
export const updateFeedingSchedule = async (
  catId: string,
  userId: string,
  newSchedule: {
    type: 'interval' | 'fixedTime';
    interval?: number;
    times?: string;
  }
): Promise<Response> => {
  try {
    const payload = {
      catId,
      type: newSchedule.type,
      interval: newSchedule.interval,
      times: newSchedule.times ? newSchedule.times.split(',') : undefined,
      enabled: true,
    };

    const data = await v2Post('/api/v2/schedules', payload);

    const cat = await getCat(catId);
    if (cat) {
      const nextFeedingTime = await getNextFeedingTime(catId, userId);
      if (nextFeedingTime) {
        const notifications = generateFeedingNotifications(
          cat,
          nextFeedingTime,
          userId
        );
        await saveNotifications(notifications);
      }
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (_error) {
    console.error('Erro ao atualizar horário de alimentação:', _error);
    throw _error;
  }
};

/**
 * Busca a próxima alimentação de um gato via API.
 */
export const getNextFeedingTime = async (catId: string, _userId?: string): Promise<Date | null> => {
  console.log(`[getNextFeedingTime] Fetching next feeding for cat: ${catId}`);
  if (!catId) {
    throw new Error('Cat ID is required');
  }

  try {
    const data = await v2Get<{ nextFeeding: string | null }>(`/api/v2/cats/${catId}/next-feeding`);
    
    if (data.nextFeeding === null) {
      console.log(`[getNextFeedingTime] No next feeding time scheduled.`);
      return null;
    }
    
    if (!data.nextFeeding || typeof data.nextFeeding !== 'string') {
      throw new Error('Invalid response format from API');
    }

    const nextDate = new Date(data.nextFeeding);
    if (isNaN(nextDate.getTime())) {
      throw new Error(`Invalid date received from API: ${data.nextFeeding}`);
    }

    console.log(`[getNextFeedingTime] Successfully fetched next feeding time: ${nextDate.toISOString()}`);
    return nextDate;

  } catch (_error) {
    console.error(`[getNextFeedingTime] Error fetching next feeding for ${catId}:`, _error);
    throw _error;
  }
};

/**
 * Busca os logs de alimentação de um gato
 */
export const getFeedingLogs = async (catId: string, _userTimezone?: string): Promise<FeedingLog[]> => {
  console.warn("[getFeedingLogs] THIS FUNCTION IS USING LOCALSTORAGE AND IS LIKELY INCORRECT - Needs refactoring to use API");
  return [];
};

/**
 * Salva notificações no banco de dados
 */
const saveNotifications = async (notifications: Notification[]): Promise<void> => {
  try {
    for (const notification of notifications) {
      await v2Post('/api/v2/notifications', {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        metadata: notification.metadata,
      });
    }
  } catch (_error) {
    console.error('Erro ao salvar notificações:', _error);
  }
};
