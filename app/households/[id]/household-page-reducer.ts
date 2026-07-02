import type { CatType, Household, HouseholdMember } from "@/lib/types";

export const formatMemberRole = (role?: string) => {
  if (!role) return "Membro";
  return role.toLowerCase() === "admin" ? "Administrador" : "Membro";
};

export type HouseholdPageLocalState = {
  household: Household | null | undefined;
  cats: CatType[];
  activeTab: string;
  memberToRemove: HouseholdMember | null;
  memberToPromote: HouseholdMember | null;
  memberToDemote: HouseholdMember | null;
  catToDelete: CatType | null;
  showLeaveDialog: boolean;
  showDeleteHouseholdDialog: boolean;
  isProcessing: boolean;
};

export type HouseholdPageLocalAction =
  | { type: "SYNC_HOUSEHOLD_DATA"; household: Household | null; cats: CatType[] }
  | { type: "LOAD_ERROR" }
  | { type: "SET_ACTIVE_TAB"; value: string }
  | { type: "SET_MEMBER_TO_REMOVE"; value: HouseholdMember | null }
  | { type: "SET_MEMBER_TO_PROMOTE"; value: HouseholdMember | null }
  | { type: "SET_MEMBER_TO_DEMOTE"; value: HouseholdMember | null }
  | { type: "SET_CAT_TO_DELETE"; value: CatType | null }
  | { type: "SET_SHOW_LEAVE_DIALOG"; value: boolean }
  | { type: "SET_SHOW_DELETE_HOUSEHOLD_DIALOG"; value: boolean }
  | { type: "SET_PROCESSING"; value: boolean }
  | { type: "REMOVE_CAT"; catId: string }
  | { type: "CLEAR_MEMBER_DIALOGS" };

export const initialHouseholdPageState: HouseholdPageLocalState = {
  household: undefined,
  cats: [],
  activeTab: "members",
  memberToRemove: null,
  memberToPromote: null,
  memberToDemote: null,
  catToDelete: null,
  showLeaveDialog: false,
  showDeleteHouseholdDialog: false,
  isProcessing: false,
};

export function householdPageReducer(
  state: HouseholdPageLocalState,
  action: HouseholdPageLocalAction
): HouseholdPageLocalState {
  switch (action.type) {
    case "SYNC_HOUSEHOLD_DATA":
      return { ...state, household: action.household, cats: action.cats };
    case "LOAD_ERROR":
      return { ...state, household: null, cats: [] };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.value };
    case "SET_MEMBER_TO_REMOVE":
      return { ...state, memberToRemove: action.value };
    case "SET_MEMBER_TO_PROMOTE":
      return { ...state, memberToPromote: action.value };
    case "SET_MEMBER_TO_DEMOTE":
      return { ...state, memberToDemote: action.value };
    case "SET_CAT_TO_DELETE":
      return { ...state, catToDelete: action.value };
    case "SET_SHOW_LEAVE_DIALOG":
      return { ...state, showLeaveDialog: action.value };
    case "SET_SHOW_DELETE_HOUSEHOLD_DIALOG":
      return { ...state, showDeleteHouseholdDialog: action.value };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.value };
    case "REMOVE_CAT":
      return {
        ...state,
        cats: state.cats.filter((cat) => cat.id !== action.catId),
        catToDelete: null,
      };
    case "CLEAR_MEMBER_DIALOGS":
      return { ...state, memberToRemove: null, memberToPromote: null, memberToDemote: null };
    default:
      return state;
  }
}
