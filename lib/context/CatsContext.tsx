import React, { createContext, useContext, useReducer, ReactNode, useMemo, useEffect, useRef, useCallback } from 'react';
import { useUserContext } from './UserContext'; // Need user/household context to know which cats to fetch
import { useLoading } from './LoadingContext';
import { toast } from 'sonner';
import { CatType } from "@/lib/types"; // Use the existing detailed CatType
import { fetchCatsForHousehold } from "@/lib/services/apiService"; // Reuse the service function

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

export const CatsProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(catsReducer, initialState);
  const { state: userState } = useUserContext();
  const { currentUser } = userState;
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingIdRef = useRef<string | null>(null);
  const hasAttemptedLoadRef = useRef(false);
  const isMountedRef = useRef(true);

  const cleanupLoading = useCallback(() => {
    if (loadingIdRef.current) {
      try {
        removeLoadingOperation(loadingIdRef.current);
      } catch (error) {
        console.error('[CatsProvider] Error cleaning up loading:', error);
      } finally {
        loadingIdRef.current = null;
      }
    }
  }, [removeLoadingOperation]);

  const loadCatsData = useCallback(async () => {
    const loadingId = 'cats-data-load';
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const householdId = currentUser?.householdId;
    if (!householdId || !isMountedRef.current) {
      if (!householdId) {
        dispatch({ type: 'FETCH_SUCCESS', payload: [] });
      }
      return;
    }
    hasAttemptedLoadRef.current = true;
    try {
      loadingIdRef.current = loadingId;
      dispatch({ type: 'FETCH_START' });
      addLoadingOperation({ id: loadingId, priority: 3, description: 'Carregando dados dos gatos...' });
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log("[CatsProvider] Loading cats for household:", householdId);
      }
      const catsData: CatType[] = await fetchCatsForHousehold(householdId, currentUser?.id, undefined, abortController.signal);
      if (!isMountedRef.current) return;
      if (process.env.NODE_ENV === 'development') {
        console.log("[CatsProvider] Cats loaded:", catsData.length);
      }
      dispatch({ type: 'FETCH_SUCCESS', payload: catsData });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[CatsProvider] Request aborted');
        return;
      }
      if (!isMountedRef.current) return;
      console.error("[CatsProvider] Error loading cats data:", error);
      const errorMessage = error.message || 'Falha ao carregar dados dos gatos';
      dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    } finally {
      if (isMountedRef.current) {
        cleanupLoading();
      }
    }
  }, [addLoadingOperation, cleanupLoading, currentUser?.householdId, currentUser?.id]);

  const forceRefresh = useCallback(() => {
    hasAttemptedLoadRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    cleanupLoading();
    loadCatsData();
  }, [cleanupLoading, loadCatsData]);

  useEffect(() => {
    isMountedRef.current = true;
    hasAttemptedLoadRef.current = false;
    loadCatsData();
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      cleanupLoading();
    };
  }, [currentUser?.householdId, currentUser?.id, addLoadingOperation, cleanupLoading, loadCatsData]);

  // Bolt: Memoize the cats array into a Map for efficient O(1) lookups.
  // This prevents consumers of the context from needing to repeatedly use
  // Array.prototype.find() (O(n)) inside their own components.
  const catsMap = useMemo(() => {
    const map = new Map<string, CatType>();
    for (const cat of state.cats) {
      // Assuming cat.id is a string or can be converted to one.
      map.set(String(cat.id), cat);
    }
    return map;
  }, [state.cats]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch, forceRefresh, catsMap }), [state, dispatch, forceRefresh, catsMap]);

  return (
    <CatsContext.Provider value={contextValue}>
      {children}
    </CatsContext.Provider>
  );
};

export const useCats = () => useContext(CatsContext);

// Selector hook remains useful
export const useCatsSelector = <T, >(selector: (state: CatsState) => T): T => {
  const { state } = useCats();
  return selector(state);
};