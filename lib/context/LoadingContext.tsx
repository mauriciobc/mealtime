"use client";

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';

interface LoadingOperation {
  id: string;
  priority: number;
  description: string;
}

interface LoadingState {
  operations: LoadingOperation[];
  isGlobalLoading: boolean;
}

type LoadingAction =
  | { type: 'ADD_OPERATION'; payload: LoadingOperation }
  | { type: 'REMOVE_OPERATION'; payload: string }
  | { type: 'CLEAR_OPERATIONS' };

const initialState: LoadingState = {
  operations: [],
  isGlobalLoading: false,
};

const LoadingContext = createContext<{
  state: LoadingState;
  addLoadingOperation: (operation: LoadingOperation) => void;
  removeLoadingOperation: (id: string) => void;
  clearLoadingOperations: () => void;
} | undefined>(undefined);

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'ADD_OPERATION':
      return {
        ...state,
        operations: [...state.operations, action.payload].sort((a, b) => b.priority - a.priority),
        isGlobalLoading: true,
      };
    case 'REMOVE_OPERATION':
      const newOperations = state.operations.filter(op => op.id !== action.payload);
      return {
        ...state,
        operations: newOperations,
        isGlobalLoading: newOperations.length > 0,
      };
    case 'CLEAR_OPERATIONS':
      return {
        ...state,
        operations: [],
        isGlobalLoading: false,
      };
    default:
      return state;
  }
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(loadingReducer, initialState);

  const addLoadingOperation = useCallback((operation: LoadingOperation) => {
    dispatch({ type: 'ADD_OPERATION', payload: operation });
  }, []);

  const removeLoadingOperation = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_OPERATION', payload: id });
  }, []);

  const clearLoadingOperations = useCallback(() => {
    dispatch({ type: 'CLEAR_OPERATIONS' });
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        state,
        addLoadingOperation,
        removeLoadingOperation,
        clearLoadingOperations,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading deve ser usado dentro de um LoadingProvider');
  }
  return context;
} 