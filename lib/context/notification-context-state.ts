import { Notification, ConnectionStatus } from "@/lib/types/notification";

export type NotificationState = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
  page: number;
  totalPages: number;
  hasMore: boolean;
  lastSyncTime: Date | null;
};

export type NotificationAction =
  | { type: "SET_NOTIFICATIONS"; payload: { notifications: Notification[]; totalPages: number; hasMore: boolean; unreadCount: number } }
  | { type: "APPEND_NOTIFICATIONS"; payload: { notifications: Notification[]; totalPages: number; hasMore: boolean } }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "UPDATE_NOTIFICATION"; payload: Notification }
  | { type: "MARK_NOTIFICATION_READ"; payload: { id: string } }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "REMOVE_NOTIFICATION"; payload: { id: string } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SYNCING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_PAGE"; payload: number }
  | { type: "SET_UNREAD_COUNT"; payload: number }
  | { type: "SET_CONNECTION_STATUS"; payload: ConnectionStatus }
  | { type: "SET_IS_ONLINE"; payload: boolean }
  | { type: "SET_LAST_SYNC_TIME"; payload: Date | null };

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
  page: number;
  totalPages: number;
  hasMore: boolean;
  lastSyncTime: Date | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export const getInitialNotificationState = (): NotificationState => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isSyncing: false,
  isOnline: typeof window !== "undefined" ? navigator.onLine : true,
  connectionStatus: "disconnected",
  error: null,
  page: 1,
  totalPages: 1,
  hasMore: false,
  lastSyncTime: null,
});

export function normalizeNotification(raw: Record<string, unknown>): Notification {
  return {
    id: String(raw.id),
    title: raw.title as string,
    message: raw.message as string,
    type: raw.type as Notification["type"],
    isRead: (raw.is_read ?? raw.isRead ?? false) as boolean,
    createdAt: (raw.created_at || raw.createdAt || "") as string,
    updatedAt: (raw.updated_at || raw.updatedAt || "") as string,
    userId: (raw.user_id || raw.userId || "") as string,
    metadata: (raw.metadata ?? undefined) as Notification["metadata"],
  };
}

export function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  console.log(`[NotificationReducer] Action: ${action.type}`);

  try {
    switch (action.type) {
      case "SET_NOTIFICATIONS":
        return {
          ...state,
          notifications: action.payload.notifications,
          totalPages: action.payload.totalPages,
          hasMore: action.payload.hasMore,
          unreadCount: action.payload.unreadCount,
          page: 1,
        };
      case "APPEND_NOTIFICATIONS": {
        const existingIds = new Set(state.notifications.map((n) => n.id));
        const newNotifications = action.payload.notifications.filter((n) => !existingIds.has(n.id));
        return {
          ...state,
          notifications: [...state.notifications, ...newNotifications],
          totalPages: action.payload.totalPages,
          hasMore: action.payload.hasMore,
        };
      }
      case "ADD_NOTIFICATION": {
        if (state.notifications.some((n) => n.id === action.payload.id)) {
          return state;
        }
        const normalized = normalizeNotification(action.payload as unknown as Record<string, unknown>);
        return {
          ...state,
          notifications: [normalized, ...state.notifications],
          unreadCount: state.unreadCount + (normalized.isRead ? 0 : 1),
        };
      }
      case "UPDATE_NOTIFICATION": {
        const idx = state.notifications.findIndex((n) => n.id === action.payload.id);
        if (idx === -1) return state;
        const updated = normalizeNotification(action.payload as unknown as Record<string, unknown>);
        const nextNotifications = [...state.notifications];
        nextNotifications[idx] = updated;
        const nextUnreadCount = nextNotifications.reduce((count, n) => count + (n.isRead ? 0 : 1), 0);
        return {
          ...state,
          notifications: nextNotifications,
          unreadCount: nextUnreadCount,
        };
      }
      case "MARK_NOTIFICATION_READ": {
        let changedRead = false;
        const markedNotifications = state.notifications.map((notification) => {
          if (notification.id === action.payload.id && !notification.isRead) {
            changedRead = true;
            return { ...notification, isRead: true };
          }
          return notification;
        });
        return {
          ...state,
          notifications: markedNotifications,
          unreadCount: Math.max(0, state.unreadCount - (changedRead ? 1 : 0)),
        };
      }
      case "MARK_ALL_NOTIFICATIONS_READ": {
        const anyUnread = state.notifications.some((n) => !n.isRead);
        if (!anyUnread) {
          return state;
        }
        return {
          ...state,
          notifications: state.notifications.map((n) => (n.isRead ? n : { ...n, isRead: true })),
          unreadCount: 0,
        };
      }
      case "REMOVE_NOTIFICATION": {
        const notificationToRemove = state.notifications.find((n) => n.id === action.payload.id);
        if (!notificationToRemove) {
          return state;
        }
        const filteredNotifications = state.notifications.filter((n) => n.id !== action.payload.id);
        const newUnreadCount = !notificationToRemove.isRead
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount;
        return {
          ...state,
          notifications: filteredNotifications,
          unreadCount: newUnreadCount,
        };
      }
      case "SET_LOADING":
        return { ...state, isLoading: action.payload };
      case "SET_SYNCING":
        return { ...state, isSyncing: action.payload };
      case "SET_ERROR":
        return { ...state, error: action.payload };
      case "SET_PAGE":
        return { ...state, page: Math.max(1, action.payload) };
      case "SET_UNREAD_COUNT":
        return { ...state, unreadCount: Math.max(0, action.payload) };
      case "SET_CONNECTION_STATUS":
        return { ...state, connectionStatus: action.payload };
      case "SET_IS_ONLINE":
        return { ...state, isOnline: action.payload };
      case "SET_LAST_SYNC_TIME":
        return { ...state, lastSyncTime: action.payload };
      default:
        return state;
    }
  } catch (_error) {
    console.error("[NotificationReducer] Error processing action:", { action, error: _error });
    return { ...state, error: "An unexpected error occurred in the reducer." };
  }
}
