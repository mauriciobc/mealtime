import { User as CurrentUserType } from "@/lib/types";

export interface UserState {
  currentUser: CurrentUserType | null;
  isLoading: boolean;
  error: string | null;
}

export const userInitialState: UserState = {
  currentUser: null,
  isLoading: true,
  error: null,
};

export interface UserAction {
  type: "FETCH_START" | "SET_CURRENT_USER" | "FETCH_ERROR" | "CLEAR_USER";
  payload?: CurrentUserType | string | null;
}

export function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "SET_CURRENT_USER":
      return { ...state, isLoading: false, currentUser: action.payload as CurrentUserType | null, error: null };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.payload as string };
    case "CLEAR_USER":
      return { ...userInitialState, isLoading: false };
    default:
      return state;
  }
}

export interface UserContextValue {
  state: UserState;
  profile: CurrentUserType | null;
  authLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  pauseAuthChecks: () => void;
  resumeAuthChecks: () => void;
}
