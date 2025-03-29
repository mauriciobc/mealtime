"use client";

import { createContext, useContext, useReducer, useEffect, useState, ReactNode } from "react";
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationsCount,
  PaginatedResponse
} from "@/lib/services/notificationService";
import { Notification } from "@/lib/types/notification";
import { useAppContext } from "./AppContext";

// Types
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
  | { type: "SET_NOTIFICATIONS"; payload: { notifications: Notification[]; totalPages: number; hasMore: boolean } }
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
  switch (action.type) {
    case "SET_NOTIFICATIONS":
      return { 
        ...state, 
        notifications: action.payload.notifications,
        totalPages: action.payload.totalPages,
        hasMore: action.payload.hasMore
      };
    case "ADD_NOTIFICATION":
      const updatedNotifications = [action.payload, ...state.notifications];
      return { 
        ...state, 
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.isRead).length
      };
    case "MARK_NOTIFICATION_READ":
      const markedNotifications = state.notifications.map(notification =>
        notification.id === action.payload.id
          ? { ...notification, isRead: true }
          : notification
      );
      return { 
        ...state, 
        notifications: markedNotifications,
        unreadCount: markedNotifications.filter(n => !n.isRead).length
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
      const filteredNotifications = state.notifications.filter(
        notification => notification.id !== action.payload.id
      );
      return { 
        ...state, 
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter(n => !n.isRead).length
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_PAGE":
      return { ...state, page: action.payload };
    case "SET_UNREAD_COUNT":
      return { ...state, unreadCount: action.payload };
    default:
      return state;
  }
}

// Provider component
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { state: appState } = useAppContext();
  const currentUser = appState.currentUser;

  // Carregar notificações iniciais
  useEffect(() => {
    if (currentUser?.id) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [currentUser?.id]);

  // Carregar notificações
  const loadNotifications = async () => {
    if (!currentUser?.id) return;
    
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await fetch(`/api/notifications?page=${state.page}`);
      const data: PaginatedResponse<Notification> = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Erro ao carregar notificações");
      }

      dispatch({ 
        type: "SET_NOTIFICATIONS", 
        payload: { 
          notifications: data.data, 
          totalPages: data.totalPages,
          hasMore: data.hasMore 
        } 
      });
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: error instanceof Error ? error.message : "Erro desconhecido" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Carregar contagem de não lidas
  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationsCount(currentUser!.id);
      dispatch({ type: "SET_UNREAD_COUNT", payload: count });
    } catch (error) {
      console.error("Erro ao carregar contagem de não lidas:", error);
    }
  };

  // Carregar mais notificações
  const loadMore = async () => {
    if (state.isLoading || !state.hasMore) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const nextPage = state.page + 1;
      const response = await getUserNotifications(currentUser!.id, nextPage);
      
      dispatch({ 
        type: "SET_NOTIFICATIONS", 
        payload: {
          notifications: [...state.notifications, ...response.notifications],
          totalPages: response.totalPages,
          hasMore: response.hasMore
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
    try {
      await markNotificationAsRead(id);
      dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id } });
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  // Function to delete a notification
  const removeNotification = async (id: number) => {
    try {
      await deleteNotification(id);
      dispatch({ type: "REMOVE_NOTIFICATION", payload: { id } });
    } catch (error) {
      console.error("Erro ao remover notificação:", error);
    }
  };

  // Function to add a notification
  const addNotification = (notification: Notification) => {
    dispatch({ type: "ADD_NOTIFICATION", payload: notification });
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
