"use client";

import React, { createContext, useContext, useReducer, ReactNode, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserContext } from './UserContext';
import { format, subDays } from 'date-fns';
import { domainKeys, useWeightDataQuery, type WeightData } from '@/lib/hooks/domain';

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

export const WeightProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

export const useWeight = () => {
  const { state: userState } = useUserContext();
  const householdId = userState.currentUser?.householdId ?? undefined;
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useWeightDataQuery(householdId);

  const dispatch = useCallback(
    (action: WeightAction) => {
      const key = domainKeys.weightLogs(householdId);
      queryClient.setQueryData<WeightData>(key, (prev) => {
        const base: WeightState = {
          weightLogs: prev?.weightLogs ?? [],
          weightGoals: prev?.weightGoals ?? [],
          isLoading: false,
          error: null,
        };
        const next = weightReducer(base, action);
        return { weightLogs: next.weightLogs, weightGoals: next.weightGoals };
      });
    },
    [householdId, queryClient]
  );

  const state: WeightState = {
    weightLogs: data?.weightLogs ?? [],
    weightGoals: data?.weightGoals ?? [],
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
  };

  return { state, dispatch, forceRefresh: refetch };
};

// Hook selector
export const useWeightSelector = <T,>(selector: (state: WeightState) => T): T => {
  const { state } = useWeight();
  return selector(state);
};

// Hooks específicos
export const useSelectCurrentWeight = (catId: string): number | null => {
  const { state } = useWeight();
  const catLogs = state.weightLogs
    .filter(log => log.catId === catId)
    .sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
  if (catLogs.length === 0) return null;
  const firstLog = catLogs[0];
  return firstLog ? firstLog.weight : null;
};

export const useSelectWeightHistory = (catId: string, days: number = 30): WeightLog[] => {
  const { state } = useWeight();
  const cutoffDate = subDays(new Date(), days);
  return state.weightLogs
    .filter(log => log.catId === catId && log.date >= cutoffDate)
    .sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
};

export const useSelectWeightGoals = (catId: string): WeightGoal[] => {
  const { state } = useWeight();
  if (!catId) return [];
  console.log('[WeightContext] Buscando metas para gato:', catId);
  console.log('[WeightContext] Estado atual:', state);
  
  const goals = state.weightGoals
    .filter(goal => goal.catId === catId && goal.status === 'active')
    .sort((a: any, b: any) => (a.targetDate?.getTime() ?? 0) - (b.targetDate?.getTime() ?? 0));
    
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