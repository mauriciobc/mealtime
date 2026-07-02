"use client";

import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Schedule } from "@/lib/types";
import { useUserContext } from "./UserContext";
import { domainKeys, useSchedulesQuery } from "@/lib/hooks/domain";
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

export function useScheduleContext() {
  const { state: userState } = useUserContext();
  const householdId = userState.currentUser?.householdId ?? undefined;
  const userId = userState.currentUser?.id;
  const queryClient = useQueryClient();
  const { data: schedules = [], isLoading, error } = useSchedulesQuery(householdId, userId);

  const dispatch = useCallback(
    (action: ScheduleAction) => {
      const key = domainKeys.schedules(householdId);
      queryClient.setQueryData<Schedule[]>(key, (prev = []) =>
        scheduleReducer({ schedules: prev, isLoading: false, error: null }, action).schedules
      );
    },
    [householdId, queryClient]
  );

  const state: ScheduleState = {
    schedules,
    isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
  };

  return { state, dispatch };
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}