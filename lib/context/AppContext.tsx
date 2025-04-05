"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
// Remove Notification import if no longer needed directly here
// import { Notification } from '../types/notification'; 
import { BaseCat, BaseFeedingLog, BaseUser, ID } from '@/lib/types/common'; // Keep BaseUser if needed for other parts, or remove if not
import { Household, FeedingLog } from '@/lib/types';

// Define state type
interface AppState {
  cats: BaseCat[];
  feedingLogs: FeedingLog[];
  households: Household[];
  // Removed: users: BaseUser[]; 
  // Removed: notifications: Notification[];
  // Removed: currentUser: BaseUser | null;
  error: string | null; // Keep general error or move if specific context errors are preferred
}

// Define action types
type AppAction =
  | { type: "SET_CATS"; payload: BaseCat[] }
  | { type: "ADD_CAT"; payload: BaseCat }
  | { type: "UPDATE_CAT"; payload: BaseCat }
  | { type: "DELETE_CAT"; payload: ID }
  | { type: "SET_FEEDING_LOGS"; payload: FeedingLog[] }
  | { type: "ADD_FEEDING_LOG"; payload: FeedingLog }
  | { type: "UPDATE_FEEDING_LOG"; payload: FeedingLog }
  | { type: "DELETE_FEEDING_LOG"; payload: ID }
  | { type: "SET_HOUSEHOLDS"; payload: Household[] }
  | { type: "UPDATE_HOUSEHOLD"; payload: Household }
  | { type: "REMOVE_HOUSEHOLD_MEMBER"; payload: { householdId: string; memberId: string } }
  | { type: "UPDATE_HOUSEHOLD_MEMBER"; payload: { householdId: string; member: HouseholdMember } }
  // Removed: | { type: "SET_USERS"; payload: BaseUser[] }
  // Removed: | { type: "SET_CURRENT_USER"; payload: BaseUser | null }
  | { type: "SET_ERROR"; payload: string | null };
  // Removed notification actions:
  // | { type: "SET_NOTIFICATIONS"; payload: Notification[] }
  // | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  // | { type: "MARK_NOTIFICATION_READ"; payload: { id: ID } }
  // | { type: "REMOVE_NOTIFICATION"; payload: { id: ID } }
  // | { type: "ADD_NOTIFICATION"; payload: Notification };

// Initial state
const initialState: AppState = {
  cats: [],
  feedingLogs: [],
  households: [],
  // Removed: users: [],
  // Removed: notifications: [],
  // Removed: currentUser: null,
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
    case "REMOVE_HOUSEHOLD_MEMBER":
      return {
        ...state,
        households: state.households.map(household => {
          if (String(household.id) === action.payload.householdId) {
            return {
              ...household,
              members: household.members?.filter(
                member => String(member.userId) !== action.payload.memberId
              ) || []
            };
          }
          return household;
        })
      };
    case "UPDATE_HOUSEHOLD_MEMBER":
      return {
        ...state,
        households: state.households.map(household => {
          if (String(household.id) === action.payload.householdId) {
            return {
              ...household,
              members: household.members?.map(member =>
                String(member.userId) === String(action.payload.member.userId)
                  ? { ...member, ...action.payload.member }
                  : member
              ) || []
            };
          }
          return household;
        })
      };
    // Removed: SET_USERS case
    // case "SET_USERS":
    //   return { ...state, users: action.payload };
    // Removed: SET_CURRENT_USER case
    // case "SET_CURRENT_USER":
    //   return { ...state, currentUser: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    // Removed Notification cases
    // case "SET_NOTIFICATIONS":
    //   return { ...state, notifications: action.payload };
    // case "MARK_ALL_NOTIFICATIONS_READ":
    //   // ... removed logic ...
    // case "MARK_NOTIFICATION_READ":
    //   // ... removed logic ...
    // case "REMOVE_NOTIFICATION":
    //   // ... removed logic ...
    // case "ADD_NOTIFICATION":
    //   // ... removed logic ...
    default:
      // Ensure exhaustive check if using TypeScript, or just return state
      // const exhaustiveCheck: never = action; // Uncomment for exhaustive check
      return state;
  }
};

// Create context
// Keep the context structure, but the state type is now simpler
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined); // Use undefined for better checking in hook

// Create hook to use context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) { // Check against undefined
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

// Create provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Save to localStorage when relevant state changes
  useEffect(() => {
    // Only save if we have data for these specific slices
    if (state.cats.length === 0 && state.feedingLogs.length === 0 && state.households.length === 0) {
        return;
    }
    
    // Debounce the localStorage updates
    const timeoutId = setTimeout(() => {
      // Only save non-empty data to localStorage
      if (state.cats.length > 0) {
        localStorage.setItem("cats", JSON.stringify(state.cats));
      } else {
        localStorage.removeItem("cats"); // Optional: remove if empty
      }
      if (state.feedingLogs.length > 0) {
        localStorage.setItem("feedingLogs", JSON.stringify(state.feedingLogs));
      } else {
        localStorage.removeItem("feedingLogs"); // Optional: remove if empty
      }
      if (state.households.length > 0) {
        localStorage.setItem("households", JSON.stringify(state.households));
      } else {
         localStorage.removeItem("households"); // Optional: remove if empty
      }
      // Removed saving users
      // if (state.users.length > 0) {
      //   localStorage.setItem("users", JSON.stringify(state.users));
      // } else {
      //   localStorage.removeItem("users");
      // }
      // Removed saving notifications
      // if (state.notifications.length > 0) {
      //   localStorage.setItem("notifications", JSON.stringify(state.notifications));
      // }

    }, 1000); // 1 second debounce

    // Specify dependencies accurately. Only re-run if these specific parts of state change.
    return () => clearTimeout(timeoutId);
  }, [state.cats, state.feedingLogs, state.households]); // Update dependencies

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
