import { Notification, CreateNotificationPayload } from "../types/notification";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// Get all notifications for a user with pagination
export async function getUserNotifications(
  userId: number,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Notification>> {
  try {
    const response = await fetch(
      `/api/notifications?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao buscar notificações');
    }

    const data = await response.json();

    // Explicit check for expected structure after successful response
    if (!data || typeof data !== 'object' || !Array.isArray(data.data)) {
      console.error('Resposta inválida ao buscar notificações:', data);
      throw new Error('Resposta inválida do servidor ao buscar notificações');
    }

    return data as PaginatedResponse<Notification>; // Ensure type safety
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    throw error;
  }
}

// Get unread notifications count with cache
export async function getUnreadNotificationsCount(userId: number): Promise<number> {
  try {
    const response = await fetch('/api/notifications/unread-count', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Falha ao buscar contagem de notificações não lidas');
    }

    const data = await response.json();

    // Explicit check for expected structure after successful response
    if (!data || typeof data.count !== 'number') {
      console.error('Resposta inválida ao buscar contagem de notificações não lidas:', data);
      throw new Error('Resposta inválida do servidor ao buscar contagem de notificações');
    }
    
    return data.count;
  } catch (error) {
    console.error('Erro ao buscar contagem de notificações não lidas:', error);
    throw error;
  }
}

// Create a new notification
export async function createNotification(payload: CreateNotificationPayload): Promise<Notification> {
  try {
    // Validate required fields
    const requiredFields = ['title', 'message', 'type', 'userId'];
    const missingFields = requiredFields.filter(field => !payload[field]);
    
    if (missingFields.length > 0) {
      console.error('[NotificationService] Missing required fields:', missingFields);
      throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
    }

    console.log('[NotificationService] Creating notification:', {
      ...payload,
      data: payload.data ? JSON.stringify(payload.data) : null
    });

    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[NotificationService] Server error response:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(data.error || 'Falha ao criar notificação');
    }

    console.log('[NotificationService] Successfully created notification:', data);
    return data;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    throw error;
  }
}

// Mark a notification as read
export async function markNotificationAsRead(id: number): Promise<Notification> {
  try {
    console.log(`[NotificationService] Marking notification as read:`, { id });
    const response = await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[NotificationService] Server error response:`, data);
      throw new Error(data.error || 'Falha ao marcar notificação como lida');
    }

    console.log(`[NotificationService] Successfully marked notification as read:`, data);
    return data;
  } catch (error) {
    console.error(`[NotificationService] Error marking notification as read:`, error);
    throw error;
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  try {
    const response = await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Falha ao marcar todas as notificações como lidas');
    }

    await response.json();
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    throw error;
  }
}

// Delete a notification
export async function deleteNotification(id: number): Promise<void> {
  try {
    const response = await fetch(`/api/notifications/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Falha ao deletar notificação');
    }
  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    throw error;
  }
}

// Helper to get icon based on notification type
function getIconForType(type: string): string {
  switch (type) {
    case 'feeding':
      return 'utensils';
    case 'household':
      return 'users';
    case 'warning':
      return 'alert-triangle';
    case 'error':
      return 'alert-circle';
    case 'info':
    case 'system':
    default:
      return 'bell';
  }
}
