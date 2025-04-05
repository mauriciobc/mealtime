import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect } from 'react';
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
  members: Member[];
  isLoading: boolean;
  error: string | null;
}

const initialState: HouseholdState = {
  currentHousehold: null,
  members: [],
  isLoading: false,
  error: null,
};

interface HouseholdAction {
  type: 'FETCH_START' | 'FETCH_SUCCESS' | 'FETCH_ERROR' | 'SET_HOUSEHOLD' | 'ADD_MEMBER' | 'REMOVE_MEMBER' | 'UPDATE_MEMBER' | 'SYNC_STATE';
  payload?: Household | Member | Member[] | string | HouseholdState | { household: Household, members: Member[] };
}

function householdReducer(state: HouseholdState, action: HouseholdAction): HouseholdState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      const { household, members } = action.payload as { household: Household, members: Member[] };
      return { ...state, isLoading: false, currentHousehold: household, members: members || state.members, error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload as string };
    case 'SET_HOUSEHOLD':
      return { ...state, currentHousehold: action.payload as Household };
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

export const HouseholdProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(householdReducer, initialState);
  const { state: userState } = useUserContext();
  const { currentUser } = userState;
  const { addLoadingOperation, removeLoadingOperation } = useLoading();

  useEffect(() => {
    let isMounted = true;
    const loadingId = 'household-data-load';

    const loadHouseholdData = async () => {
      if (!currentUser?.householdId) {
        return;
      }

      dispatch({ type: 'FETCH_START' });
      addLoadingOperation({ id: loadingId, priority: 2, description: 'Carregando dados da residência...' });

      try {
        const response = await fetch(`/api/households/${currentUser.householdId}`);
        if (!response.ok) {
          throw new Error(`Erro ao carregar dados da residência (${response.status})`);
        }
        const householdData: Household = await response.json();

        if (isMounted) {
          dispatch({ type: 'FETCH_SUCCESS', payload: { household: householdData, members: householdData.members || [] } });
        }
      } catch (error: any) {
        console.error("[HouseholdProvider] Error loading data:", error);
        if (isMounted) {
          const errorMessage = error.message || 'Falha ao carregar dados da residência';
          dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
          toast.error(errorMessage);
        }
      } finally {
        if (isMounted) {
          removeLoadingOperation(loadingId);
        }
      }
    };

    loadHouseholdData();

    return () => {
      isMounted = false;
      removeLoadingOperation(loadingId);
    };
  }, [currentUser?.id, currentUser?.householdId, addLoadingOperation, removeLoadingOperation, dispatch]);

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