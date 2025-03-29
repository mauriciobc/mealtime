"use client";

import { createContext, useContext, useReducer, useEffect, useState, ReactNode } from "react";
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification 
} from "@/lib/services/notificationService";
import { Notification } from "@/lib/types/notification";
import { useAppContext } from "./AppContext";

// Types
type NotificationState = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
};

type NotificationAction =
  | { type: "SET_NOTIFICATIONS"; payload: Notification[] }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_NOTIFICATION_READ"; payload: { id: number } }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "REMOVE_NOTIFICATION"; payload: { id: number } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: number) => Promise<void>;
  addNotification: (notification: Notification) => void;
  refreshNotifications: () => Promise<void>;
}

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

// Create the context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Reducer function
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case "SET_NOTIFICATIONS":
      return { 
        ...state, 
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.isRead).length
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
    default:
      return state;
  }
}

// Provider component
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { state: appState } = useAppContext();
  const [initialized, setInitialized] = useState(false);

  // Load notifications when current user changes
  useEffect(() => {
    if (appState.currentUser && !initialized) {
      loadNotifications();
      setInitialized(true);
    }
  }, [appState.currentUser, initialized]);

  // Function to load notifications
  const loadNotifications = async () => {
    if (!appState.currentUser) return;
    
    dispatch({ type: "SET_LOADING", payload: true });
    
    try {
      const notifications = await getUserNotifications(appState.currentUser.id);
      dispatch({ type: "SET_NOTIFICATIONS", payload: notifications });
      dispatch({ type: "SET_ERROR", payload: null });
    } catch (error) {
      console.error("Error loading notifications:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to load notifications" });
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

  // Function to refresh notifications
  const refreshNotifications = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      if (appState.currentUser) {
        const notifications = await getUserNotifications(appState.currentUser.id);
        dispatch({ type: "SET_NOTIFICATIONS", payload: notifications });
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      dispatch({ type: "SET_ERROR", payload: "Falha ao carregar notificações" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Function to mark all notifications as read
  const markAllAsRead = async () => {
    try {
      if (appState.currentUser) {
        await markAllNotificationsAsRead(appState.currentUser.id);
        dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });
      }
    } catch (error) {
      console.error("Erro ao marcar todas as notificações como lidas:", error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        isLoading: state.isLoading,
        error: state.error,
        markAsRead,
        markAllAsRead,
        removeNotification,
        addNotification,
        refreshNotifications
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
    markAsRead: context.markAsRead,
    markAllAsRead: context.markAllAsRead,
    removeNotification: context.removeNotification,
    addNotification: context.addNotification,
    refreshNotifications: context.refreshNotifications
  };
}
