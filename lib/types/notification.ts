// Notification Types
export type NotificationType = 
  | 'feeding'    // Feeding notifications
  | 'reminder'   // Feeding reminders
  | 'household'  // Household member related notifications
  | 'system'     // System notifications
  | 'info'       // General information
  | 'warning'    // Warnings
  | 'error';     // Errors

export interface Notification {
  id: string;  // UUID
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: Date;
  updated_at: Date;
  user_id: string;  // UUID
  metadata?: {
    cat_id?: string;  // UUID
    household_id?: string;  // UUID
    action_url?: string;
    icon?: string;
    scheduled_time?: string;
    [key: string]: any;
  };
}

export interface CreateNotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  // userId and householdId are now handled by the API route via headers
  // user_id: string;  // UUID - REMOVED
  metadata?: {
    cat_id?: string;  // UUID
    // household_id?: string;  // UUID - REMOVED (API should associate with user's household)
    action_url?: string;
    icon?: string;
    scheduled_time?: string;
    [key: string]: any;
  };
}
