/**
 * @deprecated Este serviço está deprecado. Use SupabaseNotificationService diretamente.
 * Este wrapper mantém compatibilidade durante a migração.
 */

import { Notification, CreateNotificationPayload } from "../types/notification";
import { notificationService } from "./supabase-notification-service";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * @deprecated Use notificationService.getNotifications() do SupabaseNotificationService
 */
export async function getUserNotifications(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Notification>> {
  console.warn('[NotificationService] getUserNotifications is deprecated. Use notificationService.getNotifications() instead.');
  const response = await notificationService.getNotifications(page, limit);
    return {
    data: response.notifications,
    total: response.total,
    page: response.page,
    totalPages: response.totalPages,
    hasMore: response.hasMore,
  };
}

/**
 * @deprecated Use notificationService.getUnreadCount()
 */
export async function getUnreadNotificationsCount(): Promise<number> {
  console.warn('[NotificationService] getUnreadNotificationsCount is deprecated. Use notificationService.getUnreadCount() instead.');
  return await notificationService.getUnreadCount();
}

/**
 * @deprecated Use notificationService.markAsRead()
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  console.warn('[NotificationService] markNotificationAsRead is deprecated. Use notificationService.markAsRead() instead.');
  return await notificationService.markAsRead([id]);
}

/**
 * @deprecated Use notificationService.markAllAsRead()
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  console.warn('[NotificationService] markAllNotificationsAsRead is deprecated. Use notificationService.markAllAsRead() instead.');
  return await notificationService.markAllAsRead();
}

/**
 * @deprecated Use notificationService.deleteNotification()
 */
export async function deleteNotification(id: string): Promise<void> {
  console.warn('[NotificationService] deleteNotification is deprecated. Use notificationService.deleteNotification() instead.');
  return await notificationService.deleteNotification(id);
}

/**
 * @deprecated Esta função não deve ser usada no cliente.
 * Criação de notificações deve ser feita via Edge Functions ou API routes.
 */
export async function createNotification(payload: CreateNotificationPayload): Promise<Notification> {
  console.warn('[NotificationService] createNotification is deprecated for client use. Use Edge Functions or API routes instead.');
  throw new Error('createNotification is deprecated for client use. Use Edge Functions or API routes instead.');
}

/**
 * @deprecated Esta função não deve ser usada no cliente.
 * Agendamento de notificações deve ser feita via Edge Functions ou API routes.
 */
export async function scheduleNotification(payload: any): Promise<any> {
  console.warn('[NotificationService] scheduleNotification is deprecated for client use. Use Edge Functions or API routes instead.');
  throw new Error('scheduleNotification is deprecated for client use. Use Edge Functions or API routes instead.');
}
