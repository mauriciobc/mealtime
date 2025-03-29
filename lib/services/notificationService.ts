import { Notification, CreateNotificationPayload } from "../types/notification";

// Get all notifications for a user
export async function getUserNotifications(userId: number): Promise<Notification[]> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Falha ao buscar notificações');
    }

    const notifications = await response.json();
    return notifications;
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    throw error;
  }
}

// Get unread notifications count
export async function getUnreadNotificationsCount(userId: number): Promise<number> {
  const notifications = await getUserNotifications(userId);
  return notifications.filter(notification => !notification.isRead).length;
}

// Create a new notification
export async function createNotification(payload: CreateNotificationPayload): Promise<Notification> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Falha ao criar notificação');
    }

    const notification = await response.json();
    return notification;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    throw error;
  }
}

// Mark a notification as read
export async function markNotificationAsRead(id: number): Promise<Notification> {
  try {
    const response = await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Falha ao marcar notificação como lida');
    }

    const notification = await response.json();
    return notification;
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
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
      throw new Error('Falha ao deletar notificação');
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
