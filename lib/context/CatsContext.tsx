import React, { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';

interface Cat {
  id: string;
  name: string;
  age: number;
  breed: string;
}

interface CatsState {
  cats: Cat[];
}

const initialState: CatsState = {
  cats: [],
};

interface CatsAction {
  type: 'ADD_CAT' | 'REMOVE_CAT' | 'UPDATE_CAT' | 'SYNC_STATE';
  payload: Cat | CatsState;
}

function catsReducer(state: CatsState, action: CatsAction): CatsState {
  switch (action.type) {
    case 'ADD_CAT':
      return { cats: [...state.cats, action.payload as Cat] };
    case 'REMOVE_CAT':
      return { cats: state.cats.filter(cat => cat.id !== (action.payload as Cat).id) };
    case 'UPDATE_CAT':
      return {
        cats: state.cats.map(cat =>
          cat.id === (action.payload as Cat).id ? { ...cat, ...(action.payload as Cat) } : cat
        ),
      };
    case 'SYNC_STATE':
      return action.payload as CatsState;
    default:
      return state;
  }
}

const CatsContext = createContext<{
  state: CatsState;
  dispatch: React.Dispatch<CatsAction>;
}>({ state: initialState, dispatch: () => null });

export const CatsProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(catsReducer, initialState);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <CatsContext.Provider value={contextValue}>
      {children}
    </CatsContext.Provider>
  );
};

export const useCats = () => useContext(CatsContext);

// Add state selectors to allow components to subscribe to specific parts of the state
export const useCatsSelector = <T, >(selector: (state: CatsState) => T): T => {
  const { state } = useCats();
  return selector(state);
};