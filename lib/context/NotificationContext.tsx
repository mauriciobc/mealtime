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
  | { type: "MARK_AS_READ"; payload: string }
  | { type: "MARK_ALL_AS_READ" }
  | { type: "DELETE_NOTIFICATION"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

type NotificationContextType = {
  state: NotificationState;
  dispatch: React.Dispatch<NotificationAction>;
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
};

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
    case "MARK_AS_READ":
      const markedNotifications = state.notifications.map(notification =>
        notification.id === action.payload
          ? { ...notification, isRead: true }
          : notification
      );
      return { 
        ...state, 
        notifications: markedNotifications,
        unreadCount: markedNotifications.filter(n => !n.isRead).length
      };
    case "MARK_ALL_AS_READ":
      const allReadNotifications = state.notifications.map(notification => ({
        ...notification,
        isRead: true
      }));
      return { 
        ...state, 
        notifications: allReadNotifications,
        unreadCount: 0
      };
    case "DELETE_NOTIFICATION":
      const filteredNotifications = state.notifications.filter(
        notification => notification.id !== action.payload
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
  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      dispatch({ type: "MARK_AS_READ", payload: id });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to mark notification as read" });
    }
  };

  // Function to mark all notifications as read
  const markAllAsRead = async () => {
    if (!appState.currentUser) return;
    
    try {
      await markAllNotificationsAsRead(appState.currentUser.id);
      dispatch({ type: "MARK_ALL_AS_READ" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to mark all notifications as read" });
    }
  };

  // Function to delete a notification
  const removeNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      dispatch({ type: "DELETE_NOTIFICATION", payload: id });
    } catch (error) {
      console.error("Error deleting notification:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to delete notification" });
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        state,
        dispatch,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        removeNotification
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
  
  return context;
}
