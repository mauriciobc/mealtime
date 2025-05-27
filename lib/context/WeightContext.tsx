import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect, useRef, useCallback } from 'react';
import { useUserContext } from './UserContext';
import { useLoading } from './LoadingContext';
import { toast } from 'sonner';
import { format, startOfDay, isEqual, addHours, isBefore, compareAsc, endOfDay, subDays, compareDesc } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { getUserTimezone } from "../utils/dateUtils";
import { resolveDateFnsLocale } from "../utils/dateFnsLocale";
import { useUserContext as useUserContextLib } from "@/lib/context/UserContext";

// Adicione no topo do arquivo
console.log('[WeightContext][DEBUG] Arquivo importado');

// Interfaces para os tipos de dados
interface WeightLog {
  id: string;
  catId: string;
  weight: number;
  date: Date;
  notes?: string;
  measuredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WeightGoal {
  id: string;
  catId: string;
  targetWeight: number;
  targetDate?: Date;
  startWeight?: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WeightGoalMilestone {
  id: string;
  goalId: string;
  weight: number;
  date: Date;
  notes?: string;
}

interface WeightState {
  weightLogs: WeightLog[];
  weightGoals: WeightGoal[];
  isLoading: boolean;
  error: string | null;
}

const initialState: WeightState = {
  weightLogs: [],
  weightGoals: [],
  isLoading: false,
  error: null,
};

interface WeightAction {
  type:
    | 'FETCH_START'
    | 'FETCH_ERROR'
    | 'FETCH_WEIGHT_LOGS_SUCCESS'
    | 'FETCH_WEIGHT_GOALS_SUCCESS'
    | 'ADD_WEIGHT_LOG'
    | 'REMOVE_WEIGHT_LOG'
    | 'UPDATE_WEIGHT_LOG'
    | 'ADD_WEIGHT_GOAL'
    | 'REMOVE_WEIGHT_GOAL'
    | 'UPDATE_WEIGHT_GOAL';
  payload?: WeightLog[] | WeightLog | WeightGoal[] | WeightGoal | string;
}

function weightReducer(state: WeightState, action: WeightAction): WeightState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_WEIGHT_LOGS_SUCCESS':
      return { ...state, isLoading: false, weightLogs: action.payload as WeightLog[], error: null };
    case 'FETCH_WEIGHT_GOALS_SUCCESS':
      return { ...state, isLoading: false, weightGoals: action.payload as WeightGoal[], error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload as string };
    case 'ADD_WEIGHT_LOG':
      return { ...state, weightLogs: [...state.weightLogs, action.payload as WeightLog] };
    case 'REMOVE_WEIGHT_LOG':
      return {
        ...state,
        weightLogs: state.weightLogs.filter(log => log.id !== (action.payload as WeightLog).id)
      };
    case 'UPDATE_WEIGHT_LOG':
      return {
        ...state,
        weightLogs: state.weightLogs.map(log =>
          log.id === (action.payload as WeightLog).id ? { ...log, ...(action.payload as WeightLog) } : log
        ),
      };
    case 'ADD_WEIGHT_GOAL':
      return { ...state, weightGoals: [...state.weightGoals, action.payload as WeightGoal] };
    case 'REMOVE_WEIGHT_GOAL':
      return {
        ...state,
        weightGoals: state.weightGoals.filter(goal => goal.id !== (action.payload as WeightGoal).id)
      };
    case 'UPDATE_WEIGHT_GOAL':
      return {
        ...state,
        weightGoals: state.weightGoals.map(goal =>
          goal.id === (action.payload as WeightGoal).id ? { ...goal, ...(action.payload as WeightGoal) } : goal
        ),
      };
    default:
      return state;
  }
}

const WeightContext = createContext<{
  state: WeightState;
  dispatch: React.Dispatch<WeightAction>;
  forceRefresh: () => void;
}>({ state: initialState, dispatch: () => null, forceRefresh: () => null });

export const WeightProvider = ({ children }: { children: ReactNode }) => {
  console.log('[WeightContext][DEBUG] WeightProvider montado');
  const [state, dispatch] = useReducer(weightReducer, initialState);
  const { state: userState } = useUserContext();
  const { currentUser } = userState;
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingIdRef = useRef<string | null>(null);
  const hasAttemptedLoadRef = useRef(false);
  const isMountedRef = useRef(true);
  const { state: userStateLib } = useUserContextLib();
  const userLanguage = userStateLib.currentUser?.preferences?.language;
  const userLocale = resolveDateFnsLocale(userLanguage);

  const cleanupLoading = useCallback(() => {
    if (loadingIdRef.current) {
      try {
        removeLoadingOperation(loadingIdRef.current);
      } catch (error) {
        console.error('[WeightProvider] Error cleaning up loading:', error);
      } finally {
        loadingIdRef.current = null;
      }
    }
  }, [removeLoadingOperation]);

  const loadWeightData = useCallback(async () => {
    // LOG de debug para currentUser e householdId
    console.log('[WeightContext][DEBUG] currentUser:', currentUser);
    console.log('[WeightContext][DEBUG] householdId:', currentUser?.householdId);
    const loadingId = 'weight-data-load';
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const householdId = currentUser?.householdId;
    
    // Validação explícita de currentUser e householdId
    if (!currentUser || !currentUser.id) {
      console.error('[WeightContext][ERRO] currentUser não definido.');
      toast.error('Usuário não autenticado. Faça login novamente.');
      return;
    }
    if (!householdId) {
      console.error('[WeightContext][ERRO] householdId não definido para o usuário.');
      toast.error('Não foi possível identificar a casa do usuário.');
      return;
    }
    if (!isMountedRef.current) {
      return;
    }

    hasAttemptedLoadRef.current = true;

    try {
      loadingIdRef.current = loadingId;
      dispatch({ type: 'FETCH_START' });
      addLoadingOperation({ id: loadingId, priority: 3, description: 'Carregando dados de peso...' });

      // LOG: início da requisição de logs
      const logsUrl = `/api/weight/logs?householdId=${householdId}`;
      const headers: HeadersInit = {};
      if (currentUser?.id) {
        headers['X-User-ID'] = currentUser.id;
      }
      console.log('[WeightContext][SERVER] GET', logsUrl, headers);

      // Fetch weight logs
      const logsResponse = await fetch(logsUrl, {
        signal: abortController.signal,
        headers
      });
      console.log('[WeightContext][SERVER] logsResponse status:', logsResponse.status);
      let weightLogsData = [];
      try {
        weightLogsData = await logsResponse.json();
        console.log('[WeightContext][SERVER] logsResponse body:', weightLogsData);
      } catch (e) {
        console.error('[WeightContext][SERVER] Falha ao parsear body dos logs:', e);
      }

      if (!isMountedRef.current) return;

      if (!logsResponse.ok) {
        throw new Error(`Erro ao carregar logs de peso (${logsResponse.status})`);
      }

      // LOG: início da requisição de metas
      const goalsUrl = `/api/goals`;
      console.log('[WeightContext][SERVER] GET', goalsUrl, headers);
      const goalsResponse = await fetch(goalsUrl, {
        signal: abortController.signal,
        headers
      });
      console.log('[WeightContext][SERVER] goalsResponse status:', goalsResponse.status);
      let weightGoalsData = [];
      try {
        weightGoalsData = await goalsResponse.json();
        console.log('[WeightContext][SERVER] goalsResponse body:', weightGoalsData);
      } catch (e) {
        console.error('[WeightContext][SERVER] Falha ao parsear body das metas:', e);
      }

      if (!isMountedRef.current) return;

      if (!goalsResponse.ok) {
        throw new Error(`Erro ao carregar metas de peso (${goalsResponse.status})`);
      }

      // Map and sort the data
      const mappedWeightLogs: WeightLog[] = weightLogsData.map((log: any) => ({
        id: log.id,
        catId: log.cat_id,
        weight: parseFloat(log.weight),
        date: new Date(log.date),
        notes: log.notes,
        measuredBy: log.measured_by,
        createdAt: new Date(log.created_at),
        updatedAt: new Date(log.updated_at)
      })).sort((a, b) => b.date.getTime() - a.date.getTime());

      const mappedWeightGoals: WeightGoal[] = weightGoalsData.map((goal: any) => ({
        id: goal.id,
        catId: goal.cat_id,
        targetWeight: parseFloat(goal.target_weight),
        targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
        startWeight: goal.start_weight ? parseFloat(goal.start_weight) : undefined,
        status: goal.status,
        notes: goal.notes,
        createdBy: goal.created_by,
        createdAt: new Date(goal.created_at),
        updatedAt: new Date(goal.updated_at)
      }));

      console.log('[WeightContext] Logs mapeados:', mappedWeightLogs);
      console.log('[WeightContext] Metas mapeadas:', mappedWeightGoals);

      dispatch({ type: 'FETCH_WEIGHT_LOGS_SUCCESS', payload: mappedWeightLogs });
      dispatch({ type: 'FETCH_WEIGHT_GOALS_SUCCESS', payload: mappedWeightGoals });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[WeightContext] Requisição abortada');
        return;
      }

      if (!isMountedRef.current) return;

      console.error('[WeightContext][SERVER] Erro ao carregar dados de peso:', error);
      const errorMessage = error.message || 'Falha ao carregar dados de peso';
      dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    } finally {
      if (isMountedRef.current) {
        cleanupLoading();
      }
    }
  }, [addLoadingOperation, cleanupLoading, currentUser?.householdId, currentUser?.id]);

  const forceRefresh = useCallback(() => {
    hasAttemptedLoadRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    cleanupLoading();
    loadWeightData();
  }, [cleanupLoading, loadWeightData]);

  useEffect(() => {
    console.log('[WeightContext][DEBUG] useEffect disparado', currentUser, currentUser?.householdId);
    isMountedRef.current = true;
    hasAttemptedLoadRef.current = false;
    if (
      currentUser &&
      typeof currentUser.householdId === 'string' &&
      currentUser.householdId.length > 0
    ) {
      loadWeightData();
    }
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      cleanupLoading();
    };
  }, [currentUser?.householdId, currentUser?.id, addLoadingOperation, cleanupLoading, loadWeightData]);

  const contextValue = useMemo(() => ({ state, dispatch, forceRefresh }), [state, forceRefresh]);

  return (
    <WeightContext.Provider value={contextValue}>
      {children}
    </WeightContext.Provider>
  );
};

// Hook principal
export const useWeight = () => useContext(WeightContext);

// Hook selector
export const useWeightSelector = <T,>(selector: (state: WeightState) => T): T => {
  const { state } = useWeight();
  return selector(state);
};

// Hooks específicos
export const useSelectCurrentWeight = (catId: string): number | null => {
  const { state } = useWeight();
  const catLogs = state.weightLogs.filter(log => log.catId === catId);
  if (catLogs.length === 0) return null;
  return catLogs[0].weight;
};

export const useSelectWeightHistory = (catId: string, days: number = 30): WeightLog[] => {
  const { state } = useWeight();
  const cutoffDate = subDays(new Date(), days);
  return state.weightLogs
    .filter(log => log.catId === catId && log.date >= cutoffDate)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const useSelectWeightGoals = (catId: string): WeightGoal[] => {
  const { state } = useWeight();
  if (!catId) return [];
  console.log('[WeightContext] Buscando metas para gato:', catId);
  console.log('[WeightContext] Estado atual:', state);
  
  const goals = state.weightGoals
    .filter(goal => goal.catId === catId && goal.status === 'active')
    .sort((a, b) => (a.targetDate?.getTime() ?? 0) - (b.targetDate?.getTime() ?? 0));
    
  console.log('[WeightContext] Metas encontradas:', goals);
  return goals;
};

export const useSelectWeightProgress = (goalId: string): number => {
  const { state } = useWeight();
  const goal = state.weightGoals.find(g => g.id === goalId);
  const currentWeight = useSelectCurrentWeight(goal?.catId ?? '');

  if (!goal || !goal.startWeight) return 0;
  if (!currentWeight) return 0;

  const totalChange = goal.targetWeight - goal.startWeight;
  const currentChange = currentWeight - goal.startWeight;
  
  return Math.min(Math.max((currentChange / totalChange) * 100, 0), 100);
}; 