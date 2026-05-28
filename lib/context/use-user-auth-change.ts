"use client";

import { Dispatch, MutableRefObject, useCallback } from "react";
import { SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";
import { User as CurrentUserType } from "@/lib/types";
import { logger } from "@/lib/monitoring/logger";
import { UserAction, UserState } from "./user-context-state";
import {
  clearUserState,
  isSessionMissingError,
  handleAuthChangeError,
} from "./user-context-helpers";

type AuthChangeParams = {
  supabase: SupabaseClient;
  state: UserState;
  dispatch: Dispatch<UserAction>;
  setProfile: (v: CurrentUserType | null) => void;
  setAuthLoading: (v: boolean) => void;
  mountedRef: MutableRefObject<boolean>;
  lastProfileFetchRef: MutableRefObject<string | null>;
  authCheckCountRef: MutableRefObject<number>;
  authChangeTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  authChecksPausedRef: MutableRefObject<boolean>;
  loadUserData: (user: SupabaseUser | null) => Promise<void>;
};

export function useUserAuthChange({
  supabase,
  state,
  dispatch,
  setProfile,
  setAuthLoading,
  mountedRef,
  lastProfileFetchRef,
  authCheckCountRef,
  authChangeTimeoutRef,
  authChecksPausedRef,
  loadUserData,
}: AuthChangeParams) {
  const handleSessionMissing = useCallback(
    (requestId: number, hadCurrentUser: boolean) => {
      if (!hadCurrentUser) {
        logger.info(`[UserProvider][Request ${requestId}] No auth session found (expected for unauthenticated users)`);
      } else {
        logger.warn(`[UserProvider][Request ${requestId}] Session expired for authenticated user`);
      }
      clearUserState(dispatch, setProfile, lastProfileFetchRef, setAuthLoading);
    },
    [dispatch, setProfile, lastProfileFetchRef, setAuthLoading]
  );

  return useCallback(async () => {
    if (authChecksPausedRef.current) {
      const requestId = ++authCheckCountRef.current;
      if (process.env.NODE_ENV === "development") {
        logger.info(`[UserProvider][Request ${requestId}] handleAuthChange aborted: auth checks are paused`);
      }
      return;
    }

    const requestId = ++authCheckCountRef.current;

    if (process.env.NODE_ENV === "development") {
      logger.info(`[UserProvider][Request ${requestId}] handleAuthChange triggered`);
    }

    if (!mountedRef.current) {
      if (process.env.NODE_ENV === "development") {
        logger.warn(`[UserProvider][Request ${requestId}] handleAuthChange aborted: component not mounted`);
      }
      return;
    }

    if (authChangeTimeoutRef.current) {
      clearTimeout(authChangeTimeoutRef.current);
    }

    let didTimeout = false;

    authChangeTimeoutRef.current = setTimeout(() => {
      didTimeout = true;
      if (process.env.NODE_ENV === "development") {
        logger.warn(`[UserProvider][Request ${requestId}] Auth check timed out after 15s`);
      }
      if (mountedRef.current) {
        clearUserState(dispatch, setProfile, lastProfileFetchRef, setAuthLoading);
      }
    }, 15000);

    try {
      logger.info(`[UserProvider][Request ${requestId}] Calling supabase.auth.getUser()`);
      const authResult = await supabase.auth.getUser();
      clearTimeout(authChangeTimeoutRef.current);

      if (didTimeout || !mountedRef.current) return;

      if ("data" in authResult) {
        const {
          data: { user: verifiedUser },
          error: userError,
        } = authResult;

        logger.info(
          `[UserProvider][Request ${requestId}] supabase.auth.getUser() result: user=${verifiedUser ? verifiedUser.id : "null"}, error=${userError ? JSON.stringify(userError) : "null"}`
        );

        if (userError) {
          if (isSessionMissingError(userError.message ?? "", userError)) {
            handleSessionMissing(requestId, !!state.currentUser);
            return;
          }

          logger.error(`[UserProvider][Request ${requestId}] Auth error:`, { error: userError });
          throw userError;
        }

        if (!verifiedUser) {
          logger.warn(`[UserProvider][Request ${requestId}] No verified user found. Clearing user state.`);
          clearUserState(dispatch, setProfile, lastProfileFetchRef, setAuthLoading);
          return;
        }

        logger.info(`[UserProvider][Request ${requestId}] Verified user found: ${verifiedUser.id}. Calling loadUserData.`);
        await loadUserData(verifiedUser);
      }
    } catch (_error) {
      clearTimeout(authChangeTimeoutRef.current);

      if (isSessionMissingError(String(_error)) && !state.currentUser) {
        logger.info(`[UserProvider][Request ${requestId}] No auth session (expected)`);
        clearUserState(dispatch, setProfile, lastProfileFetchRef, setAuthLoading);
        return;
      }

      handleAuthChangeError(
        requestId,
        _error,
        didTimeout,
        mountedRef.current,
        !!state.currentUser,
        dispatch,
        setProfile,
        lastProfileFetchRef,
        setAuthLoading,
        () => supabase.auth.signOut()
      );
    }
  }, [
    supabase,
    state.currentUser,
    dispatch,
    setProfile,
    setAuthLoading,
    mountedRef,
    lastProfileFetchRef,
    authCheckCountRef,
    authChangeTimeoutRef,
    authChecksPausedRef,
    loadUserData,
    handleSessionMissing,
  ]);
}
