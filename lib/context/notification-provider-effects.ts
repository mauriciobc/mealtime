"use client";

import { Dispatch, useEffect, useRef, useCallback } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import { cacheManager } from "@/lib/utils/indexeddb-manager";
import { notificationSync } from "@/lib/utils/notification-sync";
import {
  NotificationAction,
  NotificationState,
  normalizeNotification,
} from "./notification-context-state";

type EffectsParams = {
  dispatch: Dispatch<NotificationAction>;
  currentUserId: string | undefined;
  userLoading: boolean;
  authLoading: boolean;
  supabase: SupabaseClient;
  addLoadingOperation: (op: { id: string; priority: number; description: string }) => void;
  removeLoadingOperation: (id: string) => void;
};

export function useNotificationProviderEffects({
  dispatch,
  currentUserId,
  userLoading,
  authLoading,
  supabase,
  addLoadingOperation,
  removeLoadingOperation,
}: EffectsParams) {
  const pathname = usePathname();
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    cacheManager.init().catch((error) => {
      console.error("[NotificationProvider] Failed to initialize IndexedDB:", error);
    });
  }, []);

  useEffect(() => {
    const loadFromCache = async () => {
      if (!currentUserId || typeof currentUserId !== "string" || currentUserId.trim() === "") {
        return;
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
              unreadCount,
            },
          });
        }
      } catch (_error) {
        console.error("[NotificationProvider] Failed to load from cache:", _error);
      }
    };

    loadFromCache();
  }, [currentUserId, dispatch]);

  useEffect(() => {
    const handleOnline = () => {
      console.log("[NotificationProvider] Back online");
      dispatch({ type: "SET_IS_ONLINE", payload: true });
    };

    const handleOffline = () => {
      console.log("[NotificationProvider] Gone offline");
      dispatch({ type: "SET_IS_ONLINE", payload: false });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [dispatch]);

  const fetchInitialData = useCallback(
    async (userId: string) => {
      console.log(`[NotificationProvider] fetchInitialData called for userId: ${userId}`);

      if (!userId || typeof userId !== "string" || userId.trim() === "") {
        console.warn("[NotificationProvider] fetchInitialData called with invalid userId:", userId);
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
        dispatch({ type: "SET_SYNCING", payload: true });
        const syncResult = await notificationSync.syncFromServer(userId);

        if (syncResult.success) {
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
              unreadCount,
            },
          });
          dispatch({ type: "SET_LAST_SYNC_TIME", payload: new Date() });
        }
      } catch (_error) {
        console.error("[NotificationProvider] Error in fetchInitialData:", _error);
        dispatch({
          type: "SET_ERROR",
          payload: _error instanceof Error ? _error.message : "Failed to load notifications",
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({ type: "SET_SYNCING", payload: false });
        removeLoadingOperation(loadingOpId);
      }
    },
    [addLoadingOperation, removeLoadingOperation, dispatch]
  );

  useEffect(() => {
    if (currentUserId && !userLoading && !authLoading) {
      console.log("[NotificationProvider] User ready, fetching initial data");
      fetchInitialData(currentUserId);
    } else if (!currentUserId && !userLoading && !authLoading) {
      console.log("[NotificationProvider] No user logged in");
    }
  }, [currentUserId, userLoading, authLoading, pathname, fetchInitialData]);

  useEffect(() => {
    if (!currentUserId) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    console.log("[NotificationProvider] Setting up Realtime subscription");

    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log("[NotificationProvider] New notification received:", payload.new);
          if (payload.new) {
            const normalizedNotification = normalizeNotification(payload.new as Record<string, unknown>);
            dispatch({ type: "ADD_NOTIFICATION", payload: normalizedNotification });
            cacheManager
              .updateNotification(currentUserId, normalizedNotification.id, normalizedNotification)
              .catch(console.error);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log("[NotificationProvider] Notification updated:", payload.new);
          if (payload.new) {
            const normalized = normalizeNotification(payload.new as Record<string, unknown>);
            dispatch({ type: "UPDATE_NOTIFICATION", payload: normalized });
            cacheManager.updateNotification(currentUserId, payload.new.id, normalized).catch(console.error);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log("[NotificationProvider] Notification deleted:", payload.old);
          if (payload.old) {
            dispatch({ type: "REMOVE_NOTIFICATION", payload: { id: payload.old.id as string } });
          }
        }
      )
      .subscribe((status) => {
        console.log("[NotificationProvider] Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          reconnectAttemptsRef.current = 0;
          dispatch({ type: "SET_CONNECTION_STATUS", payload: "connected" });
        } else if (status === "CHANNEL_ERROR") {
          reconnectAttemptsRef.current++;
          dispatch({ type: "SET_CONNECTION_STATUS", payload: "error" });
          const backoffMs = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.warn(
            `[NotificationProvider] Channel error. Backing off ${backoffMs}ms before reconnect (attempt ${reconnectAttemptsRef.current})`
          );
        } else if (status === "CLOSED") {
          dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });
        } else {
          dispatch({ type: "SET_CONNECTION_STATUS", payload: "reconnecting" });
        }
      });

    return () => {
      console.log("[NotificationProvider] Cleaning up Realtime subscription");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      dispatch({ type: "SET_CONNECTION_STATUS", payload: "disconnected" });
    };
  }, [currentUserId, supabase, dispatch]);

  return { fetchInitialData };
}
