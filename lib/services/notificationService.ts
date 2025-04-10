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
          'Accept': 'application/json',
        },
        credentials: 'include'
      }
    );
    console.log(`[NotificationService] getUserNotifications response status: ${response.status}`);

    if (!response.ok) {
      let errorMsg = `Falha ao buscar notificações (Status: ${response.status})`;
      let errorBody = '';
      try {
        // Try reading error body regardless of content type for logging
        errorBody = await response.text();
        console.error(`[NotificationService] getUserNotifications failed: Status ${response.status}, Body: ${errorBody}`);
        // If it happens to be JSON, try to parse for a specific message
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const errorData = JSON.parse(errorBody); // Use JSON.parse since we already read text
            errorMsg = errorData.error || errorMsg;
        }
      } catch (e) {
         console.error(`[NotificationService] Failed to read or parse error body:`, e);
      }
      throw new Error(errorMsg);
    }

    // Handle success case
    const contentType = response.headers.get("content-type");
    if (!(contentType && contentType.includes("application/json"))) {
      const textResponse = await response.text();
      console.error("[NotificationService] getUserNotifications - Server returned non-JSON success response:", textResponse);
      throw new Error("Resposta inesperada do servidor ao buscar notificações.");
    }

    let data: any;
    try {
        data = await response.json();
    } catch (parseError) {
        console.error("[NotificationService] getUserNotifications - Failed to parse successful JSON response:", parseError);
        throw new Error("Falha ao processar a resposta do servidor ao buscar notificações.");
    }

    console.log("[NotificationService] getUserNotifications received data:", data);

    // Existing validation remains important
    if (!data || typeof data !== 'object' || !Array.isArray(data.data)) {
      console.error('[NotificationService] Resposta inválida ao buscar notificações:', data);
      throw new Error('Resposta inválida do servidor ao buscar notificações (estrutura)');
    }
    if (typeof data.totalPages !== 'number' || typeof data.hasMore !== 'boolean') {
       console.error('[NotificationService] Resposta inválida ao buscar notificações (campos faltando):', data);
       throw new Error('Resposta inválida do servidor ao buscar notificações (campos)');
    }

    console.log("[NotificationService] getUserNotifications returning successfully.");
    return data as PaginatedResponse<Notification>; // Ensure type safety
  } catch (error) {
    console.error('[NotificationService] Erro ao buscar notificações:', error);
    throw error; // Re-throw error
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
        'Accept': 'application/json',
      },
      credentials: 'include'
    });
    console.log(`[NotificationService] getUnreadNotificationsCount response status: ${response.status}`);

    if (!response.ok) {
       let errorMsg = `Falha ao buscar contagem de notificações não lidas (Status: ${response.status})`;
       let errorBody = '';
       try {
         errorBody = await response.text();
         console.error(`[NotificationService] getUnreadNotificationsCount failed: Status ${response.status}, Body: ${errorBody}`);
         const contentType = response.headers.get("content-type");
         if (contentType && contentType.includes("application/json")) {
             const errorData = JSON.parse(errorBody);
             errorMsg = errorData.error || errorMsg;
         }
       } catch (e) {
          console.error(`[NotificationService] Failed to read or parse error body:`, e);
       }
      throw new Error(errorMsg);
    }

    // Handle success case
    const contentType = response.headers.get("content-type");
    if (!(contentType && contentType.includes("application/json"))) {
      const textResponse = await response.text();
      console.error("[NotificationService] getUnreadNotificationsCount - Server returned non-JSON success response:", textResponse);
      throw new Error("Resposta inesperada do servidor ao buscar contagem.");
    }

    let data: any;
    try {
        data = await response.json();
    } catch (parseError) {
        console.error("[NotificationService] getUnreadNotificationsCount - Failed to parse successful JSON response:", parseError);
        throw new Error("Falha ao processar a resposta do servidor ao buscar contagem.");
    }

    console.log("[NotificationService] getUnreadNotificationsCount received data:", data);

    // Existing validation remains important
    if (!data || typeof data.count !== 'number') {
      console.error('[NotificationService] Resposta inválida ao buscar contagem de notificações não lidas:', data);
      throw new Error('Resposta inválida do servidor ao buscar contagem de notificações (estrutura)');
    }

    console.log(`[NotificationService] getUnreadNotificationsCount returning count: ${data.count}`);
    return data.count;
  } catch (error) {
    console.error('[NotificationService] Erro ao buscar contagem de notificações não lidas:', error);
    throw error; // Re-throw error
  }
}

// Create a new notification
export async function createNotification(payload: CreateNotificationPayload): Promise<Notification> {
  console.log("[NotificationService] createNotification called with payload:", payload);
  try {
    // Existing validation for payload
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
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    console.log(`[NotificationService] createNotification response status: ${response.status}`);

    if (!response.ok) {
      let errorMsg = `Falha ao criar notificação (Status: ${response.status})`;
      let errorBody = '';
      try {
        errorBody = await response.text();
         console.error('[NotificationService] createNotification - Server error response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorBody
         });
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const errorData = JSON.parse(errorBody);
            errorMsg = errorData.error || errorMsg;
        }
      } catch (e) {
        console.error(`[NotificationService] createNotification - Failed to read or parse error body:`, e);
      }
      throw new Error(errorMsg);
    }

    // Handle success case
    const contentType = response.headers.get("content-type");
     if (!(contentType && contentType.includes("application/json"))) {
      const textResponse = await response.text();
      console.error("[NotificationService] createNotification - Server returned non-JSON success response:", textResponse);
      throw new Error("Resposta inesperada do servidor após criar notificação.");
    }

    let data: any;
    try {
        data = await response.json();
    } catch (parseError) {
        console.error("[NotificationService] createNotification - Failed to parse successful JSON response:", parseError);
        throw new Error("Falha ao processar a resposta do servidor após criar notificação.");
    }

    console.log("[NotificationService] createNotification received response data:", data);

    // Basic validation of the returned notification
    if (!data || typeof data.id !== 'number' || typeof data.title !== 'string') {
       console.error('[NotificationService] createNotification - Invalid notification structure in response:', data);
       throw new Error('Resposta inválida do servidor após criar notificação');
    }

    console.log('[NotificationService] Successfully created notification:', data);
    return data as Notification;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    throw error; // Re-throw error
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
        'Accept': 'application/json',
      },
      credentials: 'include'
    });
    console.log(`[NotificationService] markNotificationAsRead response status: ${response.status}`);

     if (!response.ok) {
      let errorMsg = `Falha ao marcar notificação como lida (Status: ${response.status})`;
      let errorBody = '';
      try {
        errorBody = await response.text();
         console.error('[NotificationService] markNotificationAsRead - Server error response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorBody
         });
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const errorData = JSON.parse(errorBody);
            errorMsg = errorData.error || errorMsg;
        }
      } catch (e) {
        console.error(`[NotificationService] markNotificationAsRead - Failed to read or parse error body:`, e);
      }
      throw new Error(errorMsg);
    }

    // Handle success case
    const contentType = response.headers.get("content-type");
     if (!(contentType && contentType.includes("application/json"))) {
        // If status is 204 No Content, this is expected, return mock or handle appropriately
        if (response.status === 204) {
            console.warn("[NotificationService] markNotificationAsRead - Received 204 No Content, cannot return notification data.");
            // Decide what to return here. Maybe fetch the notification again? Or return a partial object?
            // For now, let's throw, as the return type expects a full Notification object.
             throw new Error("Servidor retornou sucesso sem conteúdo, incapaz de confirmar dados.");
        }
      const textResponse = await response.text();
      console.error("[NotificationService] markNotificationAsRead - Server returned non-JSON success response:", textResponse);
      throw new Error("Resposta inesperada do servidor após marcar como lida.");
    }

    let data: any;
    try {
        data = await response.json();
    } catch (parseError) {
        console.error("[NotificationService] markNotificationAsRead - Failed to parse successful JSON response:", parseError);
        throw new Error("Falha ao processar a resposta do servidor após marcar como lida.");
    }

    console.log("[NotificationService] markNotificationAsRead received response data:", data);

    // Basic validation of the returned notification
    if (!data || typeof data.id !== 'number' || typeof data.isRead !== 'boolean') {
       console.error('[NotificationService] markNotificationAsRead - Invalid notification structure in response:', data);
       throw new Error('Resposta inválida do servidor após marcar como lida');
    }

    console.log(`[NotificationService] Successfully marked notification ${id} as read:`, data);
    return data as Notification;
  } catch (error) {
    console.error(`[NotificationService] Error marking notification ${id} as read:`, error);
    throw error; // Re-throw error
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
        'Content-Type': 'application/json', // Keep Content-Type even if body is empty
         'Accept': 'application/json, text/plain, */*', // Accept anything, as 204 is common
      },
      credentials: 'include',
      // No body needed, endpoint likely uses session user ID
    });
     console.log(`[NotificationService] markAllNotificationsAsRead response status: ${response.status}`);

    if (!response.ok) {
       let errorMsg = `Falha ao marcar todas as notificações como lidas (Status: ${response.status})`;
       let errorBody = '';
       try {
         errorBody = await response.text();
         console.error(`[NotificationService] markAllNotificationsAsRead failed: Status ${response.status}, Body:`, errorBody);
         const contentType = response.headers.get("content-type");
         if (contentType && contentType.includes("application/json")) {
             const errorData = JSON.parse(errorBody);
             errorMsg = errorData.error || errorMsg;
         }
       } catch (e) {
         console.error(`[NotificationService] markAllNotificationsAsRead - Failed to read or parse error body:`, e);
       }
      throw new Error(errorMsg);
    }

    // Handle success case - usually 204 No Content for this type of operation
    if (response.status === 204) {
      console.log(`[NotificationService] Successfully marked all notifications as read (204 No Content) for userId: ${userId}`);
      return; // Success without body
    }

    // If we got a 200 OK or other 2xx status with a body, try to process it but log warnings.
    console.warn(`[NotificationService] markAllNotificationsAsRead received status ${response.status} instead of 204.`);
    const contentType = response.headers.get("content-type");
    let responseBody = '';
     try {
        responseBody = await response.text(); // Read as text first
        if (contentType && contentType.includes("application/json")) {
            const data = JSON.parse(responseBody);
            console.log("[NotificationService] markAllNotificationsAsRead received unexpected JSON response:", data);
        } else {
            console.log("[NotificationService] markAllNotificationsAsRead received unexpected text response:", responseBody);
        }
    } catch (e) {
        console.error("[NotificationService] markAllNotificationsAsRead - Failed to read or parse unexpected success body:", e);
        // Don't necessarily throw here, as the operation might have succeeded on the server
    }

     // Continue considering it a success if response.ok was true
     console.log(`[NotificationService] Operation markAllNotificationsAsRead considered successful for userId: ${userId}`);


  } catch (error) {
    console.error('[NotificationService] Erro ao marcar todas as notificações como lidas:', error);
    throw error; // Re-throw error
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
        'Content-Type': 'application/json', // Maybe not needed for DELETE, but doesn't hurt
        'Accept': 'application/json, text/plain, */*',
      },
      credentials: 'include'
    });
    console.log(`[NotificationService] deleteNotification response status: ${response.status}`);

    if (!response.ok) {
      let errorMsg = `Falha ao deletar notificação (Status: ${response.status})`;
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error(`[NotificationService] deleteNotification failed: Status ${response.status}, Body: ${errorBody}`);
         const contentType = response.headers.get("content-type");
         if (contentType && contentType.includes("application/json")) {
             const errorData = JSON.parse(errorBody);
             errorMsg = errorData.error || errorMsg;
         }
      } catch (e) {
        console.error(`[NotificationService] deleteNotification - Failed to read or parse error body:`, e);
      }
      throw new Error(errorMsg);
    }

    // Handle success case - Expect 204 No Content or maybe 200 OK with a success message
     if (response.status === 204) {
      console.log(`[NotificationService] Successfully deleted notification ${id} (204 No Content).`);
      return; // Success without body
    }

     // If we got a 200 OK or other 2xx status with a body, try to process it but log warnings.
    console.warn(`[NotificationService] deleteNotification received status ${response.status} instead of 204.`);
    const contentType = response.headers.get("content-type");
    let responseBody = '';
     try {
        responseBody = await response.text(); // Read as text first
        if (contentType && contentType.includes("application/json")) {
            const data = JSON.parse(responseBody);
            console.log("[NotificationService] deleteNotification received unexpected JSON response:", data);
        } else {
            console.log("[NotificationService] deleteNotification received unexpected text response:", responseBody);
        }
    } catch (e) {
        console.error("[NotificationService] deleteNotification - Failed to read or parse unexpected success body:", e);
    }

     // Continue considering it a success if response.ok was true
     console.log(`[NotificationService] Operation deleteNotification considered successful for ID: ${id}`);


  } catch (error) {
    console.error(`[NotificationService] Error deleting notification ${id}:`, error);
    throw error; // Re-throw error
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
