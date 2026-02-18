"use client";

import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Schedule } from "@/lib/types"; // Assuming Schedule type is defined here
// Import API service functions if needed for fetching/mutating schedules
// import { getSchedules, addSchedule, updateSchedule, deleteSchedule } from "@/lib/services/scheduleService";
import { useLoading } from "./LoadingContext"; // If schedule operations should trigger loading indicators
import { useUserContext } from "./UserContext"; // Need user/household context
import { toast } from "sonner"; // For error feedback

// Define state type
interface ScheduleState {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;
}

// Define action types
type ScheduleAction =
  | { type: "FETCH_START" }
  | { type: "SET_SCHEDULES"; payload: Schedule[] }
  | { type: "ADD_SCHEDULE"; payload: Schedule }
  | { type: "UPDATE_SCHEDULE"; payload: Schedule }
  | { type: "DELETE_SCHEDULE"; payload: string } // Assuming ID is string UUID
  | { type: "FETCH_ERROR"; payload: string | null }; // Renamed from SET_ERROR, payload is error message

// Initial state
const initialState: ScheduleState = {
  schedules: [],
  isLoading: false, // Start as false, FETCH_START will set it
  error: null,
};

// Create reducer
const scheduleReducer = (state: ScheduleState, action: ScheduleAction): ScheduleState => {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "SET_SCHEDULES":
      return { ...state, schedules: action.payload, isLoading: false, error: null };
    case "ADD_SCHEDULE":
      // Avoid adding duplicates if necessary
      if (state.schedules.some(s => s.id === action.payload.id)) return state;
      return { ...state, schedules: [...state.schedules, action.payload] };
    case "UPDATE_SCHEDULE":
      return {
        ...state,
        schedules: state.schedules.map((schedule) =>
          schedule.id === action.payload.id ? action.payload : schedule
        ),
      };
    case "DELETE_SCHEDULE":
      return {
        ...state,
        schedules: state.schedules.filter((schedule) => schedule.id !== action.payload),
      };
    case "FETCH_ERROR": // Renamed from SET_ERROR
      return { ...state, isLoading: false, error: action.payload }; // Stop loading on error
    default:
      return state;
  }
};

// Create context
interface ScheduleContextType {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
  // Add specific action functions if preferred over exposing dispatch directly
  // fetchSchedules: () => Promise<void>;
  // addSchedule: (scheduleData: Omit<Schedule, 'id'>) => Promise<void>;
  // updateSchedule: (scheduleData: Schedule) => Promise<void>;
  // deleteSchedule: (id: string) => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

async function fetchSchedulesForHousehold(householdId: string, userId?: string): Promise<Schedule[]> {
  const headers: HeadersInit = {};
  if (userId) headers['X-User-ID'] = userId;
  const response = await fetch(`/api/schedules?householdId=${householdId}`, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ${response.status}: ${errorText || 'Failed to load schedules'}`);
  }
  const rawSchedulesData: any[] = await response.json();
  return rawSchedulesData.map(s => ({
    id: String(s.id),
    catId: String(s.cat_id),
    householdId: s.household_id,
    userId: s.user_id,
    type: s.type,
    interval: s.interval,
    times: Array.isArray(s.times) ? s.times : [],
    days: Array.isArray(s.days) ? s.days : [],
    enabled: s.enabled,
    createdAt: s.created_at ? new Date(s.created_at) : new Date(),
    updatedAt: s.updated_at ? new Date(s.updated_at) : undefined,
    cat: s.cat ? {
      id: String(s.cat.id),
      name: s.cat.name,
      birthdate: undefined,
      weight: null,
      householdId: s.household_id,
      photo_url: null,
      restrictions: null,
      notes: null,
      feeding_interval: null,
      portion_size: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    } : undefined,
  }));
}

// Create hook to use context
export function useScheduleContext() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error("useScheduleContext must be used within a ScheduleProvider");
  }
  return context;
}

const LOADING_ID_SCHEDULES = "schedule-load";

// Create provider
export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scheduleReducer, initialState);
  const { state: userState } = useUserContext();
  const { currentUser } = userState;
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const loadingIdRef = useRef<string | null>(null);
  const householdId = currentUser?.householdId;

  const {
    data: schedulesData,
    isLoading: isSchedulesLoading,
    isSuccess: isSchedulesSuccess,
    isError: isSchedulesError,
    error: schedulesError,
  } = useQuery({
    queryKey: ['schedules', householdId],
    queryFn: () => fetchSchedulesForHousehold(householdId!, currentUser?.id),
    enabled: !!householdId,
  });

  const cleanupLoading = useCallback(() => {
    if (loadingIdRef.current) {
      try {
        removeLoadingOperation(loadingIdRef.current);
      } catch (error) {
        console.error('[ScheduleProvider] Error cleaning up loading:', error);
      } finally {
        loadingIdRef.current = null;
      }
    }
  }, [removeLoadingOperation]);

  useEffect(() => {
    if (!householdId) {
      dispatch({ type: "SET_SCHEDULES", payload: [] });
      return;
    }
    if (isSchedulesLoading) {
      loadingIdRef.current = LOADING_ID_SCHEDULES;
      dispatch({ type: "FETCH_START" });
      addLoadingOperation({ id: LOADING_ID_SCHEDULES, priority: 5, description: "Carregando agendamentos..." });
    }
  }, [householdId, isSchedulesLoading, addLoadingOperation]);

  useEffect(() => {
    if (isSchedulesSuccess && schedulesData !== undefined) {
      dispatch({ type: "SET_SCHEDULES", payload: schedulesData });
      cleanupLoading();
    }
  }, [isSchedulesSuccess, schedulesData, cleanupLoading]);

  useEffect(() => {
    if (isSchedulesError && schedulesError) {
      const errorMessage = schedulesError instanceof Error ? schedulesError.message : "Failed to load schedules";
      dispatch({ type: "FETCH_ERROR", payload: errorMessage });
      toast.error(errorMessage);
      cleanupLoading();
    }
  }, [isSchedulesError, schedulesError, cleanupLoading]); 

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
} 