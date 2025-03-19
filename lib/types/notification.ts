// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'feeding' | 'household' | 'system' | 'info' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Date;
  userId: string;
  catId?: string;
  householdId?: string;
  actionUrl?: string;
  icon?: string;
}

export type NotificationType = 'feeding' | 'household' | 'system' | 'info' | 'warning' | 'error';

export interface CreateNotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  userId: string;
  catId?: string;
  householdId?: string;
  actionUrl?: string;
  icon?: string;
}
