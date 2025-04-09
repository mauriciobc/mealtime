"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useMemo, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useLoading } from "./LoadingContext";
import { toast } from "sonner";
import { User as CurrentUserType } from "@/lib/types";
import { useAppContext } from "./AppContext";

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
  const { dispatch: appDispatch } = useAppContext();
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const userEmail = session?.user?.email;

  // Set mounted ref
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cleanupLoading = useCallback((loadingId?: string) => {
    const idToCleanup = loadingId || loadingIdRef.current;
    if (idToCleanup && loadingIdRef.current === idToCleanup) {
      try {
        removeLoadingOperation(idToCleanup);
        loadingIdRef.current = null;
      } catch (error) {
        console.error('[UserProvider] Error cleaning up loading:', error);
      }
    }
  }, [removeLoadingOperation]);

  const cleanupRequest = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (error) {
        console.error('[UserProvider] Error aborting request:', error);
      } finally {
        abortControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    let isEffectActive = true; // Flag to track effect cleanup
    const loadingId = "user-context-load";

    const loadUserData = async () => {
      // Early return conditions check mount status AND effect active status
      if (!mountedRef.current || !isEffectActive || status !== "authenticated" || !userEmail) {
        if (status === "unauthenticated" && state.currentUser) {
          if (isEffectActive) {
             dispatch({ type: "CLEAR_USER" });
             appDispatch({ type: 'SET_CURRENT_USER', payload: null });
          }
        }
        return;
      }

      console.log("[UserProvider] Starting user data fetch (Effect active: " + isEffectActive + ")...");

      cleanupRequest();
      cleanupLoading(loadingId); 

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        if (!isEffectActive) return;
        dispatch({ type: "FETCH_START" });
        loadingIdRef.current = loadingId;
        addLoadingOperation({ id: loadingId, priority: 1, description: "Carregando dados do usuário..." });

        const response = await fetch('/api/settings', {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          credentials: 'include',
          signal: abortController.signal
        });
        
        if (!isEffectActive || !mountedRef.current) {
            console.log("[UserProvider] Fetch completed but effect/component inactive.");
            return;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[UserProvider] API error response:", { 
            status: response.status, 
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("[UserProvider] Non-JSON response:", { 
            status: response.status, 
            contentType,
          });
          throw new Error(`Resposta inesperada do servidor (tipo ${contentType || 'desconhecido'}).`);
        }

        let userData;
        try {
          userData = await response.json();
        } catch (e) {
          console.error("[UserProvider] JSON parse error:", e);
          throw new Error("Falha ao analisar a resposta JSON do servidor.");
        }

        if (!isEffectActive || !mountedRef.current) return;

        if (!session?.user) {
          throw new Error('Sessão inválida durante carregamento.');
        }

        const currentUser: CurrentUserType = {
          id: String(userData.id),
          name: userData.name || session.user.name || "",
          email: userData.email || session.user.email || "",
          avatar: userData.avatar || session.user.image || null,
          householdId: userData.householdId ? Number(userData.householdId) : null,
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

        if (!isEffectActive || !mountedRef.current) return;

        const currentSessionHouseholdId = session.user.householdId;
        if (currentUser.householdId !== currentSessionHouseholdId) {
          console.log("[UserProvider] Updating session with new household ID:", currentUser.householdId);
          await updateSession({ user: { ...session.user, householdId: currentUser.householdId } });
        }

        if (!isEffectActive || !mountedRef.current) return;

        console.log("[UserProvider] Dispatching SET_CURRENT_USER");
        dispatch({ type: "SET_CURRENT_USER", payload: currentUser });
        appDispatch({ type: 'SET_CURRENT_USER', payload: currentUser });

      } catch (error: any) {
        if (!isEffectActive || !mountedRef.current) {
            console.log("[UserProvider] Caught error but effect/component inactive:", error.name);
            return;
        }

        console.log(`[UserProvider] Caught error name: ${error.name}`);

        if (error.name === 'AbortError') {
          console.log("[UserProvider] Handling AbortError...");
          dispatch({ type: "FETCH_ERROR", payload: "Fetch aborted by client" });
          console.log("[UserProvider] Dispatched FETCH_ERROR for AbortError.");
        } else {
          console.log("[UserProvider] Handling generic error...");
          console.error("[UserProvider] Error loading user data:", error); 
          const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
          toast.error(`Erro ao carregar dados: ${errorMessage}`);
          dispatch({ type: "FETCH_ERROR", payload: errorMessage });
          appDispatch({ type: 'SET_CURRENT_USER', payload: null });
          console.log("[UserProvider] Dispatched FETCH_ERROR for generic error.");
        }
      } finally {
        if (isEffectActive && mountedRef.current) {
          console.log(`[UserProvider] Finally block: Cleaning up loadingId ${loadingId}`);
          cleanupLoading(loadingId);
        } else {
           console.log("[UserProvider] Finally block: Effect inactive or component unmounted, skipping cleanup.");
        }
        abortControllerRef.current = null;
      }
    };

    loadUserData();

    return () => {
      console.log("[UserProvider] Effect cleanup running...");
      isEffectActive = false;
      cleanupRequest();
    };
  }, [status, userEmail, addLoadingOperation, removeLoadingOperation, cleanupLoading, cleanupRequest, dispatch, updateSession, session, appDispatch]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);