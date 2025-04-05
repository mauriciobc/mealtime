import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect } from 'react';
import { useUserContext } from './UserContext'; // Need householdId
import { useLoading } from './LoadingContext';
import { toast } from 'sonner';
import { FeedingLog } from "@/lib/types"; // Use the existing detailed FeedingLog type
import { CatType } from "@/lib/types";
import { useCats } from './CatsContext'; // Needed for chart selector
import { format, startOfDay, isEqual } from 'date-fns'; // Date helpers
import { ptBR } from 'date-fns/locale'; // Date locale

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

function feedingReducer(state: FeedingState, action: FeedingAction): FeedingState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, feedingLogs: action.payload as FeedingLog[], error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload as string };
    case 'ADD_FEEDING':
      // Add logic to sort by timestamp? Or handle in selector?
      return { ...state, feedingLogs: [...state.feedingLogs, action.payload as FeedingLog] };
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

export const FeedingProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(feedingReducer, initialState);
  const { state: userState } = useUserContext();
  const { currentUser } = userState;
  const { addLoadingOperation, removeLoadingOperation } = useLoading();

  useEffect(() => {
    let isMounted = true;
    const loadingId = 'feedings-data-load';

    const loadFeedingsData = async () => {
      const householdId = currentUser?.householdId;
      if (!householdId) {
        dispatch({ type: 'FETCH_SUCCESS', payload: [] }); // Clear logs if no household
        return;
      }

      dispatch({ type: 'FETCH_START' });
      addLoadingOperation({ id: loadingId, priority: 4, description: 'Carregando histórico de alimentação...' });

      try {
        console.log("[FeedingProvider] Loading feedings for household:", householdId);
        // Use the endpoint seen in DataProvider
        const response = await fetch(`/api/feedings?householdId=${householdId}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("[FeedingProvider] Feedings response error:", {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Erro ao carregar alimentações (${response.status}): ${errorText || 'Unknown error'}`);
        }
        const feedingsData: FeedingLog[] = await response.json();

        if (isMounted) {
          console.log("[FeedingProvider] Feedings loaded:", feedingsData.length);
          // Optional: Sort feedings by date descending here before dispatching
          const sortedData = feedingsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          dispatch({ type: 'FETCH_SUCCESS', payload: sortedData });
        }
      } catch (error: any) {
        console.error("[FeedingProvider] Error loading feedings data:", error);
        if (isMounted) {
          const errorMessage = error.message || 'Falha ao carregar histórico de alimentação';
          dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
          toast.error(errorMessage);
        }
      } finally {
        if (isMounted) {
          removeLoadingOperation(loadingId);
        }
      }
    };

    loadFeedingsData();

    return () => {
      isMounted = false;
      removeLoadingOperation(loadingId);
    };
  }, [currentUser?.householdId, addLoadingOperation, removeLoadingOperation, dispatch]); // Depend on householdId

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

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
    if (isLoading || !feedingLogs || feedingLogs.length === 0) {
      return 0;
    }
    const today = startOfDay(new Date());
    return feedingLogs.filter(log => isEqual(startOfDay(new Date(log.timestamp)), today)).length;
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
  const { currentUser } = userState;

  return useMemo(() => {
    if (isLoadingFeedings || isLoadingCats || !feedingLogs || feedingLogs.length === 0 || !cats) {
      return null;
    }
    // Logs are already sorted descending by timestamp in the provider fetch
    const lastLog = feedingLogs[0];
    if (!lastLog) return null;

    const cat = cats.find(c => c.id === lastLog.catId);
    if (!cat) return null; // Or return log without cat?

    // Enrich the log object (similar to logic in app/page.tsx)
    const enrichedLog: FeedingLog = {
      ...lastLog,
      timestamp: new Date(lastLog.timestamp), // Ensure Date objects
      createdAt: new Date(lastLog.createdAt || lastLog.timestamp),
      cat: {
        // Map all required fields from CatType
        id: cat.id,
        name: cat.name,
        photoUrl: cat.photoUrl,
        birthdate: cat.birthdate ? new Date(cat.birthdate) : undefined,
        weight: cat.weight,
        restrictions: cat.restrictions,
        notes: cat.notes,
        householdId: cat.householdId,
        feedingInterval: cat.feedingInterval,
        portion_size: cat.portion_size
      },
      // Use currentUser if userId matches, otherwise user might be null/undefined
      // Or if API provides user details on the log, use that.
      user: lastLog.userId === currentUser?.id ? currentUser : undefined 
    };
    return enrichedLog;

  }, [feedingLogs, isLoadingFeedings, cats, isLoadingCats, currentUser]);
};

/**
 * Selects data formatted for the recent feedings bar chart.
 */
export const useSelectRecentFeedingsChartData = (): any[] => {
  const { state: feedingState } = useFeeding();
  const { state: catsState } = useCats();

  const { feedingLogs, isLoading: isLoadingFeedings } = feedingState;
  const { cats, isLoading: isLoadingCats } = catsState;

  return useMemo(() => {
    if (isLoadingFeedings || isLoadingCats || !feedingLogs || !cats) {
      return [];
    }

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return startOfDay(date); // Use startOfDay for consistent comparison
    }).reverse();

    const recentData = last7Days.map(date => {
      const dayLogs = feedingLogs.filter(log => isEqual(startOfDay(new Date(log.timestamp)), date));

      const catData = cats.reduce((acc, cat) => {
        const catLogs = dayLogs.filter(log => log.catId === cat.id);
        const totalFood = catLogs.reduce((sum, log) => sum + (log.portionSize || 0), 0);
        return {
          ...acc,
          [cat.name]: totalFood // Use cat name as key for the chart
        };
      }, {} as Record<string, number>);

      return {
        name: format(date, 'EEE', { locale: ptBR }), // Format day name
        ...catData
      };
    });

    return recentData;
  }, [feedingLogs, isLoadingFeedings, cats, isLoadingCats]);
};

// Selector hook remains useful
export const useFeedingSelector = <T, >(selector: (state: FeedingState) => T): T => {
  const { state } = useFeeding();
  return selector(state);
};