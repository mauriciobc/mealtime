"use client";

import { Dispatch, MutableRefObject, useCallback } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";
import { User as CurrentUserType } from "@/lib/types";
import { getUserProfile, getFirstHouseholdMembership } from "@/lib/actions/userActions";
import { logger } from "@/lib/monitoring/logger";
import { UserAction, UserState } from "./user-context-state";
import {
  buildUserFromProfile,
  buildNewUserPayload,
  isDatabaseConnectionError,
} from "./user-context-helpers";

type LoadUserDataParams = {
  state: UserState;
  dispatch: Dispatch<UserAction>;
  setProfile: (v: CurrentUserType | null) => void;
  setAuthLoading: (v: boolean) => void;
  mountedRef: MutableRefObject<boolean>;
  lastProfileFetchRef: MutableRefObject<string | null>;
  authChangeTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
};

export function useUserLoadData({
  state,
  dispatch,
  setProfile,
  setAuthLoading,
  mountedRef,
  lastProfileFetchRef,
  authChangeTimeoutRef,
}: LoadUserDataParams) {
  return useCallback(
    async (currentUserFromSupabase: SupabaseUser | null) => {
      if (!currentUserFromSupabase || !mountedRef.current) {
        if (state.currentUser) {
          dispatch({ type: "CLEAR_USER" });
        }
        setProfile(null);
        lastProfileFetchRef.current = null;
        setAuthLoading(false);
        return;
      }

      if (lastProfileFetchRef.current === currentUserFromSupabase.id) {
        setAuthLoading(false);
        return;
      }

      if (authChangeTimeoutRef.current) {
        clearTimeout(authChangeTimeoutRef.current);
      }

      dispatch({ type: "FETCH_START" });
      lastProfileFetchRef.current = currentUserFromSupabase.id;

      try {
        const { data: fetchedProfile, error: fetchError } = await getUserProfile();

        if (!mountedRef.current) {
          setAuthLoading(false);
          return;
        }

        if (fetchError != null) {
          logger.error("[UserProvider] Error fetching user profile:", { error: fetchError });

          const errorMessage = typeof fetchError === "string" ? fetchError : "Unknown error";

          if (isDatabaseConnectionError(errorMessage)) {
            toast.error("Erro de conexão com o banco de dados. Tentando reconectar...", { duration: 5000 });
            logger.error("[UserProvider] Database connection error:", { error: fetchError });
          } else {
            toast.error("Erro ao carregar perfil do usuário. Por favor, tente novamente.", { duration: 4000 });
          }

          dispatch({ type: "FETCH_ERROR", payload: errorMessage });
          setProfile(null);
          lastProfileFetchRef.current = null;
          setAuthLoading(false);
          return;
        }

        let primaryHouseholdId: string | null = null;
        if (fetchedProfile) {
          logger.info("[UserProvider] Profile fetched, now fetching first household membership...");

          const { data: membershipData, error: membershipError } = await getFirstHouseholdMembership(
            currentUserFromSupabase.id
          );

          if (!mountedRef.current) {
            setAuthLoading(false);
            return;
          }

          if (membershipError) {
            logger.error("[UserProvider] Error fetching household membership:", { error: membershipError });
            toast.error("Erro ao verificar a qual residência pertence.");
          } else if (membershipData) {
            primaryHouseholdId = membershipData.household_id;
            logger.info(`[UserProvider] Found primary household ID: ${primaryHouseholdId}`);
          } else {
            logger.info("[UserProvider] User is not a member of any household.");
          }

          const userData = buildUserFromProfile(currentUserFromSupabase, fetchedProfile, primaryHouseholdId);
          setProfile(userData);
          dispatch({ type: "SET_CURRENT_USER", payload: userData });
        } else {
          logger.info("[UserProvider] No profile found for user, treating as new user.");
          dispatch({ type: "SET_CURRENT_USER", payload: buildNewUserPayload(currentUserFromSupabase) });
        }
      } catch (_error) {
        logger.error("[UserProvider] Error fetching user data:", { error: _error });
        dispatch({ type: "FETCH_ERROR", payload: "Failed to load user data" });
        setProfile(null);
        lastProfileFetchRef.current = null;
        if (_error instanceof Error) {
          if (_error.message?.includes("FATAL: Tenant or user not found")) {
            toast.error("Erro de conexão com o banco de dados. Por favor, tente novamente mais tarde.");
          } else {
            toast.error("Erro ao carregar dados do usuário. Por favor, tente novamente.");
          }
        }
      } finally {
        if (mountedRef.current) {
          setAuthLoading(false);
        }
      }
    },
    [state.currentUser, dispatch, setProfile, setAuthLoading, mountedRef, lastProfileFetchRef, authChangeTimeoutRef]
  );
}
