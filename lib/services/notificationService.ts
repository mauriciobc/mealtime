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
  userId: number | string, // Accept string or number
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Notification>> {
  console.log(`[NotificationService] getUserNotifications called: userId=${userId}, page=${page}, limit=${limit}`);
  try {
    const url = `/api/notifications?userId=${userId}&page=${page}&limit=${limit}`; // Pass userId explicitly if needed by API
    console.log(`[NotificationService] Fetching URL: ${url}`);
    const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      }
    );
    console.log(`[NotificationService] getUserNotifications response status: ${response.status}`);

    if (!response.ok) {
      let errorBody = 'No error body available';
      try {
        errorBody = await response.text();
      } catch (e) { /* ignore */ }
      console.error(`[NotificationService] getUserNotifications failed: Status ${response.status}, Body: ${errorBody}`);
      throw new Error(`Falha ao buscar notificações (Status: ${response.status})`);
    }

    const data = await response.json();
    console.log("[NotificationService] getUserNotifications received data:", data);

    // Explicit check for expected structure after successful response
    if (!data || typeof data !== 'object' || !Array.isArray(data.data)) {
      console.error('[NotificationService] Resposta inválida ao buscar notificações:', data);
      throw new Error('Resposta inválida do servidor ao buscar notificações (estrutura)');
    }
    
    // Ensure PaginatedResponse fields are present
    if (typeof data.totalPages !== 'number' || typeof data.hasMore !== 'boolean') {
       console.error('[NotificationService] Resposta inválida ao buscar notificações (campos faltando):', data);
       throw new Error('Resposta inválida do servidor ao buscar notificações (campos)');
    }

    console.log("[NotificationService] getUserNotifications returning successfully.");
    return data as PaginatedResponse<Notification>; // Ensure type safety
  } catch (error) {
    console.error('[NotificationService] Erro ao buscar notificações:', error);
    throw error;
  }
}

// Get unread notifications count with cache
export async function getUnreadNotificationsCount(userId: number | string): Promise<number> {
  console.log(`[NotificationService] getUnreadNotificationsCount called: userId=${userId}`);
  try {
    const url = `/api/notifications/unread-count?userId=${userId}`; // Pass userId explicitly if needed by API
    console.log(`[NotificationService] Fetching URL: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    console.log(`[NotificationService] getUnreadNotificationsCount response status: ${response.status}`);

    if (!response.ok) {
       let errorBody = 'No error body available';
       try {
         errorBody = await response.text();
       } catch (e) { /* ignore */ }
       console.error(`[NotificationService] getUnreadNotificationsCount failed: Status ${response.status}, Body: ${errorBody}`);
      throw new Error(`Falha ao buscar contagem de notificações não lidas (Status: ${response.status})`);
    }

    const data = await response.json();
    console.log("[NotificationService] getUnreadNotificationsCount received data:", data);

    // Explicit check for expected structure after successful response
    if (!data || typeof data.count !== 'number') {
      console.error('[NotificationService] Resposta inválida ao buscar contagem de notificações não lidas:', data);
      throw new Error('Resposta inválida do servidor ao buscar contagem de notificações (estrutura)');
    }
    
    console.log(`[NotificationService] getUnreadNotificationsCount returning count: ${data.count}`);
    return data.count;
  } catch (error) {
    console.error('[NotificationService] Erro ao buscar contagem de notificações não lidas:', error);
    throw error;
  }
}

// Create a new notification
export async function createNotification(payload: CreateNotificationPayload): Promise<Notification> {
  console.log("[NotificationService] createNotification called with payload:", payload);
  try {
    // Validate required fields
    const requiredFields: (keyof CreateNotificationPayload)[] = ['title', 'message', 'type', 'userId'];
    const missingFields = requiredFields.filter(field => !payload[field]);
    
    if (missingFields.length > 0) {
      console.error('[NotificationService] createNotification - Missing required fields:', missingFields);
      throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
    }

    console.log('[NotificationService] createNotification - Payload validated, sending request...');

    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    console.log(`[NotificationService] createNotification response status: ${response.status}`);

    const data = await response.json();
    console.log("[NotificationService] createNotification received response data:", data);

    if (!response.ok) {
      console.error('[NotificationService] createNotification - Server error response:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(data?.error || `Falha ao criar notificação (Status: ${response.status})`);
    }
    
    // Basic validation of the returned notification
    if (!data || typeof data.id !== 'number' || typeof data.title !== 'string') {
       console.error('[NotificationService] createNotification - Invalid notification structure in response:', data);
       throw new Error('Resposta inválida do servidor após criar notificação');
    }

    console.log('[NotificationService] Successfully created notification:', data);
    return data as Notification;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    throw error;
  }
}

// Mark a notification as read
export async function markNotificationAsRead(id: number): Promise<Notification> {
  console.log(`[NotificationService] markNotificationAsRead called for ID: ${id}`);
  try {
    const url = `/api/notifications/${id}/read`;
    console.log(`[NotificationService] Fetching URL (PATCH): ${url}`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    console.log(`[NotificationService] markNotificationAsRead response status: ${response.status}`);

    const data = await response.json();
    console.log("[NotificationService] markNotificationAsRead received response data:", data);

    if (!response.ok) {
      console.error(`[NotificationService] markNotificationAsRead - Server error response:`, {
          status: response.status,
          statusText: response.statusText,
          data
      });
      throw new Error(data?.error || `Falha ao marcar notificação como lida (Status: ${response.status})`);
    }
    
    // Basic validation of the returned notification
    if (!data || typeof data.id !== 'number' || typeof data.isRead !== 'boolean') {
       console.error('[NotificationService] markNotificationAsRead - Invalid notification structure in response:', data);
       throw new Error('Resposta inválida do servidor após marcar como lida');
    }

    console.log(`[NotificationService] Successfully marked notification ${id} as read:`, data);
    return data as Notification;
  } catch (error) {
    console.error(`[NotificationService] Error marking notification ${id} as read:`, error);
    throw error;
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: number | string): Promise<void> {
  console.log(`[NotificationService] markAllNotificationsAsRead called for userId: ${userId}`);
  try {
    const url = `/api/notifications/read-all`;
    console.log(`[NotificationService] Fetching URL (POST): ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      // No body needed, endpoint likely uses session user ID
    });
     console.log(`[NotificationService] markAllNotificationsAsRead response status: ${response.status}`);

    if (!response.ok) {
       let errorBody = 'No error body available';
       try {
         errorBody = await response.text();
       } catch (e) { /* ignore */ }
       console.error(`[NotificationService] markAllNotificationsAsRead failed: Status ${response.status}, Body: ${errorBody}`);
      throw new Error(`Falha ao marcar todas as notificações como lidas (Status: ${response.status})`);
    }

    // Expecting 204 No Content or similar success status without a body usually
    if (response.status !== 204) { 
        try {
            const data = await response.json();
            console.log("[NotificationService] markAllNotificationsAsRead received unexpected JSON response:", data); 
        } catch (e) {
            // If it's not JSON, log as text
            const textData = await response.text();
            console.log("[NotificationService] markAllNotificationsAsRead received unexpected text response:", textData);
        }
    }
    
    console.log(`[NotificationService] Successfully marked all notifications as read for userId: ${userId}`);

  } catch (error) {
    console.error('[NotificationService] Erro ao marcar todas as notificações como lidas:', error);
    throw error;
  }
}

// Delete a notification
export async function deleteNotification(id: number): Promise<void> {
  console.log(`[NotificationService] deleteNotification called for ID: ${id}`);
  try {
    const url = `/api/notifications/${id}`;
    console.log(`[NotificationService] Fetching URL (DELETE): ${url}`);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    console.log(`[NotificationService] deleteNotification response status: ${response.status}`);

    if (!response.ok) {
      let errorBody = 'No error body available';
      let parsedError;
      try {
        parsedError = await response.json();
        errorBody = JSON.stringify(parsedError);
      } catch (e) {
         try {
             errorBody = await response.text();
         } catch (e2) { /* ignore */ }
      }
      console.error(`[NotificationService] deleteNotification failed: Status ${response.status}, Body: ${errorBody}`);
      throw new Error(parsedError?.error || `Falha ao deletar notificação (Status: ${response.status})`);
    }
    
    // Expecting 204 No Content or similar success status
     if (response.status !== 204) { 
        console.warn(`[NotificationService] deleteNotification received status ${response.status} instead of 204, but considered OK.`);
         try {
            const data = await response.json();
            console.log("[NotificationService] deleteNotification received unexpected JSON response:", data); 
        } catch (e) {
            const textData = await response.text();
            console.log("[NotificationService] deleteNotification received unexpected text response:", textData);
        }
     }
     
     console.log(`[NotificationService] Successfully deleted notification ID: ${id}`);

  } catch (error) {
    console.error(`[NotificationService] Erro ao deletar notificação ID ${id}:`, error);
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
