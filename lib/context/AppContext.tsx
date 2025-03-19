"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { Cat, FeedingLog, Household, User, Notification } from '../types';
import { mockCats, mockFeedingLogs, mockHouseholds, mockUsers } from '../data';
import { mockNotifications } from '../data/mockNotifications';

// Define state type
interface AppState {
  cats: Cat[];
  feedingLogs: FeedingLog[];
  households: Household[];
  users: User[];
  notifications: Notification[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
}

// Define action types
type AppAction =
  | { type: "SET_CATS"; payload: Cat[] }
  | { type: "ADD_CAT"; payload: Cat }
  | { type: "UPDATE_CAT"; payload: Cat }
  | { type: "DELETE_CAT"; payload: string }
  | { type: "SET_FEEDING_LOGS"; payload: FeedingLog[] }
  | { type: "ADD_FEEDING_LOG"; payload: FeedingLog }
  | { type: "UPDATE_FEEDING_LOG"; payload: FeedingLog }
  | { type: "DELETE_FEEDING_LOG"; payload: string }
  | { type: "SET_HOUSEHOLDS"; payload: Household[] }
  | { type: "UPDATE_HOUSEHOLD"; payload: Household }
  | { type: "SET_USERS"; payload: User[] }
  | { type: "SET_CURRENT_USER"; payload: User | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_NOTIFICATIONS"; payload: Notification[] }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "MARK_NOTIFICATION_READ"; payload: { id: string } }
  | { type: "REMOVE_NOTIFICATION"; payload: { id: string } }
  | { type: "ADD_NOTIFICATION"; payload: Notification };

// Initial state
const initialState: AppState = {
  cats: [],
  feedingLogs: [],
  households: [],
  users: [],
  notifications: [],
  currentUser: null,
  isLoading: false,
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
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
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
  dispatch: React.Dispatch<AppAction> | null;
}>({
  state: initialState,
  dispatch: null
});

// Create provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data from localStorage on mount or use initial data
  useEffect(() => {
    const loadData = () => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        
        // Verificar se localStorage está disponível
        if (typeof window === 'undefined') {
          throw new Error("localStorage não está disponível");
        }

        // Função auxiliar para carregar e validar dados
        const loadAndValidateData = <T>(key: string, mockData: T[]): T[] => {
          try {
            const stored = localStorage.getItem(key);
            if (!stored) return mockData;
            
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) {
              throw new Error(`Dados inválidos para ${key}`);
            }
            return parsed;
          } catch (error) {
            console.error(`Erro ao carregar ${key}:`, error);
            localStorage.removeItem(key);
            return mockData;
          }
        };
        
        // Carregar dados com validação
        const cats = loadAndValidateData("cats", mockCats);
        const logs = loadAndValidateData("feedingLogs", mockFeedingLogs);
        const households = loadAndValidateData("households", mockHouseholds);
        const users = loadAndValidateData("users", mockUsers);
        const notifications = loadAndValidateData("notifications", mockNotifications);
        
        // Validar dados mockados antes de usar
        if (!Array.isArray(mockCats) || !Array.isArray(mockFeedingLogs) || 
            !Array.isArray(mockHouseholds) || !Array.isArray(mockUsers) || 
            !Array.isArray(mockNotifications)) {
          throw new Error("Dados mockados inválidos");
        }
        
        dispatch({ type: "SET_CATS", payload: cats });
        dispatch({ type: "SET_FEEDING_LOGS", payload: logs });
        dispatch({ type: "SET_HOUSEHOLDS", payload: households });
        dispatch({ type: "SET_USERS", payload: users });
        dispatch({ type: "SET_NOTIFICATIONS", payload: notifications });
        
        // Carregar usuário atual com validação
        const storedCurrentUser = localStorage.getItem("currentUser");
        if (storedCurrentUser) {
          try {
            const parsedUser = JSON.parse(storedCurrentUser);
            if (typeof parsedUser === 'object' && parsedUser !== null) {
              dispatch({ type: "SET_CURRENT_USER", payload: parsedUser });
            } else {
              throw new Error("Dados do usuário atual inválidos");
            }
          } catch (error) {
            console.error("Erro ao carregar usuário atual:", error);
            localStorage.removeItem("currentUser");
            if (mockUsers.length > 0) {
              dispatch({ type: "SET_CURRENT_USER", payload: mockUsers[0] });
            }
          }
        } else if (mockUsers.length > 0) {
          dispatch({ type: "SET_CURRENT_USER", payload: mockUsers[0] });
        }
        
        dispatch({ type: "SET_LOADING", payload: false });
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        dispatch({ type: "SET_ERROR", payload: "Falha ao carregar dados. Por favor, recarregue a página." });
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    loadData();

    // Cleanup function
    return () => {
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({ type: "SET_ERROR", payload: null });
    };
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    // Skip saving if we have no data or still loading
    if (state.isLoading || (state.cats.length === 0 && state.feedingLogs.length === 0)) {
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
    if (state.currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(state.currentUser));
      needsUpdate = true;
    }

    // For debugging
    if (needsUpdate) {
      console.log("Data saved to localStorage");
    }
  }, [state.cats, state.feedingLogs, state.households, state.users, state.notifications, state.currentUser, state.isLoading]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Create hook for using the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
