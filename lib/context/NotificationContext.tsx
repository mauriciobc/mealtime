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
          hasMore: action.payload.hasMore ?? false
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
        
        const filteredNotifications = state.notifications.filter(
          notification => notification.id !== action.payload.id
        );
        return { 
          ...state, 
          notifications: filteredNotifications,
          unreadCount: Math.max(0, state.unreadCount - 1)
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

  // Carregar notificações iniciais
  useEffect(() => {
    if (currentUser?.id) {
      console.log('Carregando notificações para usuário:', currentUser.id);
      loadNotifications();
      loadUnreadCount();
    }
  }, [currentUser?.id]);

  // Carregar notificações
  const loadNotifications = async () => {
    if (!currentUser?.id) {
      console.log('Usuário não encontrado, não carregando notificações');
      return;
    }
    
    const loadingId = "notifications-load";
    addLoadingOperation({
      id: loadingId,
      priority: 2,
      description: "Carregando notificações..."
    });

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      const response = await fetch(`/api/notifications?page=${state.page}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Erro ao carregar notificações");
      }

      console.log('Dados recebidos:', data);

      // Garantir que os dados são válidos antes de atualizar o estado
      const notifications = Array.isArray(data.notifications) ? data.notifications : [];
      const totalPages = typeof data.totalPages === 'number' ? data.totalPages : 1;
      const hasMore = typeof data.hasMore === 'boolean' ? data.hasMore : false;

      console.log('Notificações processadas:', notifications);

      dispatch({ 
        type: "SET_NOTIFICATIONS", 
        payload: { 
          notifications,
          totalPages,
          hasMore
        } 
      });
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      dispatch({ 
        type: "SET_ERROR", 
        payload: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      removeLoadingOperation(loadingId);
    }
  };

  // Carregar contagem de não lidas
  const loadUnreadCount = async () => {
    if (!currentUser?.id) return;
    
    try {
      const count = await getUnreadNotificationsCount(currentUser.id);
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
      const response = await fetch(`/api/notifications?page=${nextPage}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Erro ao carregar mais notificações");
      }

      const newNotifications = Array.isArray(data.notifications) ? data.notifications : [];
      
      dispatch({ 
        type: "SET_NOTIFICATIONS", 
        payload: {
          notifications: [...state.notifications, ...newNotifications],
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
    dispatch({ 
      type: "ADD_NOTIFICATION", 
      payload: notification 
    });
    // Atualizar contagem de não lidas
    loadUnreadCount();
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
