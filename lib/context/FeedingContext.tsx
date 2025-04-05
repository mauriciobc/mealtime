import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Feeding {
  id: string;
  catId: string;
  time: string;
  amount: number;
}

interface FeedingState {
  feedings: Feeding[];
}

const initialState: FeedingState = {
  feedings: [],
};

interface FeedingAction {
  type: 'ADD_FEEDING' | 'REMOVE_FEEDING' | 'UPDATE_FEEDING' | 'SYNC_STATE';
  payload: Feeding | FeedingState;
}

function feedingReducer(state: FeedingState, action: FeedingAction): FeedingState {
  switch (action.type) {
    case 'ADD_FEEDING':
      return { feedings: [...state.feedings, action.payload as Feeding] };
    case 'REMOVE_FEEDING':
      return { feedings: state.feedings.filter(feeding => feeding.id !== (action.payload as Feeding).id) };
    case 'UPDATE_FEEDING':
      return {
        feedings: state.feedings.map(feeding =>
          feeding.id === (action.payload as Feeding).id ? { ...feeding, ...(action.payload as Feeding) } : feeding
        ),
      };
    case 'SYNC_STATE':
      return action.payload as FeedingState;
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

  return (
    <FeedingContext.Provider value={{ state, dispatch }}>
      {children}
    </FeedingContext.Provider>
  );
};

export const useFeeding = () => useContext(FeedingContext);