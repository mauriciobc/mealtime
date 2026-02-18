import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from './UserContext'; // Need householdId
import { useLoading } from './LoadingContext';
import { toast } from 'sonner';
import { FeedingLog } from "@/lib/types"; // Use the existing detailed FeedingLog type
import { CatType } from "@/lib/types";
import { useCats } from './CatsContext'; // Needed for chart selector
import { format, startOfDay, isEqual, addHours, isBefore, compareAsc, endOfDay, subDays, compareDesc } from 'date-fns'; // Date helpers
import { toDate } from 'date-fns-tz'; // Import toDate for timezone-aware conversion
import { useScheduleContext } from './ScheduleContext'; // Fixed import name
import { getUserTimezone } from "../utils/dateUtils"; // Import timezone utility
import { useUserContext as useUserContextLib } from "@/lib/context/UserContext"
import { resolveDateFnsLocale } from "@/lib/utils/dateFnsLocale"

// Remove the simple Feeding interface, use FeedingLog from types.ts
// interface Feeding {
//   id: string;
//   catId: string;
//   time: string;
//   amount: number;
// }

interface FeedingState {
  feedingLogs: FeedingLog[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FeedingState = {
  feedingLogs: [],
  isLoading: false,
  error: null,
};

interface FeedingAction {
  type: 'FETCH_START' | 'FETCH_SUCCESS' | 'FETCH_ERROR' | 'ADD_FEEDING' | 'REMOVE_FEEDING' | 'UPDATE_FEEDING'; // Removed SYNC_STATE
  payload?: FeedingLog[] | FeedingLog | string; // Adjusted payload types
}

// Helper function to find insertion index using binary search for O(log n) performance
function findInsertionIndex(logs: FeedingLog[], newLog: FeedingLog): number {
  const newTimestamp = new Date(newLog.timestamp).getTime();
  let left = 0;
  let right = logs.length;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const midTimestamp = new Date(logs[mid]?.timestamp || 0).getTime();
    
    if (midTimestamp > newTimestamp) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  
  return left;
}

// Helper function to insert log at correct position maintaining descending order
function insertLogInOrder(logs: FeedingLog[], newLog: FeedingLog): FeedingLog[] {
  // If array is empty or new log is more recent than first log, insert at beginning
  if (logs.length === 0 || new Date(newLog.timestamp).getTime() > new Date(logs[0]?.timestamp || 0).getTime()) {
    return [newLog, ...logs];
  }
  
  // If new log is older than last log, insert at end
  if (new Date(newLog.timestamp).getTime() < new Date(logs[logs.length - 1]?.timestamp || 0).getTime()) {
    return [...logs, newLog];
  }
  
  // Use binary search to find correct insertion point
  const insertIndex = findInsertionIndex(logs, newLog);
  const updatedLogs = [...logs];
  updatedLogs.splice(insertIndex, 0, newLog);
  return updatedLogs;
}

// Debug logging helper - only logs in development or when debug flag is enabled
function debugLog(message: string, data: any) {
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEBUG_FEEDING === 'true') {
    console.log(message, data);
  }
}

function feedingReducer(state: FeedingState, action: FeedingAction): FeedingState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, feedingLogs: action.payload as FeedingLog[], error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload as string };
    case 'ADD_FEEDING':
      // Add the new feeding log in the correct position to maintain descending timestamp order
      const newLog = action.payload as FeedingLog;
      const updatedLogs = insertLogInOrder(state.feedingLogs, newLog);
      
      // Debug log to track feeding additions (only in development or when debug flag is enabled)
      debugLog('[FeedingContext] ADD_FEEDING action:', {
        newLogId: newLog.id,
        newLogTimestamp: newLog.timestamp,
        newLogCatId: newLog.catId,
        totalLogsAfter: updatedLogs.length,
        mostRecentAfter: updatedLogs[0]?.id
      });
      
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
    // case 'SYNC_STATE': // Replaced by fetch actions
    //   return action.payload as FeedingState;
    default:
      return state;
  }
}

const FeedingContext = createContext<{
  state: FeedingState;
  dispatch: React.Dispatch<FeedingAction>;
}>({ state: initialState, dispatch: () => null });

async function fetchFeedingsForHousehold(householdId: string, userId?: string): Promise<FeedingLog[]> {
  const headers: HeadersInit = {};
  if (userId) headers['X-User-ID'] = userId;
  const response = await fetch(`/api/feedings?householdId=${householdId}`, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao carregar alimentações (${response.status}): ${errorText || 'Unknown error'}`);
  }
  const rawFeedingsData: any[] = await response.json();
  const mappedFeedingsData: FeedingLog[] = rawFeedingsData.map(meal => ({
    id: meal.id,
    catId: meal.cat_id,
    userId: meal.fed_by,
    timestamp: new Date(meal.fed_at),
    amount: typeof meal.amount === 'string' ? parseFloat(meal.amount) : meal.amount,
    portionSize: typeof meal.amount === 'string' ? parseFloat(meal.amount) : meal.amount,
    notes: meal.notes,
    mealType: meal.meal_type,
    householdId: meal.household_id,
    user: {
      id: meal.fed_by,
      name: meal.feeder?.full_name ?? null,
      avatar: meal.feeder?.avatar_url ?? null,
    },
    cat: undefined as any,
    status: undefined as any,
    createdAt: undefined as any,
  }));
  return mappedFeedingsData.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Helper function to calculate average portion size - memoized
const selectAveragePortionSize = (logs: FeedingLog[] | null): number | null => {
  if (!logs || logs.length === 0) {
    return null;
  }
  
  // Use reduce for single pass calculation
  let validCount = 0;
  let totalPortion = 0;
  
  for (const log of logs) {
    if (typeof log.portionSize === 'number' && log.portionSize > 0) {
      validCount++;
      totalPortion += log.portionSize;
    }
  }
  
  return validCount > 0 ? totalPortion / validCount : null;
};

const LOADING_ID_FEEDINGS = 'feedings-data-load';

export const FeedingProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(feedingReducer, initialState);
  const { state: userState } = useUserContext();
  const { currentUser } = userState;
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const loadingIdRef = useRef<string | null>(null);
  const { state: userStateLib } = useUserContextLib();
  const userLanguage = userStateLib.currentUser?.preferences?.language;
  const userLocale = resolveDateFnsLocale(userLanguage);

  const householdId = currentUser?.householdId;

  const {
    data: feedingsData,
    isLoading: isFeedingsLoading,
    isSuccess: isFeedingsSuccess,
    isError: isFeedingsError,
    error: feedingsError,
  } = useQuery({
    queryKey: ['feedings', householdId],
    queryFn: () => fetchFeedingsForHousehold(householdId!, currentUser?.id),
    enabled: !!householdId,
  });

  const cleanupLoading = useCallback(() => {
    if (loadingIdRef.current) {
      try {
        removeLoadingOperation(loadingIdRef.current);
      } catch (_error) {
        console.error('[FeedingProvider] Error cleaning up loading:', _error);
      } finally {
        loadingIdRef.current = null;
      }
    }
  }, [removeLoadingOperation]);

  useEffect(() => {
    if (!householdId) {
      dispatch({ type: 'FETCH_SUCCESS', payload: [] });
      return;
    }
    if (isFeedingsLoading) {
      loadingIdRef.current = LOADING_ID_FEEDINGS;
      dispatch({ type: 'FETCH_START' });
      addLoadingOperation({ id: LOADING_ID_FEEDINGS, priority: 4, description: 'Carregando histórico de alimentação...' });
    }
  }, [householdId, isFeedingsLoading, addLoadingOperation]);

  useEffect(() => {
    if (isFeedingsSuccess && feedingsData !== undefined) {
      dispatch({ type: 'FETCH_SUCCESS', payload: feedingsData });
      cleanupLoading();
    }
  }, [isFeedingsSuccess, feedingsData, cleanupLoading]);

  useEffect(() => {
    if (isFeedingsError && feedingsError) {
      const errorMessage = feedingsError instanceof Error ? feedingsError.message : 'Falha ao carregar histórico de alimentação';
      dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      cleanupLoading();
    }
  }, [isFeedingsError, feedingsError, cleanupLoading]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <FeedingContext.Provider value={contextValue}>
      {children}
    </FeedingContext.Provider>
  );
};

export const useFeeding = () => useContext(FeedingContext);

// --- Selectors --- 

/**
 * Selects the count of feeding logs recorded today.
 */
export const useSelectTodayFeedingCount = (): number => {
  const { state } = useFeeding();
  const { feedingLogs, isLoading } = state;

  return useMemo(() => {
    if (isLoading || !feedingLogs || !feedingLogs.length) {
      return 0;
    }

    const today = startOfDay(new Date());
    let count = 0;
    for (const log of feedingLogs) {
      const logDay = startOfDay(new Date(log.timestamp));
      if (isEqual(logDay, today)) {
        count++;
      } else if (isBefore(logDay, today)) {
        // Since logs are sorted descending, we can stop
        // counting once we're past today.
        break;
      }
    }
    return count;
  }, [feedingLogs, isLoading]);
};

/**
 * Selects the most recent feeding log, potentially enriched with Cat and User details.
 */
export const useSelectLastFeedingLog = (): FeedingLog | null => {
  const { state: feedingState } = useFeeding();
  const { state: catsState } = useCats(); // Need cats to enrich the log
  const { state: userState } = useUserContext(); // Need user potentially

  const { feedingLogs, isLoading: isLoadingFeedings } = feedingState;
  const { cats, isLoading: isLoadingCats } = catsState;
  const { currentUser } = userState; // Get the full currentUser for potential enrichment

  // Memoize cats lookup for better performance
  const catsMap = useMemo(() => {
    if (!cats) return new Map();
    return new Map(cats.map(cat => [cat.id, cat]));
  }, [cats]);

  return useMemo(() => {
    if (isLoadingFeedings || isLoadingCats || !feedingLogs || feedingLogs.length === 0 || !cats) {
      return null;
    }
    
    // Since feedingLogs are already sorted by timestamp descending from the reducer,
    // we can just take the first one without sorting again
    const lastLog = feedingLogs[0];
    if (!lastLog) return null;

    // Debug log to track last feeding updates (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[useSelectLastFeedingLog] Selected last feeding:', {
        id: lastLog.id,
        timestamp: lastLog.timestamp,
        catId: lastLog.catId,
        totalLogs: feedingLogs.length
      });
    }

    // Use the memoized cats map for O(1) lookup instead of O(n) find
    const cat = catsMap.get(lastLog.catId);
    // If we can't find the cat, return null to show loading state
    if (!cat) return null;

    // Enrich the log object by adding the found cat.
    // The user object from the initial mapping is sufficient.
    const enrichedLog: FeedingLog = {
      ...lastLog, // Contains the log with simplified user { id, name, avatar }
      timestamp: new Date(lastLog.timestamp), // Ensure Date object
      // createdAt might be undefined from the API, handle appropriately
      createdAt: lastLog.createdAt ? new Date(lastLog.createdAt) : undefined as any, 
      cat: cat, // Add the full cat object found in CatsContext state
      // No need to overwrite the user object here, the one from mapping is fine.
      user: lastLog.user || undefined as any // Ensure the user field is present (guaranteed by mapping)
    };
    
    return enrichedLog;

  }, [feedingLogs, isLoadingFeedings, catsMap, isLoadingCats, cats]);
};

/**
 * Selects data formatted for the recent feedings bar chart.
 * This refactored version improves performance from O(D * L) to O(L) by
 * iterating over the logs only once.
 */
export const useSelectRecentFeedingsChartData = (): any[] => {
  const { state: feedingState } = useFeeding();
  const { state: catsState } = useCats();

  const { feedingLogs, isLoading: isLoadingFeedings } = feedingState;
  const { cats, isLoading: isLoadingCats } = catsState;

  // Memoize cats map for O(1) lookup
  const catsMap = useMemo(() => {
    if (!cats) return new Map();
    return new Map(cats.map(cat => [cat.id, cat]));
  }, [cats]);

  return useMemo(() => {
    if (isLoadingFeedings || isLoadingCats || !feedingLogs || !cats || cats.length === 0) {
      return [];
    }

    // 1. Initialize data structure for the last 7 days
    const chartDataMap = new Map<string, any>();
    const last7Days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      last7Days.push(date);
      const formattedDate = format(date, 'yyyy-MM-dd');

      // Initialize with day name and zero values for all cats
      const initialCatData = Array.from(catsMap.values()).reduce((acc, cat) => {
        acc[cat.id] = 0;
        return acc;
      }, {} as Record<string, number>);

      chartDataMap.set(formattedDate, {
        name: format(date, 'EEE'),
        ...initialCatData
      });
    }

    // Get the start of the 7-day window for efficient filtering
    const sevenDaysAgo = last7Days[0];
    if (!sevenDaysAgo) {
      // This should not happen if last7Days is populated correctly
      return [];
    }

    // 2. Iterate over logs once
    for (const log of feedingLogs) {
      const logDate = startOfDay(new Date(log.timestamp));
      
      // Since logs are sorted descending, we can break the loop early once we are
      // past the 7-day window. This is a crucial performance improvement.
      if (isBefore(logDate, sevenDaysAgo)) {
        break;
      }

      const formattedDate = format(logDate, 'yyyy-MM-dd');
      const dayData = chartDataMap.get(formattedDate);

      if (dayData && catsMap.has(log.catId)) {
        dayData[log.catId] = (dayData[log.catId] || 0) + (log.portionSize || 0);
      }
    }

    // 3. Convert map to array for the chart
    return Array.from(chartDataMap.values());

  }, [feedingLogs, isLoadingFeedings, catsMap, isLoadingCats, cats]);
};


// --- Helper Functions ---

/**
 * Calculates the next feeding time by adding the interval (in hours) to the last feeding, respecting timezone.
 */
function calculateNextFeeding(lastFeeding: Date, interval: number, timezone: string): Date {
  // Add interval hours to lastFeeding, then convert to the user's timezone
  const next = addHours(lastFeeding, interval);
  return toDate(next, { timeZone: timezone });
}

// --- New Selector --- 

interface UpcomingFeeding {
  id: string; // Unique ID for list key
  catId: string; // Changed from ID
  catName: string;
  catPhoto: string | null;
  nextFeeding: Date;
  isOverdue: boolean;
}

/**
 * Selects the next 5 upcoming or overdue feeding times for the current household.
 */
export const useSelectUpcomingFeedings = (limit: number = 5): UpcomingFeeding[] => {
  const { state: catsState } = useCats();
  const { state: feedingState } = useFeeding();
  const { state: schedulesState } = useScheduleContext(); // Use assumed SchedulesContext
  const { state: userState } = useUserContext();

  const { cats, isLoading: isLoadingCats } = catsState;
  const { feedingLogs, isLoading: isLoadingFeedings } = feedingState;
  const { schedules, isLoading: isLoadingSchedules } = schedulesState;
  const { currentUser, isLoading: isLoadingUser } = userState;
  const timezone = useMemo(() => getUserTimezone(currentUser?.preferences?.timezone), [currentUser?.preferences?.timezone]);

  return useMemo(() => {
    // Ensure all required data is loaded and available
    if (isLoadingCats || isLoadingFeedings || isLoadingSchedules || isLoadingUser || 
        !currentUser?.householdId || !cats || !feedingLogs || !schedules) {
      return []; // Return empty if still loading or data missing
    }

    try {
      const now = toDate(new Date(), { timeZone: timezone });
      const householdCats = cats.filter(cat => String(cat.householdId) === String(currentUser.householdId));
      
      // Pre-filter logs and schedules for efficiency if datasets are large
      const householdLogs = feedingLogs.filter(log => householdCats.some(cat => cat.id === log.catId));
      const householdSchedules = schedules.filter(sch => householdCats.some(cat => cat.id === sch.catId));
      
      // Pre-compute last log for each cat
      // The `feedingLogs` (and by extension `householdLogs`) are already sorted descending.
      // We can find the most recent log for each cat by iterating once.
      const lastLogMap = new Map<string, FeedingLog>();
      householdLogs.forEach(log => {
        if (!lastLogMap.has(log.catId)) {
          lastLogMap.set(log.catId, log);
        }
      });

      const calculatedFeedings: UpcomingFeeding[] = [];

      householdCats.forEach((cat) => {
        const catSchedules = householdSchedules.filter(sch => sch.catId === cat.id);
        const lastFeedingLog = lastLogMap.get(cat.id);
        const lastFeeding = lastFeedingLog ? new Date(lastFeedingLog.timestamp) : null;

        let nextFeedingTime: Date | null = null;

        // 1. Check Fixed Time Schedules
        const fixedSchedules = catSchedules.filter(sch => sch.type === 'fixedTime' && sch.times && sch.times.length > 0);
        if (fixedSchedules.length > 0) {
          let earliestNextFixed: Date | null = null;
          fixedSchedules.forEach(schedule => {
            // Ensure schedule.times is treated as an array
            const times = Array.isArray(schedule.times) ? schedule.times : (schedule.times || '').split(',');
            times.forEach(time => {
              const [hours, minutes] = time.trim().split(':').map(Number);
              if (isNaN(hours) || isNaN(minutes)) return;

              const scheduledToday = toDate(new Date(now), { timeZone: timezone });
              scheduledToday.setHours(hours, minutes, 0, 0);

              let scheduledDateTime = scheduledToday;
              // If the calculated time today is in the past, schedule for tomorrow
              if (isBefore(scheduledDateTime, now)) {
                scheduledDateTime = new Date(scheduledToday.setDate(scheduledToday.getDate() + 1));
              }

              // Keep the earliest upcoming fixed time
              if (!earliestNextFixed || isBefore(scheduledDateTime, earliestNextFixed)) {
                earliestNextFixed = scheduledDateTime;
              }
            });
          });
          nextFeedingTime = earliestNextFixed;
        }

        // 2. Check Interval Schedules (if no fixed time found yet)
        if (!nextFeedingTime) {
          const intervalSchedules = catSchedules.find(sch => sch.type === 'interval' && sch.interval && sch.interval > 0);
          if (intervalSchedules && intervalSchedules.interval) {
            if (lastFeeding) {
              nextFeedingTime = calculateNextFeeding(lastFeeding, intervalSchedules.interval, timezone);
            } else {
              // If never fed, schedule based on now + interval (or base on a default time?)
              nextFeedingTime = addHours(now, intervalSchedules.interval); 
            }
          }
        }

        // 3. Check Default Cat Interval (if no schedules found)
        const feedingIntervalNum = Number(cat.feeding_interval);
        if (!nextFeedingTime && feedingIntervalNum && !isNaN(feedingIntervalNum) && feedingIntervalNum > 0) {
          if (lastFeeding) {
            nextFeedingTime = calculateNextFeeding(lastFeeding, feedingIntervalNum, timezone);
          } else {
            // If never fed, schedule based on now + interval
            nextFeedingTime = addHours(now, feedingIntervalNum);
          }
        }
        
        // Add to list if a valid time was calculated
        if (nextFeedingTime) {
          calculatedFeedings.push({
            id: `cat-${cat.id}-next-${nextFeedingTime.toISOString()}`, // More unique key
            catId: cat.id,
            catName: cat.name,
            catPhoto: cat.photo_url || null,
            nextFeeding: nextFeedingTime,
            isOverdue: isBefore(nextFeedingTime, now) // Check if overdue compared to current time
          });
        }
      });

      // Sort all calculated times and take the top N
      calculatedFeedings.sort((a, b) => compareAsc(a.nextFeeding, b.nextFeeding));
      return calculatedFeedings.slice(0, limit);
      
    } catch (_error) {
      console.error("useSelectUpcomingFeedings: Error calculating feedings:", _error);
      return []; // Return empty array on error
    }

  }, [
    cats, isLoadingCats, 
    feedingLogs, isLoadingFeedings, 
    schedules, isLoadingSchedules, 
    currentUser, isLoadingUser, 
    timezone, 
    limit
  ]);
};

// Selector hook remains useful
export const useFeedingSelector = <T,>(selector: (state: FeedingState) => T): T => {
  const { state } = useFeeding();
  return selector(state);
};

// Selector hook for average portion size
export const useSelectAveragePortionSize = (): number | null => {
  const { state } = useFeeding();
  return useMemo(() => selectAveragePortionSize(state.feedingLogs), [state.feedingLogs]);
};
