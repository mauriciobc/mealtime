"use client";

import React from "react";
import { toast } from "sonner";
import { notificationService } from "@/lib/services/supabase-notification-service";
import { NotificationType } from "@/lib/types/notification";
import type { LogEntry, TestNotificationsAction } from "./test-notifications-reducer";

type Dispatch = React.Dispatch<TestNotificationsAction>;

type UserState = {
  currentUser?: { id?: string } | null;
};

export function createHandleCreateNotification(
  userState: UserState,
  addLog: (log: LogEntry) => void,
  dispatch: Dispatch,
  refreshNotifications: () => Promise<void>
) {
  return async (type: NotificationType, title: string, message: string) => {
    console.log(
      `[TestNotificationsPage] handleCreateNotification called with: type=${type}, title=${title}, message=${message}`
    );
    if (!type || !title || !message) {
      const errorMsg = "Todos os campos são obrigatórios";
      console.error(`[TestNotificationsPage] Validation failed: ${errorMsg}`);
      toast.error(errorMsg);
      addLog({
        timestamp: new Date(),
        type: type || "info",
        title: title || "Validation Error",
        message: message || "Missing fields",
        status: "error",
        details: {
          error: errorMsg,
          context: { type, title, message },
        },
      });
      return;
    }

    if (!userState.currentUser?.id) {
      const errorMsg = "Usuário não autenticado";
      console.error(`[TestNotificationsPage] Auth failed: ${errorMsg}`);
      toast.error(errorMsg);
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "error",
        details: {
          error: errorMsg,
          context: { currentUser: userState.currentUser },
        },
      });
      return;
    }

    console.log("[TestNotificationsPage] Setting loading state to true");
    dispatch({ type: "SET_LOADING", value: true });

    try {
      const payload = {
        type,
        title,
        message,
        isRead: false,
        metadata: {},
      };
      console.log(
        "[TestNotificationsPage] Calling notificationService.createNotification with payload:",
        payload
      );

      const response = await notificationService.createNotification(payload);
      console.log(
        "[TestNotificationsPage] notificationService.createNotification responded:",
        response
      );

      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "success",
        details: {
          payload,
          response,
        },
      });

      console.log(
        "[TestNotificationsPage] Notification created successfully. Calling refreshNotifications."
      );
      toast.success("Notificação criada com sucesso!");
      await refreshNotifications();
      console.log("[TestNotificationsPage] refreshNotifications completed.");
    } catch (_error) {
      console.error("[TestNotificationsPage] Error creating notification:", _error);
      const errorMsg =
        _error instanceof Error ? _error.message : "Erro desconhecido ao criar notificação";

      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "error",
        details: {
          error: errorMsg,
          errorObject: _error,
          context: {
            currentUser: userState.currentUser,
            payload: { type, title, message },
          },
        },
      });

      toast.error(errorMsg);
    } finally {
      console.log("[TestNotificationsPage] Setting loading state to false");
      dispatch({ type: "SET_LOADING", value: false });
    }
  };
}
