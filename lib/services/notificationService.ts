import { getData, setData, delay, uuidv4 } from "./apiService";
import { Notification, CreateNotificationPayload } from "../types/notification";

// Get all notifications for a user
export async function getUserNotifications(userId: string, mockData: Notification[] = []): Promise<Notification[]> {
  await delay(300);
  const notifications = await getData<Notification>('notifications', mockData);
  return notifications
    .filter(notification => notification.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Get unread notifications count
export async function getUnreadNotificationsCount(userId: string, mockData: Notification[] = []): Promise<number> {
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
export async function markNotificationAsRead(id: string, mockData: Notification[] = []): Promise<Notification> {
  await delay(200);
  
  const notifications = await getData<Notification>('notifications', mockData);
  const notification = notifications.find(n => n.id === id);
  
  if (!notification) {
    throw new Error(`Notification with id ${id} not found`);
  }
  
  const updatedNotification = {
    ...notification,
    isRead: true
  };
  
  const updatedNotifications = notifications.map(n => 
    n.id === id ? updatedNotification : n
  );
  
  await setData<Notification>('notifications', updatedNotifications);
  return updatedNotification;
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string, mockData: Notification[] = []): Promise<Notification[]> {
  await delay(300);
  
  const notifications = await getData<Notification>('notifications', mockData);
  
  const updatedNotifications = notifications.map(n => 
    n.userId === userId && !n.isRead ? { ...n, isRead: true } : n
  );
  
  await setData<Notification>('notifications', updatedNotifications);
  return updatedNotifications.filter(n => n.userId === userId);
}

// Delete a notification
export async function deleteNotification(id: string, mockData: Notification[] = []): Promise<void> {
  await delay(200);
  
  const notifications = await getData<Notification>('notifications', mockData);
  const updatedNotifications = notifications.filter(n => n.id !== id);
  
  await setData<Notification>('notifications', updatedNotifications);
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
