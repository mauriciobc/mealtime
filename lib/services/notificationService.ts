import { getData, setData, delay, uuidv4 } from "./apiService";
import { Notification, CreateNotificationPayload } from "../types/notification";

// Get all notifications for a user
export async function getUserNotifications(userId: number, mockData: Notification[] = []): Promise<Notification[]> {
  // TODO: Implementar chamada à API
  return mockData.filter(notification => notification.userId === userId);
}

// Get unread notifications count
export async function getUnreadNotificationsCount(userId: number, mockData: Notification[] = []): Promise<number> {
  const notifications = await getUserNotifications(userId, mockData);
  return notifications.filter(notification => !notification.isRead).length;
}

// Create a new notification
export async function createNotification(payload: CreateNotificationPayload, mockData: Notification[] = []): Promise<Notification> {
  await delay(300);
  
  const notification: Notification = {
    id: uuidv4(),
    title: payload.title,
    message: payload.message,
    type: payload.type,
    isRead: false,
    createdAt: new Date(),
    userId: payload.userId,
    catId: payload.catId,
    householdId: payload.householdId,
    actionUrl: payload.actionUrl,
    icon: payload.icon || getIconForType(payload.type)
  };
  
  const notifications = await getData<Notification>('notifications', mockData);
  const updatedNotifications = [...notifications, notification];
  await setData<Notification>('notifications', updatedNotifications);
  
  return notification;
}

// Mark a notification as read
export async function markNotificationAsRead(id: number, mockData: Notification[] = []): Promise<Notification> {
  // TODO: Implementar chamada à API
  const notification = mockData.find(n => n.id === id);
  if (!notification) {
    throw new Error('Notificação não encontrada');
  }
  return {
    ...notification,
    isRead: true
  };
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: number, mockData: Notification[] = []): Promise<Notification[]> {
  // TODO: Implementar chamada à API
  return mockData.map(notification => {
    if (notification.userId === userId) {
      return {
        ...notification,
        isRead: true
      };
    }
    return notification;
  });
}

// Delete a notification
export async function deleteNotification(id: number, mockData: Notification[] = []): Promise<void> {
  // TODO: Implementar chamada à API
  const index = mockData.findIndex(n => n.id === id);
  if (index === -1) {
    throw new Error('Notificação não encontrada');
  }
  mockData.splice(index, 1);
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
