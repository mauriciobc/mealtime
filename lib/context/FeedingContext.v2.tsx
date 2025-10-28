import React, { createContext, useReducer, ReactNode, useMemo, useEffect, useRef, useCallback } from 'react';
import { useUserContext } from './UserContext';
import { useLoading } from './LoadingContext';
import { toast } from 'sonner';
import { FeedingLog } from "@/lib/types";
import { CatType } from "@/lib/types";
import { useCats } from './CatsContext';
import { format, startOfDay, isEqual, addHours, isBefore, compareAsc } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { useScheduleContext } from './ScheduleContext';
import { getUserTimezone } from "../utils/dateUtils";
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale"

// ============================================================================
// TYPES
// ============================================================================

interface FeedingState {
  feedingLogs: FeedingLog[];
  isLoading: boolean;
  error: string | null;
}

interface FeedingActions {
  addFeeding: (log: FeedingLog) => void;
  removeFeeding: (log: FeedingLog) => void;
  updateFeeding: (log: FeedingLog) => void;
  refreshFeedings: () => Promise<void>;
}

interface FeedingAction {
  type: 'FETCH_START' | 'FETCH_SUCCESS' | 'FETCH_ERROR' | 'ADD_FEEDING' | 'REMOVE_FEEDING' | 'UPDATE_FEEDING';
  payload?: FeedingLog[] | FeedingLog | string;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: FeedingState = {
  feedingLogs: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findInsertionIndex(logs: FeedingLog[], newLog: FeedingLog): number {
  const newTimestamp = new Date(newLog.timestamp).getTime();
  let left = 0;
  let right = logs.length;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const logAtMid = logs[mid];
    if (!logAtMid) break;
    const midTimestamp = new Date(logAtMid.timestamp).getTime();
    
    if (midTimestamp > newTimestamp) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  
  return left;
}

function insertLogInOrder(logs: FeedingLog[], newLog: FeedingLog): FeedingLog[] {
  if (logs.length === 0) return [newLog];
  
  const firstLog = logs[0];
  const lastLog = logs[logs.length - 1];
  
  if (firstLog && new Date(newLog.timestamp).getTime() > new Date(firstLog.timestamp).getTime()) {
    return [newLog, ...logs];
  }
  
  if (lastLog && new Date(newLog.timestamp).getTime() < new Date(lastLog.timestamp).getTime()) {
    return [...logs, newLog];
  }
  
  const insertIndex = findInsertionIndex(logs, newLog);
  const updatedLogs = [...logs];
  updatedLogs.splice(insertIndex, 0, newLog);
  return updatedLogs;
}

// ============================================================================
// REDUCER
// ============================================================================

function feedingReducer(state: FeedingState, action: FeedingAction): FeedingState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, feedingLogs: action.payload as FeedingLog[], error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload as string };
    case 'ADD_FEEDING':
      const newLog = action.payload as FeedingLog;
      const updatedLogs = insertLogInOrder(state.feedingLogs, newLog);
      return { ...state, feedingLogs: updatedLogs };
    case 'REMOVE_FEEDING':
      return { ...state, feedingLogs: state.feedingLogs.filter(log => log.id !== (action.payload as FeedingLog).id) };
    case 'UPDATE_FEEDING':
      return {
        ...state,
        feedingLogs: state.feedingLogs.map(log =>
          log.id === (action.payload as FeedingLog).id ? { ...log, ...(action.payload as FeedingLog) } : log
        ),
      };
    default:
      return state;
  }
}

// ============================================================================
// CONTEXTS (SPLIT STATE AND ACTIONS)
// ============================================================================

// Context for state (will change frequently)
const FeedingStateContext = createContext<FeedingState>(initialState);

// Context for actions (never changes - only functions)
const FeedingActionsContext = createContext<FeedingActions | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export const FeedingProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(feedingReducer, initialState);
  const { state: userState } = useUserContext();
  const { currentUser } = userState;
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingIdRef = useRef<string | null>(null);
  const hasAttemptedLoadRef = useRef(false);

  const cleanupLoading = useCallback(() => {
    if (loadingIdRef.current) {
      try {
        removeLoadingOperation(loadingIdRef.current);
      } catch (error) {
        console.error('[FeedingProvider] Error cleaning up loading:', error);
      } finally {
        loadingIdRef.current = null;
      }
    }
  }, [removeLoadingOperation]);

  const loadFeedingsData = useCallback(async () => {
    const householdId = currentUser?.householdId;
    if (!householdId || hasAttemptedLoadRef.current) {
      if (!householdId) {
        dispatch({ type: 'FETCH_SUCCESS', payload: [] });
      }
      return;
    }

    hasAttemptedLoadRef.current = true;
    const loadingId = 'feedings-data-load';
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      loadingIdRef.current = loadingId;
      dispatch({ type: 'FETCH_START' });
      addLoadingOperation({ id: loadingId, priority: 4, description: 'Carregando histórico de alimentação...' });

      const headers: HeadersInit = {};
      if (currentUser?.id) {
        headers['X-User-ID'] = currentUser.id;
      }

      const response = await fetch(`/api/feedings?householdId=${householdId}`, {
        signal: abortController.signal,
        headers: headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao carregar alimentações (${response.status}): ${errorText || 'Unknown error'}`);
      }

      const rawFeedingsData: any[] = await response.json();

      const mappedFeedingsData: FeedingLog[] = rawFeedingsData.map(meal => {
        const convertedAmount = typeof meal.amount === 'string' ? parseFloat(meal.amount) : meal.amount;

        return {
          id: meal.id,
          catId: meal.cat_id,
          userId: meal.fed_by,
          timestamp: new Date(meal.fed_at),
          amount: convertedAmount,
          portionSize: convertedAmount,
          notes: meal.notes,
          mealType: meal.meal_type,
          householdId: meal.household_id,
          user: {
            id: meal.fed_by,
            name: meal.feeder?.full_name ?? null,
            avatar: meal.feeder?.avatar_url ?? null,
          },
          cat: undefined,
          status: undefined,
          createdAt: undefined,
        };
      });

      const sortedData = mappedFeedingsData.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      dispatch({ type: 'FETCH_SUCCESS', payload: sortedData });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }

      const errorMessage = error.message || 'Falha ao carregar histórico de alimentação';
      dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    } finally {
      cleanupLoading();
    }
  }, [currentUser?.householdId, currentUser?.id, addLoadingOperation, cleanupLoading]);

  useEffect(() => {
    hasAttemptedLoadRef.current = false;
  }, [currentUser?.householdId]);

  useEffect(() => {
    loadFeedingsData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      cleanupLoading();
    };
  }, [loadFeedingsData, cleanupLoading]);

  // Memoize actions (never change - only functions)
  const actions: FeedingActions = useMemo(() => ({
    addFeeding: (log: FeedingLog) => dispatch({ type: 'ADD_FEEDING', payload: log }),
    removeFeeding: (log: FeedingLog) => dispatch({ type: 'REMOVE_FEEDING', payload: log }),
    updateFeeding: (log: FeedingLog) => dispatch({ type: 'UPDATE_FEEDING', payload: log }),
    refreshFeedings: async () => {
      hasAttemptedLoadRef.current = false;
      await loadFeedingsData();
    },
  }), [loadFeedingsData]);

  return (
    <FeedingStateContext.Provider value={state}>
      <FeedingActionsContext.Provider value={actions}>
        {children}
      </FeedingActionsContext.Provider>
    </FeedingStateContext.Provider>
  );
};

// ============================================================================
// HOOKS (SEPARATE STATE AND ACTIONS)
// ============================================================================

export function useFeedingState() {
  const context = React.useContext(FeedingStateContext);
  if (context === undefined) {
    throw new Error('useFeedingState must be used within FeedingProvider');
  }
  return context;
}

export function useFeedingActions() {
  const context = React.useContext(FeedingActionsContext);
  if (context === null) {
    throw new Error('useFeedingActions must be used within FeedingProvider');
  }
  return context;
}

// Backward compatibility - combines state and actions
export function useFeeding() {
  const state = useFeedingState();
  const actions = useFeedingActions();
  return { state, ...actions };
}

// ============================================================================
// SELECTORS (OPTIMIZED WITH MEMOIZATION)
// ============================================================================

export const useSelectTodayFeedingCount = (): number => {
  const { feedingLogs, isLoading } = useFeedingState();

  return useMemo(() => {
    if (isLoading || !feedingLogs || feedingLogs.length === 0) {
      return 0;
    }
    const today = startOfDay(new Date());
    return feedingLogs.filter(log => isEqual(startOfDay(new Date(log.timestamp)), today)).length;
  }, [feedingLogs, isLoading]);
};

export const useSelectLastFeedingLog = (): FeedingLog | null => {
  const { feedingLogs, isLoading: isLoadingFeedings } = useFeedingState();
  const { state: catsState } = useCats();
  const { cats, isLoading: isLoadingCats } = catsState;

  const catsMap = useMemo(() => {
    if (!cats) return new Map();
    return new Map(cats.map(cat => [cat.id, cat]));
  }, [cats]);

  return useMemo(() => {
    if (isLoadingFeedings || isLoadingCats || !feedingLogs || feedingLogs.length === 0 || !cats) {
      return null;
    }
    
    const lastLog = feedingLogs[0]!;
    if (!lastLog) return null;

    const cat = catsMap.get(lastLog.catId);
    if (!cat) return null;

    const enrichedLog: FeedingLog = {
      ...lastLog,
      timestamp: new Date(lastLog.timestamp),
      createdAt: lastLog.createdAt ? new Date(lastLog.createdAt) : undefined, 
      cat: cat,
      user: lastLog.user
    };
    
    return enrichedLog;

  }, [feedingLogs, isLoadingFeedings, catsMap, isLoadingCats, cats]);
};

export const useSelectAveragePortionSize = (): number | null => {
  const { feedingLogs } = useFeedingState();
  
  return useMemo(() => {
    if (!feedingLogs || feedingLogs.length === 0) {
      return null;
    }
    
    let validCount = 0;
    let totalPortion = 0;
    
    for (const log of feedingLogs) {
      if (typeof log.portionSize === 'number' && log.portionSize > 0) {
        validCount++;
        totalPortion += log.portionSize;
      }
    }
    
    return validCount > 0 ? totalPortion / validCount : null;
  }, [feedingLogs]);
};

