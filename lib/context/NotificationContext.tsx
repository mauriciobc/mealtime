"use client";

import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useMemo, useState } from "react";
import { Notification, ConnectionStatus } from "@/lib/types/notification";
import { useUserContext } from "./UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { usePathname } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import { notificationService } from "@/lib/services/supabase-notification-service";
import { cacheManager } from "@/lib/utils/indexeddb-manager";
import { notificationSync } from "@/lib/utils/notification-sync";

// Types
type NotificationState = {
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

type NotificationAction =
  | { type: "SET_NOTIFICATIONS"; payload: { notifications: Notification[]; totalPages: number; hasMore: boolean; unreadCount: number } }
  | { type: "APPEND_NOTIFICATIONS"; payload: { notifications: Notification[]; totalPages: number; hasMore: boolean } }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
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

interface NotificationContextType {
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

// Initial state
const getInitialState = (): NotificationState => {
  return {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isSyncing: false,
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    connectionStatus: 'disconnected',
    error: null,
    page: 1,
    totalPages: 1,
    hasMore: false,
    lastSyncTime: null,
  };
};

// Create the context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Utility to normalize notification object keys to camelCase
function normalizeNotification(raw: any): Notification {
  return {
    id: String(raw.id),
    title: raw.title,
    message: raw.message,
    type: raw.type,
    isRead: raw.is_read ?? raw.isRead ?? false,
    createdAt: raw.created_at || raw.createdAt || '',
    updatedAt: raw.updated_at || raw.updatedAt || '',
    userId: raw.user_id || raw.userId || '',
    metadata: raw.metadata ?? undefined,
  };
}

// Reducer function
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
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
          page: 1
        };
      case "APPEND_NOTIFICATIONS":
        const existingIds = new Set(state.notifications.map(n => n.id));
        const newNotifications = action.payload.notifications.filter(n => !existingIds.has(n.id));
        return {
          ...state,
          notifications: [...state.notifications, ...newNotifications],
          totalPages: action.payload.totalPages,
          hasMore: action.payload.hasMore,
        };
      case "ADD_NOTIFICATION":
        if (state.notifications.some(n => n.id === action.payload.id)) {
          return state;
        }
        return { 
          ...state, 
          notifications: [normalizeNotification(action.payload), ...state.notifications],
          unreadCount: state.unreadCount + (normalizeNotification(action.payload).isRead ? 0 : 1)
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
        if (!anyUnread) {
          return state;
        }
        return { 
          ...state, 
          notifications: state.notifications.map(n => n.isRead ? n : { ...n, isRead: true }),
          unreadCount: 0
        };
      case "REMOVE_NOTIFICATION":
        const notificationToRemove = state.notifications.find(n => n.id === action.payload.id);
        if (!notificationToRemove) {
          return state;
        }
        const filteredNotifications = state.notifications.filter(n => n.id !== action.payload.id);
        const newUnreadCount = !notificationToRemove.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount;
        return { 
          ...state, 
          notifications: filteredNotifications,
          unreadCount: newUnreadCount
        };
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

// Idempotent metric: only emit once per process (avoids double log in React Strict Mode dev)
let notificationProviderMetricEmitted = false;

// Provider component
export function NotificationProvider({ children }: { children: ReactNode }) {
  if (!notificationProviderMetricEmitted) {
    notificationProviderMetricEmitted = true;
    console.log('[METRIC] NotificationProvider initialized');
  }
  const [state, dispatch] = useReducer(notificationReducer, getInitialState());
  const { state: userState, authLoading } = useUserContext();
  const userLoading = userState.isLoading;
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const currentUser = userState.currentUser;
  const currentUserId = currentUser?.id;
  const pathname = usePathname();
  const supabase = createClient();

  // Initialize IndexedDB cache
  useEffect(() => {
    cacheManager.init().catch(error => {
      console.error('[NotificationProvider] Failed to initialize IndexedDB:', error);
    });
  }, []);

  // Load from cache on mount (only when user is authenticated)
  useEffect(() => {
    const loadFromCache = async () => {
      if (!currentUserId || typeof currentUserId !== 'string' || currentUserId.trim() === '') {
        return; // Normal when unauthenticated (e.g. login page)
      }
      
      try {
        const [cachedNotifications, unreadCount, totalCount] = await Promise.all([
          cacheManager.getNotifications(currentUserId, 1, 10),
          cacheManager.getUnreadCount(currentUserId),
          cacheManager.getTotalCount(currentUserId),
        ]);

        if (cachedNotifications.length > 0) {
          dispatch({
            type: "SET_NOTIFICATIONS",
            payload: {
              notifications: cachedNotifications,
              totalPages: Math.ceil(totalCount / 10),
              hasMore: cachedNotifications.length === 10,
              unreadCount
            }
          });
        }
      } catch (_error) {
        console.error('[NotificationProvider] Failed to load from cache:', _error);
      }
    };

    loadFromCache();
  }, [currentUserId]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('[NotificationProvider] Back online');
      dispatch({ type: "SET_IS_ONLINE", payload: true });
    };
    
    const handleOffline = () => {
      console.log('[NotificationProvider] Gone offline');
      dispatch({ type: "SET_IS_ONLINE", payload: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchInitialData = useCallback(async (userId: string) => {
    console.log(`[NotificationProvider] fetchInitialData called for userId: ${userId}`);
    
    // Validate userId before proceeding
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.warn('[NotificationProvider] fetchInitialData called with invalid userId:', userId);
      dispatch({ type: "SET_ERROR", payload: "ID de usuário inválido" });
      dispatch({ type: "SET_LOADING", payload: false });
      return;
    }

    const loadingOpId = `notifications-initial-${userId}`;
    addLoadingOperation({ id: loadingOpId, priority: 1, description: "Carregando notificações..." });
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_PAGE", payload: 1 });

    try {
      // Sync from server
      dispatch({ type: "SET_SYNCING", payload: true });
      const syncResult = await notificationSync.syncFromServer(userId);
      
      if (syncResult.success) {
        // Load from cache
        const [cachedNotifications, unreadCount, totalCount] = await Promise.all([
          cacheManager.getNotifications(userId, 1, 10),
          cacheManager.getUnreadCount(userId),
          cacheManager.getTotalCount(userId),
        ]);

        dispatch({
          type: "SET_NOTIFICATIONS",
          payload: {
            notifications: cachedNotifications,
            totalPages: Math.ceil(totalCount / 10),
            hasMore: cachedNotifications.length === 10,
            unreadCount
          }
        });
        dispatch({ type: "SET_LAST_SYNC_TIME", payload: new Date() });
      }
    } catch (_error) {
      console.error("[NotificationProvider] Error in fetchInitialData:", _error);
      dispatch({ type: "SET_ERROR", payload: _error instanceof Error ? _error.message : "Failed to load notifications" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({ type: "SET_SYNCING", payload: false });
      removeLoadingOperation(loadingOpId);
    }
  }, [addLoadingOperation, removeLoadingOperation]);

  // Effect to trigger initial data fetch
  useEffect(() => {
    if (currentUserId && !userLoading && !authLoading) {
      console.log('[NotificationProvider] User ready, fetching initial data');
      fetchInitialData(currentUserId);
    } else if (!currentUserId && !userLoading && !authLoading) {
      console.log('[NotificationProvider] No user logged in');
    }
  }, [currentUserId, userLoading, authLoading, pathname, fetchInitialData]);

  // Set up Realtime subscription
  useEffect(() => {
    if (!currentUserId) return;

    console.log('[NotificationProvider] Setting up Realtime subscription');
    
    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          console.log('[NotificationProvider] New notification received:', payload.new);
          if (payload.new) {
            const normalizedNotification = normalizeNotification(payload.new);
            dispatch({ type: "ADD_NOTIFICATION", payload: normalizedNotification });
            // Update cache with userId
            cacheManager.updateNotification(currentUserId, normalizedNotification.id, normalizedNotification).catch(console.error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          console.log('[NotificationProvider] Notification updated:', payload.new);
          if (payload.new) {
            dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id: payload.new.id } });
            cacheManager.updateNotification(currentUserId, payload.new.id, normalizeNotification(payload.new)).catch(console.error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          console.log('[NotificationProvider] Notification deleted:', payload.old);
          if (payload.old) {
            dispatch({ type: "REMOVE_NOTIFICATION", payload: { id: payload.old.id } });
          }
        }
      )
      .subscribe((status) => {
        console.log('[NotificationProvider] Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          dispatch({ type: "SET_CONNECTION_STATUS", payload: 'connected' });
        } else if (status === 'CHANNEL_ERROR') {
          dispatch({ type: "SET_CONNECTION_STATUS", payload: 'error' });
        } else {
          dispatch({ type: "SET_CONNECTION_STATUS", payload: 'reconnecting' });
        }
      });

    return () => {
      console.log('[NotificationProvider] Cleaning up Realtime subscription');
      supabase.removeChannel(channel);
      dispatch({ type: "SET_CONNECTION_STATUS", payload: 'disconnected' });
    };
  }, [currentUserId, supabase]);

  const refreshNotifications = useCallback(async () => {
    if (!currentUserId) return;
    await fetchInitialData(currentUserId);
  }, [fetchInitialData, currentUserId]);

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.isLoading || !currentUserId) return;
    
    const nextPage = state.page + 1;
    dispatch({ type: "SET_PAGE", payload: nextPage });
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const cachedNotifications = await cacheManager.getNotifications(currentUserId, nextPage, 10);
      
      dispatch({
        type: "APPEND_NOTIFICATIONS",
        payload: {
          notifications: cachedNotifications,
          totalPages: state.totalPages,
          hasMore: cachedNotifications.length === 10
        }
      });
    } catch (_error) {
      console.error("[NotificationProvider] Error loading more:", _error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state.hasMore, state.isLoading, state.page, state.totalPages, currentUserId]);

  const markAsRead = useCallback(async (id: string) => {
    if (!currentUserId) return;
    
    try {
      // Optimistic update
      dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id } });
      
      // Update cache with userId
      const notification = state.notifications.find(n => n.id === id);
      if (notification) {
        await cacheManager.updateNotification(currentUserId, id, { ...notification, isRead: true });
      }
      
      // Update server
      await notificationService.markAsRead([id]);
    } catch (_error) {
      console.error(`[NotificationProvider] Error marking as read:`, _error);
      // Revert optimistic update on error
      dispatch({ type: "SET_ERROR", payload: _error instanceof Error ? _error.message : "Failed to mark as read" });
    }
  }, [currentUserId, state.notifications]);

  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });
      
      // Update all in cache with userId
      for (const notification of state.notifications.filter(n => !n.isRead)) {
        await cacheManager.updateNotification(currentUserId, notification.id, { ...notification, isRead: true });
      }
      
      await notificationService.markAllAsRead();
    } catch (_error) {
      console.error("[NotificationProvider] Error marking all as read:", _error);
    }
  }, [currentUserId, state.notifications]);

  const removeNotification = useCallback(async (id: string) => {
    if (!currentUserId) return;
    
    try {
      dispatch({ type: "REMOVE_NOTIFICATION", payload: { id } });
      await notificationService.deleteNotification(id);
    } catch (_error) {
      console.error(`[NotificationProvider] Error removing notification:`, _error);
    }
  }, [currentUserId]);

  const value = useMemo(() => ({
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
    isOnline: state.isOnline,
    connectionStatus: state.connectionStatus,
    error: state.error,
    page: state.page,
    totalPages: state.totalPages,
    hasMore: state.hasMore,
    lastSyncTime: state.lastSyncTime,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refreshNotifications,
    loadMore,
  }), [
    state.notifications,
    state.unreadCount,
    state.isLoading,
    state.isSyncing,
    state.isOnline,
    state.connectionStatus,
    state.error,
    state.page,
    state.totalPages,
    state.hasMore,
    state.lastSyncTime,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refreshNotifications,
    loadMore
  ]);

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
  return context;
}

