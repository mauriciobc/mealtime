"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useMemo, useRef } from "react";
import { useSession, update } from "next-auth/react";
import { useLoading } from "./LoadingContext";
import { toast } from "sonner";
import { User as CurrentUserType } from "@/lib/types";

interface UserState {
  currentUser: CurrentUserType | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  isLoading: false,
  error: null,
};

interface UserAction {
  type: "FETCH_START" | "SET_CURRENT_USER" | "FETCH_ERROR" | "CLEAR_USER";
  payload?: CurrentUserType | string | null;
}

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "SET_CURRENT_USER":
      return { ...state, isLoading: false, currentUser: action.payload as CurrentUserType | null, error: null };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.payload as string };
    case "CLEAR_USER":
      return initialState;
    default:
      return state;
  }
}

const UserContext = createContext<{
  state: UserState;
  dispatch: React.Dispatch<UserAction>;
}>({ state: initialState, dispatch: () => null });

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);
  const { data: session, status, update: updateSession } = useSession();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const hasAttemptedLoad = useRef(false);

  const userEmail = session?.user?.email;

  useEffect(() => {
    hasAttemptedLoad.current = false;
  }, [userEmail]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const loadingId = "user-context-load";

    const loadUserData = async () => {
      if (status !== "authenticated" || !userEmail || !isMounted) {
        if (status === "unauthenticated" && state.currentUser) {
          dispatch({ type: "CLEAR_USER" });
        }
        return;
      }

      if (hasAttemptedLoad.current) return;

      dispatch({ type: "FETCH_START" });
      addLoadingOperation({ id: loadingId, priority: 1, description: "Carregando dados do usuário..." });
      hasAttemptedLoad.current = true;

      try {
        const response = await fetch('/api/settings', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          signal: controller.signal
        });

        if (!isMounted) return;

        let userData;
        try {
          userData = await response.json();
        } catch (e) {
          const textResponse = await response.text();
          console.error("[UserProvider] Failed to parse JSON response:", textResponse, e);
          throw new Error("Resposta inesperada do servidor ao carregar dados do usuário.");
        }

        if (!response.ok) {
          throw new Error(userData.error || `Falha ao carregar dados do usuário (${response.status})`);
        }

        if (!session?.user) {
          throw new Error('Sessão expirou durante o carregamento dos dados.');
        }

        const currentUser: CurrentUserType = {
          id: String(userData.id),
          name: userData.name || session.user.name || "",
          email: userData.email || session.user.email || "",
          avatar: userData.avatar || session.user.image || null,
          householdId: userData.householdId || null,
          role: userData.role || "member",
          preferences: userData.preferences && typeof userData.preferences === 'object' ? {
            timezone: userData.preferences.timezone || "UTC",
            language: userData.preferences.language || "pt-BR",
            notifications: userData.preferences.notifications && typeof userData.preferences.notifications === 'object' ? {
              pushEnabled: userData.preferences.notifications.pushEnabled !== undefined ? userData.preferences.notifications.pushEnabled : true,
              emailEnabled: userData.preferences.notifications.emailEnabled !== undefined ? userData.preferences.notifications.emailEnabled : true,
              feedingReminders: userData.preferences.notifications.feedingReminders !== undefined ? userData.preferences.notifications.feedingReminders : true,
              missedFeedingAlerts: userData.preferences.notifications.missedFeedingAlerts !== undefined ? userData.preferences.notifications.missedFeedingAlerts : true,
              householdUpdates: userData.preferences.notifications.householdUpdates !== undefined ? userData.preferences.notifications.householdUpdates : true
            } : { pushEnabled: true, emailEnabled: true, feedingReminders: true, missedFeedingAlerts: true, householdUpdates: true }
          } : { timezone: "UTC", language: "pt-BR", notifications: { pushEnabled: true, emailEnabled: true, feedingReminders: true, missedFeedingAlerts: true, householdUpdates: true } }
        };

        if (!isMounted) return;

        const currentSessionHouseholdId = session.user.householdId;
        if (currentUser.householdId !== currentSessionHouseholdId) {
          console.log("[UserProvider] Updating session with new household ID:", currentUser.householdId);
          await updateSession({ user: { ...session.user, householdId: currentUser.householdId } });
        }

        dispatch({ type: "SET_CURRENT_USER", payload: currentUser });

      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log("[UserProvider] Fetch aborted.");
        } else if (isMounted) {
          console.error("[UserProvider] Error loading user data:", error);
          toast.error(`Erro ao carregar dados: ${error.message}`);
          dispatch({ type: "FETCH_ERROR", payload: error.message });
        }
      } finally {
        if (isMounted) {
          removeLoadingOperation(loadingId);
        }
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [status, userEmail, addLoadingOperation, removeLoadingOperation, dispatch, updateSession, session]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);