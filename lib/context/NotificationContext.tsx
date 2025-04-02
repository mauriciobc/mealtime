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
  console.log(`[NotificationReducer] Action: ${action.type}`, { payload: action.payload });
  try {
    let newState: NotificationState;
    switch (action.type) {
      case "SET_NOTIFICATIONS":
        const unreadCount = action.payload.unreadCount !== undefined ? action.payload.unreadCount : state.unreadCount;
        newState = { 
          ...state, 
          notifications: action.payload.notifications ?? [],
          totalPages: action.payload.totalPages ?? 1,
          hasMore: action.payload.hasMore ?? false,
          unreadCount: Math.max(0, unreadCount),
          page: 1
        };
        break;
      case "APPEND_NOTIFICATIONS":
        const existingIds = new Set(state.notifications.map(n => n.id));
        const newNotifications = action.payload.notifications.filter(n => !existingIds.has(n.id));
        newState = {
          ...state,
          notifications: [...state.notifications, ...newNotifications],
          totalPages: action.payload.totalPages ?? state.totalPages,
          hasMore: action.payload.hasMore ?? false,
        };
        break;
      case "ADD_NOTIFICATION":
        if (state.notifications.some(n => n.id === action.payload.id)) {
            console.log(`[NotificationReducer] Notification ${action.payload.id} already exists. Skipping.`);
            newState = state;
            break;
        }
        newState = { 
          ...state, 
          notifications: [action.payload, ...state.notifications],
          unreadCount: state.unreadCount + (action.payload.isRead ? 0 : 1)
        };
        break;
      case "MARK_NOTIFICATION_READ":
        let changedRead = false;
        const markedNotifications = state.notifications.map(notification => {
            if (notification.id === action.payload.id && !notification.isRead) {
                console.log(`[NotificationReducer] Marking notification ${action.payload.id} as read.`);
                changedRead = true;
                return { ...notification, isRead: true };
            }
            return notification;
        });
        newState = { 
          ...state, 
          notifications: markedNotifications,
          unreadCount: Math.max(0, state.unreadCount - (changedRead ? 1 : 0))
        };
        break;
      case "MARK_ALL_NOTIFICATIONS_READ":
        const anyUnread = state.notifications.some(n => !n.isRead);
        if (!anyUnread) {
            console.log(`[NotificationReducer] No unread notifications to mark as read.`);
            newState = state;
            break;
        }
        
        const allReadNotifications = state.notifications.map(notification => (
            notification.isRead ? notification : { ...notification, isRead: true }
        ));
        newState = { 
          ...state, 
          notifications: allReadNotifications,
          unreadCount: 0
        };
        break;
      case "REMOVE_NOTIFICATION":
        const notificationToRemove = state.notifications.find(
          notification => notification.id === action.payload.id
        );
        if (!notificationToRemove) {
          console.log(`[NotificationReducer] Notification ${action.payload.id} not found for removal.`);
          newState = state;
          break;
        }
        const filteredNotifications = state.notifications.filter(
          notification => notification.id !== action.payload.id
        );
        const newUnreadCount = !notificationToRemove.isRead 
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount;
        newState = { 
          ...state, 
          notifications: filteredNotifications,
          unreadCount: newUnreadCount
        };
        break;
      case "SET_LOADING":
        newState = { ...state, isLoading: action.payload };
        break;
      case "SET_ERROR":
        newState = { ...state, error: action.payload };
        break;
      case "SET_PAGE":
        newState = { ...state, page: Math.max(1, action.payload) };
        break;
      case "SET_UNREAD_COUNT":
         newState = { ...state, unreadCount: Math.max(0, action.payload) };
         break;
      default:
        console.log(`[NotificationReducer] Unknown action type.`);
        newState = state;
    }
    console.log(`[NotificationReducer] State updated:`, newState);
    return newState;
  } catch (error) {
    console.error("[NotificationReducer] Error processing action:", { action, error });
    return { ...state, error: "An unexpected error occurred in the reducer." };
  }
}

// Provider component
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { state: userState } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const currentUser = userState.currentUser;
  
  console.log("[NotificationProvider] Initializing with state:", state, "User:", currentUser);

  const fetchInitialData = useCallback(async (userId: number | string) => {
    console.log(`[NotificationProvider] fetchInitialData called for userId: ${userId}`);
    const loadingOpId = `notifications-initial-${userId}`;
    addLoadingOperation({ id: loadingOpId, priority: 1, description: "Loading notifications..." });
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_PAGE", payload: 1 });

    try {
      console.log(`[NotificationProvider] Fetching notifications and unread count for userId: ${userId}`);
      const [notificationsResponse, unreadCountResponse] = await Promise.all([
        getUserNotifications(userId, 1, 10),
        getUnreadNotificationsCount(userId)
      ]);
      console.log(`[NotificationProvider] Received initial data:`, { notificationsResponse, unreadCountResponse });

      // More robust check: ensure responses exist and have expected structure
      if (!notificationsResponse || !Array.isArray(notificationsResponse.data)) {
        console.error("[NotificationContext] Invalid notifications response structure:", notificationsResponse);
        dispatch({ type: "SET_ERROR", payload: "Falha ao processar dados de notificação (estrutura inválida)." });
        return;
      }

      if (typeof unreadCountResponse !== 'number') {
        console.error("[NotificationContext] Invalid unread count response type:", unreadCountResponse);
        dispatch({ type: "SET_ERROR", payload: "Falha ao processar contagem de notificações (tipo inválido)." });
        return;
      }
      
      console.log("[NotificationProvider] Dispatching SET_NOTIFICATIONS");
      dispatch({
        type: "SET_NOTIFICATIONS",
        payload: {
          notifications: notificationsResponse.data,
          totalPages: notificationsResponse.totalPages,
          hasMore: notificationsResponse.hasMore,
          unreadCount: unreadCountResponse
        }
      });
    } catch (error) {
      console.error("[NotificationProvider] Error in fetchInitialData:", error);
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Failed to load notifications" });
    } finally {
      console.log(`[NotificationProvider] fetchInitialData finished for userId: ${userId}`);
      dispatch({ type: "SET_LOADING", payload: false });
      removeLoadingOperation(loadingOpId);
    }
  }, [addLoadingOperation, removeLoadingOperation]);

  useEffect(() => {
    console.log(`[NotificationProvider] useEffect triggered. User ID: ${currentUser?.id}`);
    if (currentUser?.id) {
      console.log(`[NotificationContext] User ${currentUser.id} detected. Fetching initial data.`);
      fetchInitialData(currentUser.id);
    } else {
      console.log(`[NotificationContext] No user detected or user ID changed. Clearing notification state.`);
      dispatch({ 
         type: "SET_NOTIFICATIONS", 
         payload: { notifications: [], totalPages: 1, hasMore: false, unreadCount: 0 } 
      });
      dispatch({ type: "SET_PAGE", payload: 1 });
      dispatch({ type: "SET_ERROR", payload: null });
    }
  }, [currentUser?.id, fetchInitialData]);

  const refreshNotifications = useCallback(async () => {
      console.log(`[NotificationProvider] refreshNotifications called. User ID: ${currentUser?.id}`);
      if (!currentUser?.id) {
        console.log("[NotificationProvider] No user ID, cannot refresh.");
        return;
      }
      console.log(`[NotificationContext] Refreshing notifications for user ${currentUser.id}`);
      await fetchInitialData(currentUser.id);
      console.log(`[NotificationProvider] refreshNotifications completed for user ${currentUser.id}`);
  }, [currentUser?.id, fetchInitialData]);

  const loadMore = useCallback(async () => {
    console.log(`[NotificationProvider] loadMore called. State:`, { isLoading: state.isLoading, hasMore: state.hasMore, page: state.page, userId: currentUser?.id });
    if (!currentUser?.id || state.isLoading || !state.hasMore) {
      console.log("[NotificationProvider] Conditions not met for loadMore.");
      return;
    }
    
    const nextPage = state.page + 1;
    console.log(`[NotificationProvider] Attempting to load page ${nextPage}`);
    const loadingOpId = `notifications-load-more-${currentUser.id}-page-${nextPage}`;
    addLoadingOperation({ id: loadingOpId, priority: 2, description: "Loading more notifications..." });
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      console.log(`[NotificationProvider] Fetching more notifications for page ${nextPage}`);
      const response = await getUserNotifications(currentUser.id, nextPage, 10);
      console.log(`[NotificationProvider] Received loadMore data for page ${nextPage}:`, response);
      if (!response || !Array.isArray(response.data)) { // Added validation
         console.error("[NotificationProvider] Invalid response structure for loadMore:", response);
         throw new Error("Failed to fetch more notifications (invalid response structure)");
      }
      console.log("[NotificationProvider] Dispatching APPEND_NOTIFICATIONS");
      dispatch({ 
        type: "APPEND_NOTIFICATIONS", 
        payload: { 
          notifications: response.data,
          totalPages: response.totalPages,
          hasMore: response.hasMore 
        }
      });
      console.log("[NotificationProvider] Dispatching SET_PAGE");
      dispatch({ type: "SET_PAGE", payload: nextPage });
    } catch (error: any) {
      console.error("[NotificationProvider] Error in loadMore:", error);
      dispatch({ type: "SET_ERROR", payload: error.message || "Failed to load more notifications" });
    } finally {
      console.log(`[NotificationProvider] loadMore finished for page ${nextPage}`);
      dispatch({ type: "SET_LOADING", payload: false });
      removeLoadingOperation(loadingOpId);
    }
  }, [currentUser?.id, state.isLoading, state.hasMore, state.page, addLoadingOperation, removeLoadingOperation]);

  const markAsRead = useCallback(async (id: number) => {
    console.log(`[NotificationProvider] markAsRead called for notification ID: ${id}, User ID: ${currentUser?.id}`);
    if (!currentUser?.id) {
      console.log("[NotificationProvider] No user ID, cannot mark as read.");
      return;
    }
    const loadingOpId = `notifications-mark-read-${id}`;
    addLoadingOperation({ id: loadingOpId, priority: 1, description: "Marking notification read..." });

    console.log(`[NotificationProvider] Optimistically dispatching MARK_NOTIFICATION_READ for ID: ${id}`);
    dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id } });

    try {
      console.log(`[NotificationProvider] Calling markNotificationAsRead service for ID: ${id}`);
      await markNotificationAsRead(id);
      console.log(`[NotificationProvider] Successfully marked notification ${id} as read via service.`);
      console.log(`[NotificationProvider] Refreshing notifications after successful markAsRead.`);
      await refreshNotifications();
    } catch (error: any) {
      console.error(`[NotificationProvider] Error marking notification ${id} as read via service:`, error);
      dispatch({ type: "SET_ERROR", payload: error.message || "Failed to mark notification as read" });
      console.log(`[NotificationProvider] Reverting optimistic update / Refreshing notifications due to error.`);
      await refreshNotifications();
    } finally {
      console.log(`[NotificationProvider] markAsRead finished for notification ID: ${id}`);
      removeLoadingOperation(loadingOpId);
    }
  }, [currentUser?.id, addLoadingOperation, removeLoadingOperation, refreshNotifications]);

  const markAllAsRead = useCallback(async () => {
    console.log(`[NotificationProvider] markAllAsRead called. User ID: ${currentUser?.id}, Unread count: ${state.unreadCount}`);
    if (!currentUser?.id || state.unreadCount === 0) {
       console.log("[NotificationProvider] Conditions not met for markAllAsRead.");
       return;
    }
    const loadingOpId = `notifications-mark-all-read-${currentUser.id}`;
    addLoadingOperation({ id: loadingOpId, priority: 1, description: "Marking all notifications read..." });

    const previousNotifications = state.notifications; // Keep backup for potential revert
    const previousUnreadCount = state.unreadCount; // Keep backup for potential revert

    console.log(`[NotificationProvider] Optimistically dispatching MARK_ALL_NOTIFICATIONS_READ`);
    dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });

    try {
      console.log(`[NotificationProvider] Calling markAllNotificationsAsRead service for user ID: ${currentUser.id}`);
      await markAllNotificationsAsRead(currentUser.id);
      console.log(`[NotificationProvider] Successfully marked all notifications as read via service for user ID: ${currentUser.id}`);
    } catch (error: any) {
      console.error("[NotificationProvider] Error marking all notifications as read via service:", error);
      dispatch({ type: "SET_ERROR", payload: error.message || "Failed to mark all notifications as read" });
      // Revert optimistic update
      console.log(`[NotificationProvider] Reverting optimistic update for markAllAsRead due to error.`);
      dispatch({ type: "SET_NOTIFICATIONS", payload: { notifications: previousNotifications, totalPages: state.totalPages, hasMore: state.hasMore, unreadCount: previousUnreadCount } });
    } finally {
       console.log(`[NotificationProvider] markAllAsRead finished for user ID: ${currentUser.id}`);
      removeLoadingOperation(loadingOpId);
    }
  }, [currentUser?.id, state.unreadCount, state.notifications, state.totalPages, state.hasMore, addLoadingOperation, removeLoadingOperation]);

  const removeNotification = useCallback(async (id: number) => {
    console.log(`[NotificationProvider] removeNotification called for notification ID: ${id}, User ID: ${currentUser?.id}`);
    if (!currentUser?.id) {
      console.log("[NotificationProvider] No user ID, cannot remove notification.");
      return;
    }
    const loadingOpId = `notifications-remove-${id}`;
    addLoadingOperation({ id: loadingOpId, priority: 1, description: "Removing notification..." });

    const notificationToRemove = state.notifications.find(n => n.id === id);
    const previousNotificationsState = state.notifications; // Backup for revert
    const previousUnreadCountState = state.unreadCount; // Backup for revert

    console.log(`[NotificationProvider] Optimistically dispatching REMOVE_NOTIFICATION for ID: ${id}`);
    dispatch({ type: "REMOVE_NOTIFICATION", payload: { id } });

    try {
      console.log(`[NotificationProvider] Calling deleteNotification service for ID: ${id}`);
      await deleteNotification(id); // Changed: Pass only id as per service definition
      console.log(`[NotificationProvider] Successfully removed notification ${id} via service.`);
    } catch (error: any) {
      console.error(`[NotificationProvider] Error removing notification ${id} via service:`, error);
      dispatch({ type: "SET_ERROR", payload: error.message || "Failed to remove notification" });
      // Revert optimistic update
      console.log(`[NotificationProvider] Reverting optimistic removal for notification ${id} due to error.`);
      dispatch({ type: "SET_NOTIFICATIONS", payload: { notifications: previousNotificationsState, totalPages: state.totalPages, hasMore: state.hasMore, unreadCount: previousUnreadCountState } }); 
    } finally {
      console.log(`[NotificationProvider] removeNotification finished for notification ID: ${id}`);
      removeLoadingOperation(loadingOpId);
    }
  }, [currentUser?.id, state.notifications, state.unreadCount, state.totalPages, state.hasMore, addLoadingOperation, removeLoadingOperation]); // Added state dependencies for revert

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
  
  console.log("[NotificationProvider] Rendering with value:", value);

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
    console.error("useNotifications hook used outside of NotificationProvider");
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  // console.log("[useNotifications] Hook called, returning context:", context); // Can be noisy
  return context;
}
