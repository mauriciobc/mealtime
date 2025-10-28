import { BaseCat, BaseFeedingLog } from '../types/common';
import { Notification } from '../types/notification';
import { generateFeedingNotifications, isDuplicateFeeding } from './feeding-notification-service';

/**
 * Busca a última alimentação de um gato
 */
export const getLastFeeding = async (catId: string): Promise<BaseFeedingLog | null> => {
  try {
    const response = await fetch(`/api/feedings/last/${catId}`);
    if (!response.ok) return null;
    return response.json();
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
    const response = await fetch(`/api/cats/${catId}`);
    if (!response.ok) return null;
    return response.json();
  } catch (_error) {
    console.error('Erro ao buscar gato:', _error);
    return null;
  }
};

export const registerFeeding = async (
  catId: string,
  userId: string,
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
        catId,
        userId,
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

    return response;
  } catch (_error) {
    console.error('Erro ao atualizar horário de alimentação:', _error);
    throw _error;
  }
};

/**
 * Busca a próxima alimentação de um gato
 */
export const getNextFeedingTime = async (catId: string, userId: string): Promise<Date | null> => {
  try {
    const response = await fetch(`/api/cats/${catId}/next-feeding`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    const _data = await response.json();
    return _data ? new Date(_data) : null;
  } catch (_error) {
    console.error('Erro ao buscar próxima alimentação:', _error);
    return null;
  }
};

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
  } catch (_error) {
    console.error('Erro ao salvar notificações:', _error);
  }
}; 