"use client";

import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from './UserContext'; // Assuming UserContext provides currentUser
import { useLoading } from './LoadingContext';
import { toast } from 'sonner';
import { Household } from "@/lib/types"; // Assuming Household type definition exists

interface Member {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

interface HouseholdState {
  currentHousehold: Household | null;
  households: Household[];
  members: Member[];
  isLoading: boolean;
  error: string | null;
}

const initialState: HouseholdState = {
  currentHousehold: null,
  households: [],
  members: [],
  isLoading: false,
  error: null,
};

interface HouseholdAction {
  type: 'FETCH_START' | 'FETCH_SUCCESS' | 'FETCH_ERROR' | 'SET_HOUSEHOLD' | 'SET_HOUSEHOLDS' | 'ADD_MEMBER' | 'REMOVE_MEMBER' | 'UPDATE_MEMBER' | 'SYNC_STATE';
  payload?: Household | Household[] | Member | Member[] | string | HouseholdState | { household: Household, members: Member[] };
}

function householdReducer(state: HouseholdState, action: HouseholdAction): HouseholdState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null, households: [] };
    case 'FETCH_SUCCESS':
      const { household, members } = action.payload as { household: Household, members: Member[] };
      return { ...state, isLoading: false, currentHousehold: household, members: members || [], error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload as string };
    case 'SET_HOUSEHOLD':
      return { ...state, currentHousehold: action.payload as Household };
    case 'SET_HOUSEHOLDS':
      return { ...state, isLoading: false, households: action.payload as Household[], error: null };
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload as Member] };
    case 'REMOVE_MEMBER':
      return { ...state, members: state.members.filter(member => member.id !== (action.payload as Member).id) };
    case 'UPDATE_MEMBER':
      return {
        ...state,
        members: state.members.map(member =>
          member.id === (action.payload as Member).id ? { ...member, ...(action.payload as Member) } : member
        ),
      };
    default:
      return state;
  }
}

const HouseholdContext = createContext<{
  state: HouseholdState;
  dispatch: React.Dispatch<HouseholdAction>;
}>({ state: initialState, dispatch: () => null });

async function fetchHouseholds(): Promise<Household[]> {
  const response = await fetch('/api/households', { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    let errorMsg = `Erro ao carregar residências (${response.status})`;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } else {
        const errorText = await response.text();
        errorMsg = errorText.length > 200 ? errorText.substring(0, 200) + "..." : errorText || errorMsg;
      }
    } catch (_e) {}
    throw new Error(errorMsg);
  }
  return response.json();
}

const LOADING_ID_HOUSEHOLDS = 'household-data-load';

export const HouseholdProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(householdReducer, initialState);
  const { state: userState } = useUserContext();
  const { currentUser } = userState;
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const loadingIdRef = useRef<string | null>(null);

  const {
    data: householdsData,
    isLoading: isHouseholdsLoading,
    isSuccess: isHouseholdsSuccess,
    isError: isHouseholdsError,
    error: householdsError,
  } = useQuery({
    queryKey: ['households', currentUser?.id],
    queryFn: fetchHouseholds,
    enabled: !!currentUser?.id,
  });

  const cleanupLoading = useCallback(() => {
    if (loadingIdRef.current) {
      try {
        removeLoadingOperation(loadingIdRef.current);
      } catch (error) {
        console.error('[HouseholdProvider] Error cleaning up loading:', error);
      } finally {
        loadingIdRef.current = null;
      }
    }
  }, [removeLoadingOperation]);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (isHouseholdsLoading) {
      loadingIdRef.current = LOADING_ID_HOUSEHOLDS;
      dispatch({ type: 'FETCH_START' });
      addLoadingOperation({ id: LOADING_ID_HOUSEHOLDS, priority: 2, description: 'Carregando residências...' });
    }
  }, [currentUser?.id, isHouseholdsLoading, addLoadingOperation]);

  useEffect(() => {
    if (isHouseholdsSuccess && householdsData !== undefined) {
      dispatch({ type: 'SET_HOUSEHOLDS', payload: householdsData });
      cleanupLoading();
    }
  }, [isHouseholdsSuccess, householdsData, cleanupLoading]);

  useEffect(() => {
    if (isHouseholdsError && householdsError) {
      const errorMessage = householdsError instanceof Error ? householdsError.message : 'Falha ao carregar dados das residências';
      dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      cleanupLoading();
    }
  }, [isHouseholdsError, householdsError, cleanupLoading]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <HouseholdContext.Provider value={contextValue}>
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => useContext(HouseholdContext);

export const useHouseholdSelector = <T, >(selector: (state: HouseholdState) => T): T => {
  const { state } = useHousehold();
  return selector(state);
};