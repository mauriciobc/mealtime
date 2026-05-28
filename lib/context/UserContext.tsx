"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { UserContextValue } from "./user-context-state";
import { useUserProvider } from "./use-user-provider";

const UserContext = createContext<UserContextValue | undefined>(undefined);
export { UserContext };

export function UserProvider({ children }: { children: ReactNode }) {
  const value = useUserProvider();
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
