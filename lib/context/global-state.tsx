"use client";

import { createContext, useContext, useReducer, ReactNode, Dispatch } from "react";
import { CatType, FeedingLog, Schedule, Notification } from "@/lib/types";

// Tipos de ação
type ActionType =
  | { type: "ADD_CAT"; payload: CatType }
  | { type: "UPDATE_CAT"; payload: CatType }
  | { type: "DELETE_CAT"; payload: { id: string } }
  | { type: "ADD_FEEDING_LOG"; payload: FeedingLog }
  | { type: "DELETE_FEEDING_LOG"; payload: { id: string } }
  | { type: "UPDATE_FEEDING_LOG"; payload: FeedingLog }
  | { type: "ADD_SCHEDULE"; payload: Schedule }
  | { type: "UPDATE_SCHEDULE"; payload: Schedule }
  | { type: "DELETE_SCHEDULE"; payload: { id: string } }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_NOTIFICATION_READ"; payload: { id: string } }
  | { type: "DELETE_NOTIFICATION"; payload: { id: string } }
  | { type: "ADD_HOUSEHOLD"; payload: any }
  | { type: "UPDATE_HOUSEHOLD"; payload: any }
  | { type: "DELETE_HOUSEHOLD"; payload: { id: string } }
  | { type: "ADD_HOUSEHOLD_MEMBER"; payload: any }
  | { type: "REMOVE_HOUSEHOLD_MEMBER"; payload: any }
  | { type: "UPDATE_HOUSEHOLD_MEMBER"; payload: any };

// Estado global
interface GlobalState {
  cats: CatType[];
  feedingLogs: FeedingLog[];
  schedules: Schedule[];
  notifications: Notification[];
  households: any[];
  isLoading: boolean;
}

// Estado inicial
const initialState: GlobalState = {
  cats: [],
  feedingLogs: [],
  schedules: [],
  notifications: [],
  households: [],
  isLoading: false,
};

// Contexto
interface GlobalContextType {
  state: GlobalState;
  dispatch: Dispatch<ActionType>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

// Reducer
function reducer(state: GlobalState, action: ActionType): GlobalState {
  switch (action.type) {
    case "ADD_CAT":
      return {
        ...state,
        cats: [...state.cats, action.payload],
      };
    case "UPDATE_CAT":
      return {
        ...state,
        cats: state.cats.map((cat) =>
          cat.id === action.payload.id ? { ...cat, ...action.payload } : cat
        ),
      };
    case "DELETE_CAT":
      return {
        ...state,
        cats: state.cats.filter((cat) => cat.id !== action.payload.id),
      };
    case "ADD_FEEDING_LOG":
      return {
        ...state,
        feedingLogs: [...state.feedingLogs, action.payload],
      };
    case "UPDATE_FEEDING_LOG":
      return {
        ...state,
        feedingLogs: state.feedingLogs.map((log) =>
          log.id === action.payload.id ? { ...log, ...action.payload } : log
        ),
      };
    case "DELETE_FEEDING_LOG":
      return {
        ...state,
        feedingLogs: state.feedingLogs.filter(
          (log) => log.id !== action.payload.id
        ),
      };
    case "ADD_SCHEDULE":
      return {
        ...state,
        schedules: [...state.schedules, action.payload],
      };
    case "UPDATE_SCHEDULE":
      return {
        ...state,
        schedules: state.schedules.map((schedule) =>
          schedule.id === action.payload.id
            ? { ...schedule, ...action.payload }
            : schedule
        ),
      };
    case "DELETE_SCHEDULE":
      return {
        ...state,
        schedules: state.schedules.filter(
          (schedule) => schedule.id !== action.payload.id
        ),
      };
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.payload.id
            ? { ...notification, read: true }
            : notification
        ),
      };
    case "DELETE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter(
          (notification) => notification.id !== action.payload.id
        ),
      };
    case "ADD_HOUSEHOLD":
      return {
        ...state,
        households: [...state.households, action.payload],
      };
    case "UPDATE_HOUSEHOLD":
      return {
        ...state,
        households: state.households.map((household) =>
          household.id === action.payload.id
            ? { ...household, ...action.payload }
            : household
        ),
      };
    case "DELETE_HOUSEHOLD":
      return {
        ...state,
        households: state.households.filter(
          (household) => household.id !== action.payload.id
        ),
      };
    case "ADD_HOUSEHOLD_MEMBER":
      return {
        ...state,
        households: state.households.map((household) =>
          household.id === action.payload.householdId
            ? {
                ...household,
                members: [...(household.members || []), action.payload.member],
              }
            : household
        ),
      };
    case "REMOVE_HOUSEHOLD_MEMBER":
      return {
        ...state,
        households: state.households.map((household) =>
          household.id === action.payload.householdId
            ? {
                ...household,
                members: (household.members || []).filter(
                  (member: any) => member.id !== action.payload.memberId
                ),
              }
            : household
        ),
      };
    case "UPDATE_HOUSEHOLD_MEMBER":
      return {
        ...state,
        households: state.households.map((household) =>
          household.id === action.payload.householdId
            ? {
                ...household,
                members: (household.members || []).map((member: any) =>
                  member.id === action.payload.member.id
                    ? { ...member, ...action.payload.member }
                    : member
                ),
              }
            : household
        ),
      };
    default:
      return state;
  }
}

// Provider
interface GlobalStateProviderProps {
  children: ReactNode;
}

export function GlobalStateProvider({ children }: GlobalStateProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <GlobalContext.Provider value={{ state, dispatch }}>
      {children}
    </GlobalContext.Provider>
  );
}

// Hook personalizado para utilizar o contexto
export function useGlobalState() {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobalState deve ser usado dentro de um GlobalStateProvider");
  }
  return context;
} 