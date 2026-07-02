"use client";

import React, { createContext, useContext, useReducer, ReactNode, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserContext } from './UserContext';
import { CatType } from "@/lib/types";
import { domainKeys, useCatsQuery } from '@/lib/hooks/domain';

// Remove the simple Cat interface, use CatType from types.ts
// interface Cat {
//   id: string;
//   name: string;
//   age: number;
//   breed: string;
// }

interface CatsState {
  cats: CatType[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CatsState = {
  cats: [],
  isLoading: false,
  error: null,
};

interface CatsAction {
  type: 'FETCH_START' | 'FETCH_SUCCESS' | 'FETCH_ERROR' | 'ADD_CAT' | 'REMOVE_CAT' | 'UPDATE_CAT' | 'REFRESH';
  payload?: CatType[] | CatType | string | number; // Added number for ID-only operations
}

function catsReducer(state: CatsState, action: CatsAction): CatsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, cats: action.payload as CatType[], error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload as string };
    case 'ADD_CAT':
      return { ...state, cats: [...state.cats, action.payload as CatType] };
    case 'REMOVE_CAT':
      const payload = action.payload;
      
      // Verificação defensiva de tipos para evitar erros de runtime
      if (payload === undefined || payload === null) {
        console.warn('[CatsContext] REMOVE_CAT action called with undefined/null payload');
        return state; // Retorna o estado inalterado
      }
      
      let idToRemove: string | number;
      
      if (typeof payload === 'number') {
        // Se for número, usa diretamente (assumindo que é um ID numérico)
        idToRemove = payload;
      } else if (typeof payload === 'string') {
        // Se for string, usa diretamente (assumindo que é um ID string/UUID)
        idToRemove = payload;
      } else if (typeof payload === 'object' && payload !== null && 'id' in payload) {
        // Se for objeto com propriedade 'id'
        const catPayload = payload as CatType;
        if (typeof catPayload.id === 'string' || typeof catPayload.id === 'number') {
          idToRemove = catPayload.id;
        } else {
          console.warn('[CatsContext] REMOVE_CAT action called with invalid cat object - id is not string or number:', catPayload.id);
          return state; // Retorna o estado inalterado
        }
      } else {
        // Payload inválido
        console.warn('[CatsContext] REMOVE_CAT action called with invalid payload type:', typeof payload, payload);
        return state; // Retorna o estado inalterado
      }
      
      return { ...state, cats: state.cats.filter(cat => cat.id !== idToRemove) };
    case 'UPDATE_CAT':
      return {
        ...state,
        cats: state.cats.map(cat =>
          cat.id === (action.payload as CatType).id ? { ...cat, ...(action.payload as CatType) } : cat
        ),
      };
    case 'REFRESH':
      return { ...state, isLoading: true, error: null };
    default:
      return state;
  }
}

const CatsContext = createContext<{
  state: CatsState;
  dispatch: React.Dispatch<CatsAction>;
  forceRefresh: () => void;
  catsMap: Map<string, CatType>; // Bolt: Added for O(1) lookups
}>({
  state: initialState,
  dispatch: () => null,
  forceRefresh: () => null,
  catsMap: new Map(), // Bolt: Default empty map
});
export { CatsContext };

export const CatsProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

export const useCats = () => {
  const { state: userState } = useUserContext();
  const householdId = userState.currentUser?.householdId ?? undefined;
  const userId = userState.currentUser?.id;
  const queryClient = useQueryClient();
  const { data: cats = [], isLoading, error, refetch } = useCatsQuery(householdId, userId);

  const dispatch = useCallback(
    (action: CatsAction) => {
      const key = domainKeys.cats(householdId);
      queryClient.setQueryData<CatType[]>(key, (prev = []) =>
        catsReducer({ cats: prev, isLoading: false, error: null }, action).cats
      );
    },
    [householdId, queryClient]
  );

  const catsMap = useMemo(() => {
    const map = new Map<string, CatType>();
    for (const cat of cats) {
      map.set(String(cat.id), cat);
    }
    return map;
  }, [cats]);

  const state: CatsState = {
    cats,
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
  };

  return { state, dispatch, forceRefresh: refetch, catsMap };
};

// Selector hook remains useful
export const useCatsSelector = <T, >(selector: (state: CatsState) => T): T => {
  const { state } = useCats();
  return selector(state);
};