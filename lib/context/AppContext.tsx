"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { Notification } from '../types/notification';
import { BaseCat, BaseFeedingLog, BaseUser, ID } from '@/lib/types/common';
import { Household } from '@/lib/types';

// Define state type
interface AppState {
  cats: BaseCat[];
  feedingLogs: BaseFeedingLog[];
  households: Household[];
  users: BaseUser[];
  notifications: Notification[];
  currentUser: BaseUser | null;
  error: string | null;
}

// Define action types
type AppAction =
  | { type: "SET_CATS"; payload: BaseCat[] }
  | { type: "ADD_CAT"; payload: BaseCat }
  | { type: "UPDATE_CAT"; payload: BaseCat }
  | { type: "DELETE_CAT"; payload: ID }
  | { type: "SET_FEEDING_LOGS"; payload: BaseFeedingLog[] }
  | { type: "ADD_FEEDING_LOG"; payload: BaseFeedingLog }
  | { type: "UPDATE_FEEDING_LOG"; payload: BaseFeedingLog }
  | { type: "DELETE_FEEDING_LOG"; payload: ID }
  | { type: "SET_HOUSEHOLDS"; payload: Household[] }
  | { type: "UPDATE_HOUSEHOLD"; payload: Household }
  | { type: "SET_USERS"; payload: BaseUser[] }
  | { type: "SET_CURRENT_USER"; payload: BaseUser | null }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_NOTIFICATIONS"; payload: Notification[] }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "MARK_NOTIFICATION_READ"; payload: { id: ID } }
  | { type: "REMOVE_NOTIFICATION"; payload: { id: ID } }
  | { type: "ADD_NOTIFICATION"; payload: Notification };

// Initial state
const initialState: AppState = {
  cats: [],
  feedingLogs: [],
  households: [],
  users: [],
  notifications: [],
  currentUser: null,
  error: null,
};

// Create reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "SET_CATS":
      return { ...state, cats: action.payload };
    case "ADD_CAT":
      return { ...state, cats: [...state.cats, action.payload] };
    case "UPDATE_CAT":
      return {
        ...state,
        cats: state.cats.map(cat => 
          cat.id === action.payload.id ? action.payload : cat
        ),
      };
    case "DELETE_CAT":
      return {
        ...state,
        cats: state.cats.filter(cat => cat.id !== action.payload),
      };
    case "SET_FEEDING_LOGS":
      return { ...state, feedingLogs: action.payload };
    case "ADD_FEEDING_LOG":
      return {
        ...state,
        feedingLogs: [...state.feedingLogs, action.payload],
      };
    case "UPDATE_FEEDING_LOG":
      return {
        ...state,
        feedingLogs: state.feedingLogs.map(log =>
          log.id === action.payload.id ? action.payload : log
        ),
      };
    case "DELETE_FEEDING_LOG":
      return {
        ...state,
        feedingLogs: state.feedingLogs.filter(log => log.id !== action.payload),
      };
    case "SET_HOUSEHOLDS":
      return { ...state, households: action.payload };
    case "UPDATE_HOUSEHOLD":
      return {
        ...state,
        households: state.households.map(household => 
          household.id === action.payload.id ? action.payload : household
        ),
      };
    case "SET_USERS":
      return { ...state, users: action.payload };
    case "SET_CURRENT_USER":
      return { ...state, currentUser: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_NOTIFICATIONS":
      return { ...state, notifications: action.payload };
    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          isRead: true
        })),
      };
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.id
            ? { ...notification, isRead: true }
            : notification
        ),
      };
    case "REMOVE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload.id
        ),
      };
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    default:
      return state;
  }
};

// Create context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({
  state: initialState,
  dispatch: () => null
});

// Create hook to use context
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

// Create provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Save to localStorage when state changes
  useEffect(() => {
    // Skip saving if we have no data
    if (state.cats.length === 0 && state.feedingLogs.length === 0) {
      return;
    }

    // Use this flag to prevent unnecessary updates
    let needsUpdate = false;

    // Only save non-empty data to localStorage
    if (state.cats.length > 0) {
      localStorage.setItem("cats", JSON.stringify(state.cats));
      needsUpdate = true;
    }
    if (state.feedingLogs.length > 0) {
      localStorage.setItem("feedingLogs", JSON.stringify(state.feedingLogs));
      needsUpdate = true;
    }
    if (state.households.length > 0) {
      localStorage.setItem("households", JSON.stringify(state.households));
      needsUpdate = true;
    }
    if (state.users.length > 0) {
      localStorage.setItem("users", JSON.stringify(state.users));
      needsUpdate = true;
    }
    if (state.notifications.length > 0) {
      localStorage.setItem("notifications", JSON.stringify(state.notifications));
      needsUpdate = true;
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
