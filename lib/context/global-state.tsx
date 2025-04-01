"use client";

import { createContext, useContext, useReducer, ReactNode, Dispatch } from "react";
import { CatType, FeedingLog, Schedule, Notification } from "@/lib/types";

// Interface for the current user data
interface CurrentUser {
  id: number;
  name: string;
  email: string;
  avatar: string;
  householdId: number | null;
  preferences: {
    timezone: string;
    language: string;
    notifications: {
      pushEnabled: boolean;
      emailEnabled: boolean;
      feedingReminders: boolean;
      missedFeedingAlerts: boolean;
      householdUpdates: boolean;
    };
  };
  role: string;
}

// Tipos de ação
type ActionType =
  | { type: "SET_CATS"; payload: CatType[] }
  | { type: "ADD_CAT"; payload: CatType }
  | { type: "UPDATE_CAT"; payload: CatType }
  | { type: "DELETE_CAT"; payload: number }
  | { type: "SET_FEEDING_LOGS"; payload: FeedingLog[] }
  | { type: "ADD_FEEDING_LOG"; payload: FeedingLog }
  | { type: "DELETE_FEEDING_LOG"; payload: string }
  | { type: "UPDATE_FEEDING_LOG"; payload: FeedingLog }
  | { type: "ADD_SCHEDULE"; payload: Schedule }
  | { type: "UPDATE_SCHEDULE"; payload: Schedule }
  | { type: "DELETE_SCHEDULE"; payload: string }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "REMOVE_NOTIFICATION"; payload: string }
  | { type: "ADD_HOUSEHOLD"; payload: any }
  | { type: "SET_HOUSEHOLDS"; payload: any[] }
  | { type: "UPDATE_HOUSEHOLD"; payload: any }
  | { type: "DELETE_HOUSEHOLD"; payload: string }
  | { type: "ADD_HOUSEHOLD_MEMBER"; payload: { householdId: string; member: any } }
  | { type: "REMOVE_HOUSEHOLD_MEMBER"; payload: { householdId: string; memberId: string } }
  | { type: "UPDATE_HOUSEHOLD_MEMBER"; payload: { householdId: string; member: any } }
  | { type: "SET_CURRENT_USER"; payload: CurrentUser | null }
  | { type: "SET_ERROR"; payload: string | null };

// Estado global
interface GlobalState {
  cats: CatType[];
  feedingLogs: FeedingLog[];
  schedules: Schedule[];
  notifications: Notification[];
  households: any[];
  currentUser: CurrentUser | null;
  isLoading: boolean;
  error: string | null;
}

// Estado inicial
const initialState: GlobalState = {
  cats: [],
  feedingLogs: [],
  schedules: [],
  notifications: [],
  households: [],
  currentUser: null,
  isLoading: false,
  error: null,
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
    case "SET_CATS":
      return {
        ...state,
        cats: action.payload,
      };
    case "ADD_CAT":
      return {
        ...state,
        cats: [...state.cats, action.payload],
      };
    case "UPDATE_CAT":
      return {
        ...state,
        cats: state.cats.map((cat) =>
          cat.id === action.payload.id ? action.payload : cat
        ),
      };
    case "DELETE_CAT":
      return {
        ...state,
        cats: state.cats.filter((cat) => cat.id !== action.payload),
      };
    case "SET_FEEDING_LOGS":
      return {
        ...state,
        feedingLogs: action.payload,
      };
    case "ADD_FEEDING_LOG":
      return {
        ...state,
        feedingLogs: [...state.feedingLogs, action.payload],
      };
    case "DELETE_FEEDING_LOG":
      return {
        ...state,
        feedingLogs: state.feedingLogs.filter((log) => log.id !== action.payload),
      };
    case "UPDATE_FEEDING_LOG":
      return {
        ...state,
        feedingLogs: state.feedingLogs.map((log) =>
          log.id === action.payload.id ? action.payload : log
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
          schedule.id === action.payload.id ? action.payload : schedule
        ),
      };
    case "DELETE_SCHEDULE":
      return {
        ...state,
        schedules: state.schedules.filter((schedule) => schedule.id !== action.payload),
      };
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case "REMOVE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter((notification) => notification.id !== action.payload),
      };
    case "ADD_HOUSEHOLD":
      return {
        ...state,
        households: [...state.households, action.payload],
      };
    case "SET_HOUSEHOLDS":
      return {
        ...state,
        households: action.payload,
      };
    case "UPDATE_HOUSEHOLD":
      return {
        ...state,
        households: state.households.map((household) =>
          household.id === action.payload.id ? action.payload : household
        ),
      };
    case "DELETE_HOUSEHOLD":
      return {
        ...state,
        households: state.households.filter((household) => household.id !== action.payload),
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
    case "SET_CURRENT_USER":
      return {
        ...state,
        currentUser: action.payload,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
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