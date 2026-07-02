import { Dispatch, MutableRefObject } from "react";
import { User as SupabaseUser, isAuthApiError } from "@supabase/supabase-js";
import { User as CurrentUserType } from "@/lib/types";
import { getUserProfile } from "@/lib/actions/userActions";
import { logger } from "@/lib/monitoring/logger";
import { UserAction } from "./user-context-state";

export function buildUserFromProfile(
  currentUserFromSupabase: SupabaseUser,
  fetchedProfile: NonNullable<Awaited<ReturnType<typeof getUserProfile>>["data"]>,
  primaryHouseholdId: string | null
): CurrentUserType {
  return {
    id: currentUserFromSupabase.id,
    name: fetchedProfile.full_name ?? currentUserFromSupabase.email ?? "Usuário",
    email: fetchedProfile.email ?? currentUserFromSupabase.email ?? "email@example.com",
    ...(fetchedProfile.avatar_url && { avatar: fetchedProfile.avatar_url }),
    households: [],
    primaryHousehold: primaryHouseholdId ?? "",
    householdId: primaryHouseholdId,
    preferences: {
      timezone: fetchedProfile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: "pt-BR",
      notifications: {
        pushEnabled: false,
        emailEnabled: false,
        feedingReminders: false,
        missedFeedingAlerts: false,
        householdUpdates: false,
      },
    },
    role: "user",
    ...(fetchedProfile.avatar_url && { imageUrl: fetchedProfile.avatar_url }),
  };
}

export function buildNewUserPayload(currentUserFromSupabase: SupabaseUser): CurrentUserType {
  return {
    id: currentUserFromSupabase.id,
    email: currentUserFromSupabase.email!,
    name: currentUserFromSupabase.email ?? "Usuário",
    households: [],
    primaryHousehold: "",
    householdId: null,
    preferences: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: "pt-BR",
      notifications: {
        pushEnabled: false,
        emailEnabled: false,
        feedingReminders: false,
        missedFeedingAlerts: false,
        householdUpdates: false,
      },
    },
    role: "user",
  } as CurrentUserType;
}

export function clearUserState(
  dispatch: Dispatch<UserAction>,
  setProfile: (v: CurrentUserType | null) => void,
  lastProfileFetchRef: MutableRefObject<string | null>,
  setAuthLoading: (v: boolean) => void
) {
  setProfile(null);
  dispatch({ type: "CLEAR_USER" });
  lastProfileFetchRef.current = null;
  setAuthLoading(false);
}

export function isDatabaseConnectionError(errorMessage: string): boolean {
  return (
    errorMessage.includes("Can't reach database server") ||
    errorMessage.includes("Connection") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("FATAL: Tenant or user not found")
  );
}

export function isSessionMissingError(errorMessage: string, error?: { message?: string; name?: string }): boolean {
  return (
    errorMessage.includes("Auth session missing") ||
    errorMessage.includes("AuthSessionMissingError") ||
    error?.message?.includes("Auth session missing") === true ||
    error?.name === "AuthSessionMissingError"
  );
}

export function handleAuthChangeError(
  requestId: number,
  _error: unknown,
  didTimeout: boolean,
  mounted: boolean,
  hasCurrentUser: boolean,
  dispatch: Dispatch<UserAction>,
  setProfile: (v: CurrentUserType | null) => void,
  lastProfileFetchRef: MutableRefObject<string | null>,
  setAuthLoading: (v: boolean) => void,
  signOut: () => Promise<{ error: unknown }>
) {
  const errorMessage = String(_error);
  const isSessionMissing = isSessionMissingError(errorMessage);

  if (isSessionMissing && !hasCurrentUser) {
    logger.info(`[UserProvider][Request ${requestId}] No auth session (expected)`);
    clearUserState(dispatch, setProfile, lastProfileFetchRef, setAuthLoading);
    return;
  }

  logger.error(`[UserProvider][Request ${requestId}] Error in auth change handler:`, { error: errorMessage });

  if (!didTimeout && mounted) {
    if (isAuthApiError(_error)) {
      const authError = _error as { status?: number; code?: string; message?: string };

      if (isSessionMissing) {
        logger.info(`[UserProvider][Request ${requestId}] Auth session missing (expected for unauthenticated users)`);
        clearUserState(dispatch, setProfile, lastProfileFetchRef, setAuthLoading);
        return;
      }

      const shouldClearAuth =
        authError.status === 401 ||
        authError.status === 403 ||
        authError.code === "session_expired" ||
        authError.code === "bad_jwt" ||
        authError.code === "session_not_found" ||
        authError.message?.includes("JWT") ||
        authError.message?.includes("Refresh Token Not Found") ||
        authError.message?.includes("Invalid Refresh Token");

      if (shouldClearAuth) {
        logger.warn(`[UserProvider][Request ${requestId}] Auth error detected (${authError.status}/${authError.code}), clearing user state`);
        clearUserState(dispatch, setProfile, lastProfileFetchRef, setAuthLoading);
        signOut().catch(() => {});
      } else {
        logger.warn(`[UserProvider][Request ${requestId}] Supabase auth error but not clearing state:`, {
          status: authError.status,
          code: authError.code,
        });
        setAuthLoading(false);
      }
    } else {
      const isNetworkError =
        _error instanceof TypeError ||
        (_error instanceof Error &&
          (_error.message?.toLowerCase().includes("network") ||
            _error.message?.toLowerCase().includes("timeout") ||
            _error.message?.toLowerCase().includes("fetch") ||
            _error.message?.toLowerCase().includes("failed to fetch")));

      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

      if (isNetworkError || isOffline) {
        logger.warn(`[UserProvider][Request ${requestId}] Network error detected, preserving user state`, {
          isOffline,
          errorType: _error instanceof TypeError ? "TypeError" : _error instanceof Error ? "Error" : "Unknown",
        });
        setAuthLoading(false);
      } else {
        logger.warn(`[UserProvider][Request ${requestId}] Unknown error, keeping state`, { error: errorMessage });
        setAuthLoading(false);
      }
    }
  }
}
