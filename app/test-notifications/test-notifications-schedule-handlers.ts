"use client";

import React from "react";
import { toast } from "sonner";
import { NotificationType } from "@/lib/types/notification";
import type { LogEntry, ScheduleForm, TestNotificationsAction } from "./test-notifications-reducer";

type Dispatch = React.Dispatch<TestNotificationsAction>;

type UserState = {
  currentUser?: { id?: string } | null;
};

export function createHandleScheduleNotification(
  userState: UserState,
  addLog: (log: LogEntry) => void,
  dispatch: Dispatch,
  refreshNotifications: () => Promise<void>,
  intervalMinutes: number,
  intervalSeconds: number,
  selectedCatId: string
) {
  return async (type: NotificationType, title: string, message: string) => {
    console.log(
      `[TestNotificationsPage] handleScheduleNotification called with: type=${type}, title=${title}, message=${message}, minutes=${intervalMinutes}, seconds=${intervalSeconds}`
    );
    if (!type || !title || !message) {
      const errorMsg = "Todos os campos são obrigatórios";
      toast.error(errorMsg);
      addLog({
        timestamp: new Date(),
        type: type || "info",
        title: title || "Validation Error",
        message: message || "Missing fields",
        status: "error",
        details: { error: errorMsg, context: { type, title, message } },
      });
      return;
    }
    if (!userState.currentUser?.id) {
      const errorMsg = "Usuário não autenticado";
      toast.error(errorMsg);
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "error",
        details: { error: errorMsg, context: { currentUser: userState.currentUser } },
      });
      return;
    }
    dispatch({ type: "SET_LOADING", value: true });
    try {
      const totalSeconds = intervalMinutes * 60 + intervalSeconds;
      const deliverAt = new Date(Date.now() + totalSeconds * 1000);

      const payload = {
        type,
        title,
        message,
        deliverAt: deliverAt.toISOString(),
        catId: selectedCatId || undefined,
      };

      console.log("[TestNotificationsPage] Scheduling notification with payload:", payload);

      const response = await fetch("/api/scheduled-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao criar notificação agendada");
      }

      const scheduledNotification = await response.json();

      addLog({
        timestamp: new Date(),
        type,
        title,
        message: `Notificação agendada para ${deliverAt.toLocaleString("pt-BR")} (${intervalMinutes}m ${intervalSeconds}s)`,
        status: "success",
        details: { payload, response: scheduledNotification },
      });

      toast.success("Notificação agendada com sucesso!");
      await refreshNotifications();
    } catch (_error) {
      const _errorMsg =
        _error instanceof Error ? _error.message : "Erro desconhecido ao agendar notificação";
      addLog({
        timestamp: new Date(),
        type,
        title,
        message,
        status: "error",
        details: {
          error: _error instanceof Error ? _error.message : String(_error),
          errorObject: _error,
          context: { currentUser: userState.currentUser },
        },
      });
      toast.error(_errorMsg);
    } finally {
      dispatch({ type: "SET_LOADING", value: false });
    }
  };
}

export function createHandleSchedule(form: ScheduleForm, addLog: (log: LogEntry) => void, dispatch: Dispatch) {
  return async (e: React.FormEvent) => {
    e.preventDefault();
    const deliverAtDate = new Date(form.deliverAt);
    if (isNaN(deliverAtDate.getTime()) || deliverAtDate <= new Date()) {
      toast.error("A data/hora de entrega deve ser no futuro.");
      return;
    }
    dispatch({ type: "SET_SCHEDULING", value: true });
    try {
      const payload = {
        type: form.type,
        title: form.title,
        message: form.message,
        deliverAt: deliverAtDate.toISOString(),
        catId: form.catId || undefined,
      };

      const response = await fetch("/api/scheduled-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao criar notificação agendada");
      }

      const scheduledNotification = await response.json();

      addLog({
        timestamp: new Date(),
        type: form.type as NotificationType,
        title: form.title,
        message: `Notificação agendada para ${deliverAtDate.toLocaleString("pt-BR")}`,
        status: "success",
        details: { payload, response: scheduledNotification },
      });

      toast.success("Notificação agendada com sucesso!");
      dispatch({ type: "RESET_FORM" });
    } catch (err: unknown) {
      console.error("[TestNotificationsPage] Error scheduling notification:", err);

      addLog({
        timestamp: new Date(),
        type: form.type as NotificationType,
        title: form.title,
        message: form.message,
        status: "error",
        details: {
          error: err instanceof Error ? err.message : "Erro desconhecido",
          errorObject: err,
        },
      });

      toast.error(
        "Falha ao agendar notificação: " + (err instanceof Error ? err.message : "Erro desconhecido")
      );
    } finally {
      dispatch({ type: "SET_SCHEDULING", value: false });
    }
  };
}
