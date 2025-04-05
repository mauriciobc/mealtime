import React, { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';

interface Member {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

interface HouseholdState {
  members: Member[];
}

const initialState: HouseholdState = {
  members: [],
};

interface HouseholdAction {
  type: 'ADD_MEMBER' | 'REMOVE_MEMBER' | 'UPDATE_MEMBER' | 'SYNC_STATE';
  payload: Member | HouseholdState;
}

function householdReducer(state: HouseholdState, action: HouseholdAction): HouseholdState {
  switch (action.type) {
    case 'ADD_MEMBER':
      return { members: [...state.members, action.payload as Member] };
    case 'REMOVE_MEMBER':
      return { members: state.members.filter(member => member.id !== (action.payload as Member).id) };
    case 'UPDATE_MEMBER':
      return {
        members: state.members.map(member =>
          member.id === (action.payload as Member).id ? { ...member, ...(action.payload as Member) } : member
        ),
      };
    case 'SYNC_STATE':
      return action.payload as HouseholdState;
    default:
      return state;
  }
}

const HouseholdContext = createContext<{
  state: HouseholdState;
  dispatch: React.Dispatch<HouseholdAction>;
}>({ state: initialState, dispatch: () => null });

export const HouseholdProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(householdReducer, initialState);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <HouseholdContext.Provider value={contextValue}>
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => useContext(HouseholdContext);

// Add state selectors to allow components to subscribe to specific parts of the state
export const useHouseholdSelector = <T, >(selector: (state: HouseholdState) => T): T => {
  const { state } = useHousehold();
  return selector(state);
};