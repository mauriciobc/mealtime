"use client";

import { Dispatch, useCallback } from "react";
import { notificationService } from "@/lib/services/supabase-notification-service";
import { cacheManager } from "@/lib/utils/indexeddb-manager";
import { NotificationAction, NotificationState } from "./notification-context-state";

type ActionsParams = {
  dispatch: Dispatch<NotificationAction>;
  state: NotificationState;
  currentUserId: string | undefined;
  fetchInitialData: (userId: string) => Promise<void>;
};

export function useNotificationProviderActions({
  dispatch,
  state,
  currentUserId,
  fetchInitialData,
}: ActionsParams) {
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
          hasMore: cachedNotifications.length === 10,
        },
      });
    } catch (_error) {
      console.error("[NotificationProvider] Error loading more:", _error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state.hasMore, state.isLoading, state.page, state.totalPages, currentUserId, dispatch]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!currentUserId) return;

      try {
        dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id } });

        const notification = state.notifications.find((n) => n.id === id);
        if (notification) {
          await cacheManager.updateNotification(currentUserId, id, { ...notification, isRead: true });
        }

        await notificationService.markAsRead([id]);
      } catch (_error) {
        console.error("[NotificationProvider] Error marking as read:", _error);
        dispatch({
          type: "SET_ERROR",
          payload: _error instanceof Error ? _error.message : "Failed to mark as read",
        });
      }
    },
    [currentUserId, state.notifications, dispatch]
  );

  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) return;

    try {
      dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });

      for (const notification of state.notifications.filter((n) => !n.isRead)) {
        await cacheManager.updateNotification(currentUserId, notification.id, {
          ...notification,
          isRead: true,
        });
      }

      await notificationService.markAllAsRead();
    } catch (_error) {
      console.error("[NotificationProvider] Error marking all as read:", _error);
    }
  }, [currentUserId, state.notifications, dispatch]);

  const removeNotification = useCallback(
    async (id: string) => {
      if (!currentUserId) return;

      try {
        dispatch({ type: "REMOVE_NOTIFICATION", payload: { id } });
        await notificationService.deleteNotification(id);
      } catch (_error) {
        console.error("[NotificationProvider] Error removing notification:", _error);
      }
    },
    [currentUserId, dispatch]
  );

  return {
    refreshNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    removeNotification,
  };
}
