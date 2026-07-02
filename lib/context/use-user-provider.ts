"use client";

import { useReducer, useEffect, useMemo, useRef, useCallback, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User as CurrentUserType } from "@/lib/types";
import { logger } from "@/lib/monitoring/logger";
import { userReducer, userInitialState, UserContextValue } from "./user-context-state";
import { useUserLoadData } from "./use-user-load-data";
import { useUserAuthChange } from "./use-user-auth-change";

export function useUserProvider(): UserContextValue {
  const [state, dispatch] = useReducer(userReducer, userInitialState);
  const [supabase] = useState(() => {
    logger.info("[UserProvider] Initializing Supabase client");
    try {
      const client = createClient();
      logger.info("[UserProvider] Supabase client initialized successfully");
      return client;
    } catch (_error) {
      logger.error("[UserProvider] Error initializing Supabase client:", { error: String(_error) });
      throw _error;
    }
  });
  const [profile, setProfile] = useState<CurrentUserType | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const mountedRef = useRef(true);
  const lastProfileFetchRef = useRef<string | null>(null);
  const authCheckCountRef = useRef(0);
  const authChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authChecksPausedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Intentionally read latest timeout id on unmount
      // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce ref is mutable until cleanup
      const timeout = authChangeTimeoutRef.current;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  const loadUserData = useUserLoadData({
    state,
    dispatch,
    setProfile,
    setAuthLoading,
    mountedRef,
    lastProfileFetchRef,
    authChangeTimeoutRef,
  });

  const handleAuthChange = useUserAuthChange({
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
  });

  useEffect(() => {
    logger.info("[UserProvider] Setting up auth state change listener");
    setAuthLoading(true);

    handleAuthChange();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      logger.info("[UserProvider] Auth state change detected");
      handleAuthChange();
    });

    return () => {
      logger.info("[UserProvider] Cleaning up auth state change listener");
      subscription.unsubscribe();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce ref is mutable until cleanup
      const timeout = authChangeTimeoutRef.current;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [supabase.auth, handleAuthChange]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(String(error));

      dispatch({ type: "CLEAR_USER" });
      setProfile(null);
      lastProfileFetchRef.current = null;

      logger.info("[UserProvider] User signed out successfully");
    } catch (_error) {
      logger.error("[UserProvider] Error signing out:", { error: String(_error) });
      throw _error;
    }
  }, [supabase.auth]);

  const refreshUser = useCallback(async () => {
    lastProfileFetchRef.current = null;
    await handleAuthChange();
  }, [handleAuthChange]);

  const pauseAuthChecks = useCallback(() => {
    authChecksPausedRef.current = true;
    if (authChangeTimeoutRef.current) {
      clearTimeout(authChangeTimeoutRef.current);
    }
    if (process.env.NODE_ENV === "development") {
      logger.info("[UserProvider] Auth checks paused");
    }
  }, []);

  const resumeAuthChecks = useCallback(() => {
    authChecksPausedRef.current = false;
    if (process.env.NODE_ENV === "development") {
      logger.info("[UserProvider] Auth checks resumed");
    }
    if (mountedRef.current) {
      handleAuthChange();
    }
  }, [handleAuthChange]);

  return useMemo(
    () => ({
      state,
      profile,
      authLoading,
      signOut,
      refreshUser,
      pauseAuthChecks,
      resumeAuthChecks,
    }),
    [state, profile, authLoading, signOut, refreshUser, pauseAuthChecks, resumeAuthChecks]
  );
}
