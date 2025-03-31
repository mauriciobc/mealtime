"use client";

import { createContext, useContext, useReducer, useEffect, useState, ReactNode } from "react";
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationsCount
} from "@/lib/services/notificationService";
import { Notification } from "@/lib/types/notification";
import { useAppContext } from "./AppContext";
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
  | { type: "SET_NOTIFICATIONS"; payload: { notifications: Notification[]; totalPages: number; hasMore: boolean; unreadCount: number } }
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
  addNotification: (notification: Notification) => void;
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
        if (!action.payload) {
          console.error("Payload inválido para SET_NOTIFICATIONS");
          return state;
        }
        
        const notifications = Array.isArray(action.payload.notifications) 
          ? action.payload.notifications 
          : [];
          
        return { 
          ...state, 
          notifications,
          totalPages: action.payload.totalPages ?? 1,
          hasMore: action.payload.hasMore ?? false,
          unreadCount: action.payload.unreadCount ?? 0
        };
      case "ADD_NOTIFICATION":
        if (!action.payload || typeof action.payload.id !== 'number') {
          console.error("Payload inválido para ADD_NOTIFICATION");
          return state;
        }
        
        const notificationExists = state.notifications.some(n => n.id === action.payload.id);
        if (notificationExists) {
          return state;
        }
        
        const updatedNotifications = [action.payload, ...state.notifications];
        return { 
          ...state, 
          notifications: updatedNotifications,
          unreadCount: state.unreadCount + 1
        };
      case "MARK_NOTIFICATION_READ":
        if (!action.payload || typeof action.payload.id !== 'number') {
          console.error("Payload inválido para MARK_NOTIFICATION_READ");
          return state;
        }
        
        const markedNotifications = state.notifications.map(notification =>
          notification.id === action.payload.id
            ? { ...notification, isRead: true }
            : notification
        );
        return { 
          ...state, 
          notifications: markedNotifications,
          unreadCount: Math.max(0, state.unreadCount - 1)
        };
      case "MARK_ALL_NOTIFICATIONS_READ":
        const allReadNotifications = state.notifications.map(notification => ({
          ...notification,
          isRead: true
        }));
        return { 
          ...state, 
          notifications: allReadNotifications,
          unreadCount: 0
        };
      case "REMOVE_NOTIFICATION":
        if (!action.payload || typeof action.payload.id !== 'number') {
          console.error("Payload inválido para REMOVE_NOTIFICATION");
          return state;
        }
        
        const notificationToRemove = state.notifications.find(
          notification => notification.id === action.payload.id
        );

        if (!notificationToRemove) {
          console.warn(`Notification ${action.payload.id} not found in state`);
          return state;
        }

        const filteredNotifications = state.notifications.filter(
          notification => notification.id !== action.payload.id
        );

        // Only decrement unread count if the removed notification was unread
        const newUnreadCount = notificationToRemove.isRead 
          ? state.unreadCount 
          : Math.max(0, state.unreadCount - 1);

        console.log(`[NotificationReducer] Removing notification:`, {
          id: action.payload.id,
          wasUnread: !notificationToRemove.isRead,
          oldUnreadCount: state.unreadCount,
          newUnreadCount
        });

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
        console.warn(`Ação desconhecida: ${(action as any).type}`);
        return state;
    }
  } catch (error) {
    console.error("Erro no notificationReducer:", error);
    return state;
  }
}

// Provider component
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { state: appState } = useAppContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const currentUser = appState.currentUser;

  // Verificar se o AppProvider está disponível
  if (!appState) {
    console.error('NotificationProvider deve ser usado dentro de um AppProvider');
    return null;
  }

  // Carregar notificações iniciais e configurar refresh periódico
  useEffect(() => {
    if (currentUser?.id) {
      console.log(`[NotificationContext] Initial load for user: ${currentUser.id}`);
      const initializeNotifications = async () => {
        try {
          // First load notifications
          await loadNotifications();
          // Then load unread count to ensure it's in sync
          await loadUnreadCount();
        } catch (error) {
          console.error(`[NotificationContext] Error during initialization:`, error);
        }
      };
      initializeNotifications();

      // Set up periodic refresh every 30 seconds
      const refreshInterval = setInterval(async () => {
        console.log(`[NotificationContext] Periodic refresh for user: ${currentUser.id}`);
        try {
          await loadUnreadCount(); // Only load the count
        } catch (error) {
          console.error(`[NotificationContext] Error during periodic refresh:`, error);
        }
      }, 30000); // 30 seconds

      // Cleanup interval on unmount or when user changes
      return () => {
        console.log(`[NotificationContext] Cleaning up refresh interval for user: ${currentUser.id}`);
        clearInterval(refreshInterval);
      };
    }
  }, [currentUser?.id]);

  // Carregar notificações
  const loadNotifications = async () => {
    if (!currentUser?.id) {
      console.log(`[NotificationContext] Cannot load notifications: No current user ID`);
      return;
    }
    
    // Prevent concurrent loads
    if (state.isLoading) {
      console.log(`[NotificationContext] Skipping load - already loading notifications`);
      return;
    }
    
    console.log(`[NotificationContext] Loading notifications for user: ${currentUser.id}, page: ${state.page}`);
    const loadingId = "notifications-load";

    try {
      // Set loading state
      dispatch({ type: "SET_LOADING", payload: true });

      // Add loading operation
      addLoadingOperation({
        id: loadingId,
        priority: 2,
        description: "Carregando notificações..."
      });

      // Use the service function instead of direct fetch
      const data = await getUserNotifications(currentUser.id, state.page);
      
      console.log(`[NotificationContext] Received notifications data:`, {
        notificationsCount: data.notifications?.length,
        totalPages: data.totalPages,
        hasMore: data.hasMore
      });

      // Get unread count from server instead of calculating from notifications
      const unreadCount = await getUnreadNotificationsCount(currentUser.id);
      console.log(`[NotificationContext] Received unread count from server: ${unreadCount}`);

      // Update state
      dispatch({ 
        type: "SET_NOTIFICATIONS", 
        payload: { 
          notifications: data.notifications,
          totalPages: data.totalPages,
          hasMore: data.hasMore,
          unreadCount
        } 
      });

      console.log(`[NotificationContext] Updated notifications and unread count state`);
    } catch (error) {
      console.error(`[NotificationContext] Error loading notifications:`, error);
      dispatch({ 
        type: "SET_ERROR", 
        payload: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    } finally {
      // Remove loading state and operation
      dispatch({ type: "SET_LOADING", payload: false });
      try {
        removeLoadingOperation(loadingId);
      } catch (error) {
        console.error(`[NotificationContext] Error removing loading operation:`, error);
      }
    }
  };

  // Carregar contagem de não lidas
  const loadUnreadCount = async () => {
    if (!currentUser?.id) {
      console.log(`[NotificationContext] Cannot load unread count: No current user ID`);
      return;
    }
    
    // Prevent concurrent loads
    if (state.isLoading) {
      console.log(`[NotificationContext] Skipping unread count load - already loading`);
      return;
    }
    
    console.log(`[NotificationContext] Loading unread count for user: ${currentUser.id}`);
    try {
      const count = await getUnreadNotificationsCount(currentUser.id);
      console.log(`[NotificationContext] Received unread count from server: ${count}`);
      dispatch({ type: "SET_UNREAD_COUNT", payload: count });
      console.log(`[NotificationContext] Updated unread count in state: ${count}`);
    } catch (error) {
      console.error(`[NotificationContext] Error loading unread count:`, error);
    }
  };

  // Carregar mais notificações
  const loadMore = async () => {
    if (state.isLoading || !state.hasMore) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const nextPage = state.page + 1;
      const data = await getUserNotifications(currentUser.id, nextPage);
      
      dispatch({ 
        type: "SET_NOTIFICATIONS", 
        payload: {
          notifications: [...state.notifications, ...data.notifications],
          totalPages: data.totalPages,
          hasMore: data.hasMore
        }
      });
      dispatch({ type: "SET_PAGE", payload: nextPage });
    } catch (error) {
      dispatch({ 
        type: "SET_ERROR", 
        payload: "Erro ao carregar mais notificações" 
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Function to mark a notification as read
  const markAsRead = async (id: number) => {
    console.log(`[NotificationContext] Marking notification as read:`, { id });
    
    // Store the previous state for rollback
    const previousState = {
      notifications: [...state.notifications],
      unreadCount: state.unreadCount
    };

    try {
      // Optimistically update UI
      dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id } });
      
      // Update server
      await markNotificationAsRead(id);
      
      // Update unread count without refreshing all notifications
      await loadUnreadCount();
      
      console.log(`[NotificationContext] Successfully marked notification as read:`, { id });
    } catch (error) {
      console.error(`[NotificationContext] Error marking notification as read:`, error);
      
      // Rollback on error
      dispatch({ 
        type: "SET_NOTIFICATIONS", 
        payload: {
          notifications: previousState.notifications,
          totalPages: state.totalPages,
          hasMore: state.hasMore,
          unreadCount: previousState.unreadCount
        }
      });
      
      throw error;
    }
  };

  // Function to add a notification
  const addNotification = (notification: Notification) => {
    try {
      dispatch({ type: "ADD_NOTIFICATION", payload: notification });
      // Update unread count
      loadUnreadCount();
    } catch (error) {
      console.error("Erro ao adicionar notificação:", error);
    }
  };

  // Function to delete a notification
  const removeNotification = async (id: number) => {
    console.log(`[NotificationContext] Removing notification:`, { id });
    try {
      addLoadingOperation('removeNotification');
      await deleteNotification(id);
      
      // Update local state immediately
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: { id } });
      
      // Refresh notifications to ensure sync with server
      await loadNotifications();
      await loadUnreadCount();
      
      console.log(`[NotificationContext] Notification removed successfully:`, { id });
    } catch (error) {
      console.error(`[NotificationContext] Error removing notification:`, error);
      throw error;
    } finally {
      removeLoadingOperation('removeNotification');
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser?.id) return;
    
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao marcar todas as notificações como lidas');
      }

      dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });
      loadUnreadCount();
    } catch (error) {
      dispatch({ 
        type: "SET_ERROR", 
        payload: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        ...state,
        markAsRead,
        markAllAsRead,
        removeNotification,
        addNotification,
        refreshNotifications: loadNotifications,
        loadMore
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use the notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  
  return {
    notifications: context.notifications,
    unreadCount: context.unreadCount,
    isLoading: context.isLoading,
    error: context.error,
    page: context.page,
    totalPages: context.totalPages,
    hasMore: context.hasMore,
    markAsRead: context.markAsRead,
    markAllAsRead: context.markAllAsRead,
    removeNotification: context.removeNotification,
    addNotification: context.addNotification,
    refreshNotifications: context.refreshNotifications,
    loadMore: context.loadMore
  };
}
