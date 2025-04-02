"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { BaseUser } from "@/lib/types/common";

// Define state type
interface UserState {
  currentUser: BaseUser | null;
  error: string | null; // Keep error handling specific to user context if needed
}

// Define action types
type UserAction =
  | { type: "SET_CURRENT_USER"; payload: BaseUser | null }
  | { type: "SET_USER_ERROR"; payload: string | null };

// Initial state
const initialState: UserState = {
  currentUser: null,
  error: null,
};

// Create reducer
const userReducer = (state: UserState, action: UserAction): UserState => {
  console.log("[UserContext] Processing action:", action.type, action.payload);
  
  switch (action.type) {
    case "SET_CURRENT_USER":
      console.log("[UserContext] Setting current user:", action.payload);
      return { ...state, currentUser: action.payload, error: null }; // Clear error on success
    case "SET_USER_ERROR":
      console.log("[UserContext] Setting error:", action.payload);
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

// Create context
const UserContext = createContext<{
  state: UserState;
  dispatch: React.Dispatch<UserAction>;
} | undefined>(undefined);

// Create hook to use context
export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}

// Create provider
export function UserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState);

  console.log("[UserContext] Current state:", state);

  // Potentially load user from storage or API here in a useEffect

  return (
    <UserContext.Provider value={{ state, dispatch }}>
      {children}
    </UserContext.Provider>
  );
} 