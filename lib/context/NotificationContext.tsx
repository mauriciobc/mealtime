"use client";

import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from "react";
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationsCount
} from "@/lib/services/notificationService";
import { Notification } from "@/lib/types/notification";
import { useUserContext } from "./UserContext";
import { useLoading } from "@/lib/context/LoadingContext";

// Types
interface PaginatedResponse<T> {
  data: T[];
  totalPages: number;
  hasMore: boolean;
  message?: string;
}

type NotificationState = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  hasMore: boolean;
};

type NotificationAction =
  | { type: "SET_NOTIFICATIONS"; payload: { notifications: Notification[]; totalPages: number; hasMore: boolean; unreadCount?: number } }
  | { type: "APPEND_NOTIFICATIONS"; payload: { notifications: Notification[]; totalPages: number; hasMore: boolean } }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_NOTIFICATION_READ"; payload: { id: number } }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "REMOVE_NOTIFICATION"; payload: { id: number } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_PAGE"; payload: number }
  | { type: "SET_UNREAD_COUNT"; payload: number };

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  hasMore: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: number) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loadMore: () => Promise<void>;
}

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  page: 1,
  totalPages: 1,
  hasMore: false
};

// Create the context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Reducer function
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  try {
    switch (action.type) {
      case "SET_NOTIFICATIONS":
        const unreadCount = action.payload.unreadCount !== undefined ? action.payload.unreadCount : state.unreadCount;
        return { 
          ...state, 
          notifications: action.payload.notifications ?? [],
          totalPages: action.payload.totalPages ?? 1,
          hasMore: action.payload.hasMore ?? false,
          unreadCount: Math.max(0, unreadCount),
          page: 1
        };
      case "APPEND_NOTIFICATIONS":
        const existingIds = new Set(state.notifications.map(n => n.id));
        const newNotifications = action.payload.notifications.filter(n => !existingIds.has(n.id));
        return {
          ...state,
          notifications: [...state.notifications, ...newNotifications],
          totalPages: action.payload.totalPages ?? state.totalPages,
          hasMore: action.payload.hasMore ?? false,
        };
      case "ADD_NOTIFICATION":
        if (state.notifications.some(n => n.id === action.payload.id)) {
            return state;
        }
        return { 
          ...state, 
          notifications: [action.payload, ...state.notifications],
          unreadCount: state.unreadCount + (action.payload.isRead ? 0 : 1)
        };
      case "MARK_NOTIFICATION_READ":
        let changedRead = false;
        const markedNotifications = state.notifications.map(notification => {
            if (notification.id === action.payload.id && !notification.isRead) {
                changedRead = true;
                return { ...notification, isRead: true };
            }
            return notification;
        });
        return { 
          ...state, 
          notifications: markedNotifications,
          unreadCount: Math.max(0, state.unreadCount - (changedRead ? 1 : 0))
        };
      case "MARK_ALL_NOTIFICATIONS_READ":
        const anyUnread = state.notifications.some(n => !n.isRead);
        if (!anyUnread) return state;
        
        const allReadNotifications = state.notifications.map(notification => (
            notification.isRead ? notification : { ...notification, isRead: true }
        ));
        return { 
          ...state, 
          notifications: allReadNotifications,
          unreadCount: 0
        };
      case "REMOVE_NOTIFICATION":
        const notificationToRemove = state.notifications.find(
          notification => notification.id === action.payload.id
        );
        if (!notificationToRemove) {
          return state;
        }
        const filteredNotifications = state.notifications.filter(
          notification => notification.id !== action.payload.id
        );
        const newUnreadCount = !notificationToRemove.isRead 
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount;
        return { 
          ...state, 
          notifications: filteredNotifications,
          unreadCount: newUnreadCount
        };
      case "SET_LOADING":
        return { ...state, isLoading: action.payload };
      case "SET_ERROR":
        return { ...state, error: action.payload };
      case "SET_PAGE":
        return { ...state, page: Math.max(1, action.payload) };
      case "SET_UNREAD_COUNT":
        return { ...state, unreadCount: Math.max(0, action.payload) };
      default:
        return state;
    }
  } catch (error) {
    console.error("Erro no notificationReducer:", error);
    return { ...state, error: "An unexpected error occurred in the reducer." };
  }
}

// Provider component
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { state: userState } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const currentUser = userState.currentUser;

  const fetchInitialData = useCallback(async (userId: number | string) => {
    const loadingOpId = `notifications-initial-${userId}`;
    addLoadingOperation({ id: loadingOpId, priority: 1, description: "Loading notifications..." });
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_PAGE", payload: 1 });

    try {
      const [notificationsResponse, unreadCountResponse] = await Promise.all([
        getUserNotifications(userId, 1, 10),
        getUnreadNotificationsCount(userId)
      ]);

      // More robust check: ensure responses exist and have expected basic structure/type
      const isNotificationsResponseValid = notificationsResponse && Array.isArray(notificationsResponse.data);
      const isUnreadCountResponseValid = typeof unreadCountResponse === 'number';

      if (!isNotificationsResponseValid || !isUnreadCountResponseValid) {
         console.error("[NotificationContext] Failed to fetch initial data. Invalid response structure:", { notificationsResponse, unreadCountResponse });
         dispatch({ type: "SET_ERROR", payload: "Falha ao processar dados de notificação." }); 
         return; 
      }

      // Now we know unreadCountResponse is a number, but the dispatch expects an object { count: number }
      // We need to use the correct property names from the PaginatedResponse and the count number
      dispatch({ 
        type: "SET_NOTIFICATIONS", 
        payload: { 
          notifications: notificationsResponse.data,           // Correct
          totalPages: notificationsResponse.totalPages,       // Correct
          hasMore: notificationsResponse.hasMore,           // Correct
          unreadCount: unreadCountResponse                 // Use the number directly
        }
      });
    } catch (error: any) {
      console.error("[NotificationContext] Error fetching initial data:", error);
      dispatch({ type: "SET_ERROR", payload: error.message || "Failed to load notifications" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      removeLoadingOperation(loadingOpId);
    }
  }, [addLoadingOperation, removeLoadingOperation]);

  useEffect(() => {
    if (currentUser?.id) {
      console.log(`[NotificationContext] User ${currentUser.id} detected. Fetching initial data.`);
      fetchInitialData(currentUser.id);
    } else {
      console.log(`[NotificationContext] No user detected. Clearing notification state.`);
      dispatch({ 
         type: "SET_NOTIFICATIONS", 
         payload: { notifications: [], totalPages: 1, hasMore: false, unreadCount: 0 } 
      });
      dispatch({ type: "SET_PAGE", payload: 1 });
      dispatch({ type: "SET_ERROR", payload: null });
    }
  }, [currentUser?.id, fetchInitialData]);

  const refreshNotifications = useCallback(async () => {
      if (!currentUser?.id) return;
      console.log(`[NotificationContext] Refreshing notifications for user ${currentUser.id}`);
      await fetchInitialData(currentUser.id);
  }, [currentUser?.id, fetchInitialData]);

  const loadMore = useCallback(async () => {
    if (!currentUser?.id || state.isLoading || !state.hasMore) {
      return;
    }
    
    const nextPage = state.page + 1;
    const loadingOpId = `notifications-load-more-${currentUser.id}-page-${nextPage}`;
    addLoadingOperation({ id: loadingOpId, priority: 2, description: "Loading more notifications..." });
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await getUserNotifications(currentUser.id, nextPage, 10);
      if (!response) {
         throw new Error("Failed to fetch more notifications");
      }
      dispatch({ 
        type: "APPEND_NOTIFICATIONS", 
        payload: { 
          notifications: response.data,
          totalPages: response.totalPages,
          hasMore: response.hasMore 
        }
      });
      dispatch({ type: "SET_PAGE", payload: nextPage });
    } catch (error: any) {
      console.error("[NotificationContext] Error loading more notifications:", error);
      dispatch({ type: "SET_ERROR", payload: error.message || "Failed to load more notifications" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      removeLoadingOperation(loadingOpId);
    }
  }, [currentUser?.id, state.isLoading, state.hasMore, state.page, addLoadingOperation, removeLoadingOperation]);

  const markAsRead = useCallback(async (id: number) => {
    if (!currentUser?.id) return;
    const loadingOpId = `notifications-mark-read-${id}`;
    addLoadingOperation({ id: loadingOpId, priority: 1, description: "Marking notification read..." });

    dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id } });

    try {
      await markNotificationAsRead(currentUser.id, id);
    } catch (error: any) {
      console.error(`[NotificationContext] Error marking notification ${id} as read:`, error);
      dispatch({ type: "SET_ERROR", payload: error.message || "Failed to mark notification as read" });
      refreshNotifications();
    } finally {
       removeLoadingOperation(loadingOpId);
    }
  }, [currentUser?.id, addLoadingOperation, removeLoadingOperation, refreshNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!currentUser?.id || state.unreadCount === 0) return;
    const loadingOpId = `notifications-mark-all-read-${currentUser.id}`;
    addLoadingOperation({ id: loadingOpId, priority: 1, description: "Marking all notifications read..." });

    const previousNotifications = state.notifications;
    dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });

    try {
      await markAllNotificationsAsRead(currentUser.id);
    } catch (error: any) {
      console.error("[NotificationContext] Error marking all notifications as read:", error);
      dispatch({ type: "SET_ERROR", payload: error.message || "Failed to mark all notifications as read" });
      dispatch({ type: "SET_NOTIFICATIONS", payload: { notifications: previousNotifications, totalPages: state.totalPages, hasMore: state.hasMore, unreadCount: state.unreadCount } });
    } finally {
      removeLoadingOperation(loadingOpId);
    }
  }, [currentUser?.id, state.unreadCount, state.notifications, state.totalPages, state.hasMore, addLoadingOperation, removeLoadingOperation]);

  const removeNotification = useCallback(async (id: number) => {
    if (!currentUser?.id) return;
    const loadingOpId = `notifications-remove-${id}`;
    addLoadingOperation({ id: loadingOpId, priority: 1, description: "Removing notification..." });

    const notificationToRemove = state.notifications.find(n => n.id === id);
    const wasUnread = notificationToRemove ? !notificationToRemove.isRead : false;
    
    dispatch({ type: "REMOVE_NOTIFICATION", payload: { id } });

    try {
      await deleteNotification(currentUser.id, id);
    } catch (error: any) {
      console.error(`[NotificationContext] Error removing notification ${id}:`, error);
      dispatch({ type: "SET_ERROR", payload: error.message || "Failed to remove notification" });
      refreshNotifications();
    } finally {
      removeLoadingOperation(loadingOpId);
    }
  }, [currentUser?.id, state.notifications, addLoadingOperation, removeLoadingOperation, refreshNotifications]);

  const value = {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    isLoading: state.isLoading,
    error: state.error,
    page: state.page,
    totalPages: state.totalPages,
    hasMore: state.hasMore,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refreshNotifications,
    loadMore,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use the context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
