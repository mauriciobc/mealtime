"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useMemo, useRef, useCallback, useState } from "react";
import { createClient } from '@/utils/supabase/client'; // Import Supabase client
import { User as SupabaseUser } from '@supabase/supabase-js'; // Import Supabase types
import { isAuthApiError } from '@supabase/supabase-js'; // Import Supabase error detection
import { toast } from "sonner";
import { User as CurrentUserType, NotificationSettings } from "@/lib/types";
import { getUserProfile, getFirstHouseholdMembership } from '@/lib/actions/userActions'; // Import the Server Actions
import { logger } from '@/lib/monitoring/logger'; // Import logger

interface UserState {
  currentUser: CurrentUserType | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  isLoading: true,
  error: null,
};

interface UserAction {
  type: "FETCH_START" | "SET_CURRENT_USER" | "FETCH_ERROR" | "CLEAR_USER";
  payload?: CurrentUserType | string | null;
}

function userReducer(state: UserState, action: UserAction): UserState {
  // Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log(`[userReducer] Dispatching: ${action.type}`, action.payload);
  }
  
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "SET_CURRENT_USER":
      return { ...state, isLoading: false, currentUser: action.payload as CurrentUserType | null, error: null };
    case "FETCH_ERROR":
      console.error("[userReducer] FETCH_ERROR -> isLoading: false, error:", action.payload);
      return { ...state, isLoading: false, error: action.payload as string };
    case "CLEAR_USER":
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

interface UserContextValue {
  state: UserState;
  profile: CurrentUserType | null;
  authLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  pauseAuthChecks: () => void;
  resumeAuthChecks: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);
export { UserContext };

// Add debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Add a type guard for error with message
function isErrorWithMessage(err: unknown): err is { message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as any).message === 'string'
  );
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState);
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

  // Set mounted ref
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (authChangeTimeoutRef.current) {
        clearTimeout(authChangeTimeoutRef.current);
      }
    };
  }, []);

  const loadUserData = useCallback(async (currentUserFromSupabase: SupabaseUser | null) => {
    if (!currentUserFromSupabase || !mountedRef.current) {
      if (state.currentUser) {
        dispatch({ type: "CLEAR_USER" });
      }
      setProfile(null);
      lastProfileFetchRef.current = null;
      setAuthLoading(false);
      return;
    }

    // Prevent duplicate fetches for the same user
    if (lastProfileFetchRef.current === currentUserFromSupabase.id) {
      setAuthLoading(false);
      return;
    }

    // Add debounce to prevent rapid successive calls
    if (authChangeTimeoutRef.current) {
      clearTimeout(authChangeTimeoutRef.current);
    }

    dispatch({ type: "FETCH_START" });
    lastProfileFetchRef.current = currentUserFromSupabase.id;

    try {
      // Fetch profile first (we know it lacks householdId)
      const { data: fetchedProfile, error: fetchError } = await getUserProfile();

      if (!mountedRef.current) {
        setAuthLoading(false);
        return;
      }

      if (fetchError != null) {
        logger.error("[UserProvider] Error fetching user profile:", { error: fetchError });
        
        // Check if it's a database connection error
        const errorMessage = typeof fetchError === 'string' ? fetchError : 'Unknown error';
        const isConnectionError = errorMessage.includes('Can\'t reach database server') || 
            errorMessage.includes('Connection') || 
            errorMessage.includes('timeout') ||
            errorMessage.includes('ECONNREFUSED') ||
            errorMessage.includes('FATAL: Tenant or user not found');
        
        if (isConnectionError) {
          toast.error("Erro de conexão com o banco de dados. Tentando reconectar...", {
            duration: 5000,
          });
          logger.error("[UserProvider] Database connection error:", { error: fetchError });
        } else {
          toast.error("Erro ao carregar perfil do usuário. Por favor, tente novamente.", {
            duration: 4000,
          });
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
        
        // Fetch the first household membership
        const { data: membershipData, error: membershipError } = await getFirstHouseholdMembership(currentUserFromSupabase.id);

        if (!mountedRef.current) {
          setAuthLoading(false);
          return; // Abort if component unmounted during async calls
        }

        if (membershipError) {
          // Log error but don't block user loading, householdId will be null
          logger.error("[UserProvider] Error fetching household membership:", { error: membershipError });
          toast.error("Erro ao verificar a qual residência pertence.");
        } else if (membershipData) {
          primaryHouseholdId = membershipData.household_id;
          logger.info(`[UserProvider] Found primary household ID: ${primaryHouseholdId}`);
        } else {
          logger.info("[UserProvider] User is not a member of any household.");
        }

        // Construct user data including the fetched household ID
        // Map Prisma profile fields to User type
        const userData: CurrentUserType = {
          id: currentUserFromSupabase.id,
          name: fetchedProfile.full_name ?? currentUserFromSupabase.email ?? "Usuário",
          email: fetchedProfile.email ?? currentUserFromSupabase.email ?? "email@example.com",
          ...(fetchedProfile.avatar_url && { avatar: fetchedProfile.avatar_url }),
          households: [], // Will need to fetch from household_members if needed
          primaryHousehold: primaryHouseholdId ?? "",
          householdId: primaryHouseholdId,
          preferences: {
            timezone: fetchedProfile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: "pt-BR", // Default, no language field in profiles table
            notifications: {
              pushEnabled: false,
              emailEnabled: false,
              feedingReminders: false,
              missedFeedingAlerts: false,
              householdUpdates: false
            }
          },
          role: 'user', // Default role, no role field in profiles table
          ...(fetchedProfile.avatar_url && { imageUrl: fetchedProfile.avatar_url })
        };

        // Set profile with properly mapped user data
        setProfile(userData);
        dispatch({ type: "SET_CURRENT_USER", payload: userData });
      } else {
        // No profile found but no error - this is a valid state for new users
        // They won't have a household membership yet either
        logger.info("[UserProvider] No profile found for user, treating as new user.");
        // Fill all required fields for CurrentUserType, use defaults if needed
        dispatch({ type: "SET_CURRENT_USER", payload: {
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
              householdUpdates: false
            }
          },
          role: "user"
        } as CurrentUserType });
      }
    } catch (_error) {
      logger.error("[UserProvider] Error fetching user data:", { error: _error });
      dispatch({ type: "FETCH_ERROR", payload: "Failed to load user data" });
      setProfile(null);
      lastProfileFetchRef.current = null;
      // Show a user-friendly error message
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
  }, [state.currentUser]);

  const handleAuthChange = useCallback(async () => {
    // Early return if auth checks are paused
    if (authChecksPausedRef.current) {
      const requestId = ++authCheckCountRef.current;
      if (process.env.NODE_ENV === 'development') {
        logger.info(`[UserProvider][Request ${requestId}] handleAuthChange aborted: auth checks are paused`);
      }
      return;
    }

    const requestId = ++authCheckCountRef.current;
    
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[UserProvider][Request ${requestId}] handleAuthChange triggered`);
    }

    if (!mountedRef.current) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`[UserProvider][Request ${requestId}] handleAuthChange aborted: component not mounted`);
      }
      return;
    }

    // Cancelar qualquer timeout pendente
    if (authChangeTimeoutRef.current) {
      clearTimeout(authChangeTimeoutRef.current);
    }

    let didTimeout = false;
    let finished = false;

    // Aumentar timeout para 15 segundos para evitar logout durante operações lentas
    authChangeTimeoutRef.current = setTimeout(() => {
      didTimeout = true;
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`[UserProvider][Request ${requestId}] Auth check timed out after 15s`);
      }
      // Sempre limpar estado de auth no timeout para evitar sessões antigas
      if (mountedRef.current) {
        setProfile(null);
        dispatch({ type: "CLEAR_USER" });
        lastProfileFetchRef.current = null;
        setAuthLoading(false);
      }
    }, 15000);

    try {
      logger.info(`[UserProvider][Request ${requestId}] Calling supabase.auth.getUser()`);
      const authResult = await supabase.auth.getUser();
      finished = true;
      clearTimeout(authChangeTimeoutRef.current);

      if (didTimeout || !mountedRef.current) return;

      if ('data' in authResult) {
        const {
          data: { user: verifiedUser },
          error: userError
        } = authResult;

        logger.info(`[UserProvider][Request ${requestId}] supabase.auth.getUser() result: user=${verifiedUser ? verifiedUser.id : 'null'}, error=${userError ? JSON.stringify(userError) : 'null'}`);

        // Check for AuthSessionMissingError specifically
        if (userError) {
          // If it's a session missing error and we don't have a current user, it's expected on first load
          if (userError.message?.includes('Auth session missing') || userError.name === 'AuthSessionMissingError') {
            if (!state.currentUser) {
              // This is expected on initial load for unauthenticated users
              logger.info(`[UserProvider][Request ${requestId}] No auth session found (expected for unauthenticated users)`);
              setProfile(null);
              dispatch({ type: "CLEAR_USER" });
              lastProfileFetchRef.current = null;
              setAuthLoading(false);
              return;
            } else {
              // User was authenticated but session expired - clear state
              logger.warn(`[UserProvider][Request ${requestId}] Session expired for authenticated user`);
              setProfile(null);
              dispatch({ type: "CLEAR_USER" });
              lastProfileFetchRef.current = null;
              setAuthLoading(false);
              return;
            }
          }
          
          logger.error(`[UserProvider][Request ${requestId}] Auth error:`, { error: userError });
          throw userError;
        }

        if (!verifiedUser) {
          logger.warn(`[UserProvider][Request ${requestId}] No verified user found. Clearing user state.`);
          setProfile(null);
          dispatch({ type: "CLEAR_USER" });
          lastProfileFetchRef.current = null;
          setAuthLoading(false);
          return;
        }

        logger.info(`[UserProvider][Request ${requestId}] Verified user found: ${verifiedUser.id}. Calling loadUserData.`);
        await loadUserData(verifiedUser);
      } else {
        // timeout já tratado pelo catch
      }
    } catch (_error) {
      finished = true;
      clearTimeout(authChangeTimeoutRef.current);
      
      // Don't log AuthSessionMissingError as an error if user is not authenticated
      const errorMessage = String(_error);
      const isSessionMissing = errorMessage.includes('Auth session missing') || 
                               errorMessage.includes('AuthSessionMissingError');
      
      if (isSessionMissing && !state.currentUser) {
        logger.info(`[UserProvider][Request ${requestId}] No auth session (expected)`);
        setProfile(null);
        dispatch({ type: "CLEAR_USER" });
        lastProfileFetchRef.current = null;
        setAuthLoading(false);
        return;
      }
      
      logger.error(`[UserProvider][Request ${requestId}] Error in auth change handler:`, { error: String(_error) });
      
      if (!didTimeout && mountedRef.current) {
        // Check if this is a Supabase Auth API error
        const isSupabaseAuthError = isAuthApiError(_error);
        
        if (isSupabaseAuthError) {
          // This is a confirmed Supabase auth error
          const authError = _error as any; // Type assertion for error with status/code
          
          // Check for AuthSessionMissingError specifically
          if (isSessionMissing) {
            // Session missing - expected for unauthenticated users
            logger.info(`[UserProvider][Request ${requestId}] Auth session missing (expected for unauthenticated users)`);
            setProfile(null);
            dispatch({ type: "CLEAR_USER" });
            lastProfileFetchRef.current = null;
            setAuthLoading(false);
            return;
          }
          
          // Check specific error codes that indicate auth failure
          const shouldClearAuth = 
            authError.status === 401 || // Unauthorized
            authError.status === 403 || // Forbidden
            authError.code === 'session_expired' ||
            authError.code === 'bad_jwt' ||
            authError.code === 'session_not_found' ||
            authError.message?.includes('JWT');
          
          if (shouldClearAuth) {
            logger.warn(`[UserProvider][Request ${requestId}] Auth error detected (${authError.status}/${authError.code}), clearing user state`);
            setProfile(null);
            dispatch({ type: "CLEAR_USER" });
            lastProfileFetchRef.current = null;
            setAuthLoading(false);
          } else {
            // Other Supabase auth errors, log and stop loading but keep state
            logger.warn(`[UserProvider][Request ${requestId}] Supabase auth error but not clearing state:`, { 
              status: authError.status, 
              code: authError.code 
            });
            setAuthLoading(false);
          }
        } else {
          // Not a Supabase auth error - could be network, fetch, timeout, etc.
          const isNetworkError = _error instanceof TypeError || 
            _error instanceof Error && (
              _error.message?.toLowerCase().includes('network') ||
              _error.message?.toLowerCase().includes('timeout') ||
              _error.message?.toLowerCase().includes('fetch') ||
              _error.message?.toLowerCase().includes('failed to fetch')
            );
          
          const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
          
          if (isNetworkError || isOffline) {
            // Network/connection issues - preserve state and stop loading
            logger.warn(`[UserProvider][Request ${requestId}] Network error detected, preserving user state`, {
              isOffline,
              errorType: _error instanceof TypeError ? 'TypeError' : _error instanceof Error ? 'Error' : 'Unknown'
            });
            setAuthLoading(false);
          } else {
            // Unknown error - log and keep state but stop loading
            logger.warn(`[UserProvider][Request ${requestId}] Unknown error, keeping state`, { error: String(_error) });
            setAuthLoading(false);
          }
        }
      }
    }
  }, [supabase.auth, loadUserData, state.currentUser]);

  // Remover o debounce memoizado já que agora está integrado no handleAuthChange
  useEffect(() => {
    logger.info("[UserProvider] Setting up auth state change listener");
    setAuthLoading(true);
    
    // Initial auth check
    handleAuthChange();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      logger.info("[UserProvider] Auth state change detected");
      handleAuthChange();
    });

    return () => {
      logger.info("[UserProvider] Cleaning up auth state change listener");
      subscription.unsubscribe();
      if (authChangeTimeoutRef.current) {
        clearTimeout(authChangeTimeoutRef.current);
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

  // Função para pausar verificações de auth durante operações críticas
  const pauseAuthChecks = useCallback(() => {
    authChecksPausedRef.current = true;
    if (authChangeTimeoutRef.current) {
      clearTimeout(authChangeTimeoutRef.current);
    }
    if (process.env.NODE_ENV === 'development') {
      logger.info("[UserProvider] Auth checks paused");
    }
  }, []);

  // Função para retomar verificações de auth
  const resumeAuthChecks = useCallback(() => {
    authChecksPausedRef.current = false;
    if (process.env.NODE_ENV === 'development') {
      logger.info("[UserProvider] Auth checks resumed");
    }
    if (mountedRef.current) {
      handleAuthChange();
    }
  }, [handleAuthChange]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    state,
    profile,
    authLoading,
    signOut,
    refreshUser,
    pauseAuthChecks,
    resumeAuthChecks
  }), [state, profile, authLoading, signOut, refreshUser, pauseAuthChecks, resumeAuthChecks]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}