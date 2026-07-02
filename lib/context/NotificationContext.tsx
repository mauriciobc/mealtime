"use client";

import { createContext, useContext, useReducer, ReactNode, useMemo, useState } from "react";
import { useUserContext } from "./UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { createClient } from "@/utils/supabase/client";
import {
  notificationReducer,
  getInitialNotificationState,
  NotificationContextType,
} from "./notification-context-state";
import { useNotificationProviderEffects } from "./notification-provider-effects";
import { useNotificationProviderActions } from "./notification-provider-actions";

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let notificationProviderMetricEmitted = false;

export function NotificationProvider({ children }: { children: ReactNode }) {
  if (!notificationProviderMetricEmitted) {
    notificationProviderMetricEmitted = true;
    console.log("[METRIC] NotificationProvider initialized");
  }

  const [state, dispatch] = useReducer(notificationReducer, getInitialNotificationState());
  const { state: userState, authLoading } = useUserContext();
  const userLoading = userState.isLoading;
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const currentUserId = userState.currentUser?.id;
  const [supabase] = useState(() => createClient());

  const { fetchInitialData } = useNotificationProviderEffects({
    dispatch,
    currentUserId,
    userLoading,
    authLoading,
    supabase,
    addLoadingOperation,
    removeLoadingOperation,
  });

  const { markAsRead, markAllAsRead, removeNotification, refreshNotifications, loadMore } =
    useNotificationProviderActions({
      dispatch,
      state,
      currentUserId,
      fetchInitialData,
    });

  const value = useMemo(
    () => ({
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
    }),
    [
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
      loadMore,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    console.error("useNotifications hook used outside of NotificationProvider");
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
