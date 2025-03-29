// Notification Types
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'feeding' | 'household' | 'system' | 'info' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Date;
  userId: number;
  catId?: number;
  householdId?: number;
  actionUrl?: string;
  icon?: string;
}

export type NotificationType = 'feeding' | 'household' | 'system' | 'info' | 'warning' | 'error';

export interface CreateNotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  userId: number;
  catId?: number;
  householdId?: number;
  actionUrl?: string;
  icon?: string;
}
