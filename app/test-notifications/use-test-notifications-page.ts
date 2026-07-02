"use client";

import React from "react";
import { useReducer, useCallback, useEffect, useId, useMemo } from "react";
import { useNotifications } from "@/lib/context/NotificationContext";
import { useUserContext } from "@/lib/context/UserContext";
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale";
import { useCats } from "@/lib/context/CatsContext";
import {
  initialScheduleForm,
  LogEntry,
  testNotificationsReducer,
} from "./test-notifications-reducer";
import { createHandleCreateNotification } from "./test-notifications-create-handler";
import {
  createHandleSchedule,
  createHandleScheduleNotification,
} from "./test-notifications-schedule-handlers";
import { getStatusColor, getStatusText } from "./test-notifications-status";

export function useTestNotificationsPage() {
  console.log("[TestNotificationsPage] Rendering...");
  const baseId = useId();
  const idScheduleType = `${baseId}-type`;
  const idScheduleTitle = `${baseId}-title`;
  const idScheduleMessage = `${baseId}-message`;
  const idScheduleDeliverAt = `${baseId}-deliverAt`;
  const idScheduleCatId = `${baseId}-catId`;
  const {
    notifications,
    isLoading: notificationsLoading,
    error: notificationsError,
    refreshNotifications,
    unreadCount,
    isLoading: contextIsLoading,
    page,
    totalPages,
    hasMore,
  } = useNotifications();
  const { state: userState } = useUserContext();
  const { state: catsState } = useCats();
  const { cats, isLoading: catsLoading, error: catsError } = catsState;
  const [state, dispatch] = useReducer(testNotificationsReducer, {
    isLoading: false,
    logs: [] as LogEntry[],
    intervalMinutes: 0,
    intervalSeconds: 0,
    selectedCatId: cats[0]?.id || "",
    form: initialScheduleForm,
    isScheduling: false,
  });
  const { isLoading, logs, intervalMinutes, intervalSeconds, selectedCatId, form, isScheduling } = state;

  console.log("[TestNotificationsPage] Context State:", {
    notificationsCount: notifications.length,
    unreadCount,
    contextIsLoading,
    contextError: notificationsError,
    page,
    totalPages,
    hasMore,
    componentIsLoading: isLoading,
  });
  console.log("[TestNotificationsPage] User State:", userState);

  const userLanguage = userState.currentUser?.preferences?.language;
  const _userLocale = resolveDateFnsLocale(userLanguage);

  const addLog = useCallback((log: LogEntry) => {
    console.log("[TestNotificationsPage] Adding log entry:", log);
    dispatch({ type: "ADD_LOG", log });
  }, []);

  const handleCreateNotification = useMemo(
    () => createHandleCreateNotification(userState, addLog, dispatch, refreshNotifications),
    [userState, addLog, refreshNotifications]
  );

  const handleScheduleNotification = useMemo(
    () =>
      createHandleScheduleNotification(
        userState,
        addLog,
        dispatch,
        refreshNotifications,
        intervalMinutes,
        intervalSeconds,
        selectedCatId
      ),
    [userState, addLog, refreshNotifications, intervalMinutes, intervalSeconds, selectedCatId]
  );

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    dispatch({ type: "PATCH_FORM", field: e.target.name as keyof typeof form, value: e.target.value });
  };

  const handleSchedule = useMemo(
    () => createHandleSchedule(form, addLog, dispatch),
    [form, addLog]
  );

  useEffect(() => {
    if (cats.length > 0 && !selectedCatId && cats[0]) {
      dispatch({ type: "SET_SELECTED_CAT", value: cats[0].id });
    }
  }, [cats, selectedCatId]);

  return {
    idScheduleType,
    idScheduleTitle,
    idScheduleMessage,
    idScheduleDeliverAt,
    idScheduleCatId,
    notificationsLoading,
    notificationsError,
    cats,
    catsLoading,
    catsError,
    isLoading,
    logs,
    intervalMinutes,
    intervalSeconds,
    selectedCatId,
    form,
    isScheduling,
    dispatch,
    handleCreateNotification,
    handleScheduleNotification,
    handleFormChange,
    handleSchedule,
    getStatusColor,
    getStatusText,
  };
}

export type TestNotificationsPageViewProps = ReturnType<typeof useTestNotificationsPage>;
