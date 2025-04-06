"use client";

import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useCallback } from "react";
import { Schedule } from "@/lib/types"; // Assuming Schedule type is defined here
// Import API service functions if needed for fetching/mutating schedules
// import { getSchedules, addSchedule, updateSchedule, deleteSchedule } from "@/lib/services/scheduleService";
import { useLoading } from "./LoadingContext"; // If schedule operations should trigger loading indicators

// Define state type
interface ScheduleState {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;
}

// Define action types
type ScheduleAction =
  | { type: "SET_SCHEDULES"; payload: Schedule[] }
  | { type: "ADD_SCHEDULE"; payload: Schedule }
  | { type: "UPDATE_SCHEDULE"; payload: Schedule }
  | { type: "DELETE_SCHEDULE"; payload: string } // Assuming ID is string
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

// Initial state
const initialState: ScheduleState = {
  schedules: [],
  isLoading: false,
  error: null,
};

// Create reducer
const scheduleReducer = (state: ScheduleState, action: ScheduleAction): ScheduleState => {
  switch (action.type) {
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
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
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

// Create hook to use context
export function useScheduleContext() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error("useScheduleContext must be used within a ScheduleProvider");
  }
  return context;
}

// Create provider
export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scheduleReducer, initialState);
  // const { addLoadingOperation, removeLoadingOperation } = useLoading(); // Uncomment if using loading context

  // Example: Fetch initial schedules
  // useEffect(() => {
  //   const loadSchedules = async () => {
  //     const opId = "schedule-load";
  //     dispatch({ type: "SET_LOADING", payload: true });
  //     // addLoadingOperation({ id: opId, priority: 1, description: "Loading schedules..."});
  //     try {
  //       // const schedules = await getSchedules(); // Replace with actual API call
  //       // dispatch({ type: "SET_SCHEDULES", payload: schedules });
  //     } catch (error: any) {
  //       dispatch({ type: "SET_ERROR", payload: error.message || "Failed to load schedules" });
  //     } finally {
  //       // removeLoadingOperation(opId);
  //       // dispatch({ type: "SET_LOADING", payload: false }); // Handled by SET_SCHEDULES/SET_ERROR
  //     }
  //   };
  //   loadSchedules();
  // }, [/* dependencies like user ID? */]);

  // Example action wrappers (optional)
  // const fetchSchedules = useCallback(async () => { ... }, []);
  // const addSchedule = useCallback(async (scheduleData) => { ... }, []);
  // const updateSchedule = useCallback(async (scheduleData) => { ... }, []);
  // const deleteSchedule = useCallback(async (id) => { ... }, []);

  // Provide state and dispatch (or action wrappers)
  const value = {
    state,
    dispatch,
    // fetchSchedules, // Uncomment if using action wrappers
    // addSchedule,
    // updateSchedule,
    // deleteSchedule,
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
} 