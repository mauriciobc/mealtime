"use client";

import React, { ReactNode, useMemo } from 'react';
import { useUserContext } from './UserContext';
import { CatType } from "@/lib/types";
import { useCatsQuery } from '@/lib/hooks/domain';

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

const CatsContext = React.createContext<{
  state: CatsState;
  forceRefresh: () => void;
  catsMap: Map<string, CatType>;
}>({
  state: initialState,
  forceRefresh: () => undefined,
  catsMap: new Map(),
});
export { CatsContext };

export const CatsProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

export const useCats = () => {
  const { state: userState } = useUserContext();
  const householdId = userState.currentUser?.householdId ?? undefined;
  const userId = userState.currentUser?.id;
  const { data: cats = [], isLoading, error, refetch } = useCatsQuery(householdId, userId);

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

  return { state, forceRefresh: refetch, catsMap };
};

export const useCatsSelector = <T, >(selector: (state: CatsState) => T): T => {
  const { state } = useCats();
  return selector(state);
};
