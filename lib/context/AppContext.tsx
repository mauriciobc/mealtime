'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { User as CurrentUserType } from "@/lib/types";

interface AppState {
  currentUser: CurrentUserType | null;
  // Add other app state properties as needed
}

type AppAction = 
  | { type: 'SET_CURRENT_USER'; payload: CurrentUserType | null }
  // Add other action types as needed

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const initialState: AppState = {
  currentUser: null,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return {
        ...state,
        currentUser: action.payload,
      };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
} 