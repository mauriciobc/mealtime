"use client";

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { useUserContext } from './UserContext';
import { Household } from "@/lib/types";
import { useHouseholdsQuery } from '@/lib/hooks/domain';

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

export const HouseholdProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

export const useHousehold = () => {
  const { state: userState } = useUserContext();
  const userId = userState.currentUser?.id;
  const { data: households = [], isLoading, error } = useHouseholdsQuery(userId);
  const [localState, dispatch] = useReducer(householdReducer, initialState);

  const state: HouseholdState = {
    ...localState,
    households,
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : localState.error,
  };

  const wrappedDispatch = useCallback(
    (action: HouseholdAction) => {
      if (action.type === 'SET_HOUSEHOLDS') return;
      dispatch(action);
    },
    []
  );

  return { state, dispatch: wrappedDispatch };
};

export const useHouseholdSelector = <T, >(selector: (state: HouseholdState) => T): T => {
  const { state } = useHousehold();
  return selector(state);
};