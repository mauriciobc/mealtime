import type { NotificationType } from "@/lib/types/notification";

export interface LogEntry {
  timestamp: Date;
  type: NotificationType;
  title: string;
  message: string;
  status: "success" | "error" | "info";
  details?: {
    payload?: unknown;
    response?: unknown;
    error?: unknown;
    context?: unknown;
    errorObject?: unknown;
  };
}

export type ScheduleForm = {
  type: string;
  title: string;
  message: string;
  deliverAt: string;
  catId: string;
};

export type TestNotificationsState = {
  isLoading: boolean;
  logs: LogEntry[];
  intervalMinutes: number;
  intervalSeconds: number;
  selectedCatId: string;
  form: ScheduleForm;
  isScheduling: boolean;
};

export type TestNotificationsAction =
  | { type: "SET_LOADING"; value: boolean }
  | { type: "ADD_LOG"; log: LogEntry }
  | { type: "SET_INTERVAL_MINUTES"; value: number }
  | { type: "SET_INTERVAL_SECONDS"; value: number }
  | { type: "SET_SELECTED_CAT"; value: string }
  | { type: "SET_FORM"; form: ScheduleForm }
  | { type: "PATCH_FORM"; field: keyof ScheduleForm; value: string }
  | { type: "RESET_FORM" }
  | { type: "SET_SCHEDULING"; value: boolean };

export const initialScheduleForm: ScheduleForm = {
  type: "",
  title: "",
  message: "",
  deliverAt: "",
  catId: "",
};

export function testNotificationsReducer(
  state: TestNotificationsState,
  action: TestNotificationsAction
): TestNotificationsState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.value };
    case "ADD_LOG":
      return { ...state, logs: [action.log, ...state.logs] };
    case "SET_INTERVAL_MINUTES":
      return { ...state, intervalMinutes: action.value };
    case "SET_INTERVAL_SECONDS":
      return { ...state, intervalSeconds: action.value };
    case "SET_SELECTED_CAT":
      return { ...state, selectedCatId: action.value };
    case "SET_FORM":
      return { ...state, form: action.form };
    case "PATCH_FORM":
      return { ...state, form: { ...state.form, [action.field]: action.value } };
    case "RESET_FORM":
      return { ...state, form: initialScheduleForm };
    case "SET_SCHEDULING":
      return { ...state, isScheduling: action.value };
    default:
      return state;
  }
}
