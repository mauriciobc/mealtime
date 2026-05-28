export interface Milestone {
  id: string;
  name: string;
  target_weight: number;
  target_date: string;
  description?: string;
}

export interface WeightGoalWithMilestones {
  id: string;
  goal_name: string;
  start_date: string;
  target_date: string;
  initial_weight: number;
  target_weight: number;
  unit: "kg" | "lbs";
  milestones: Milestone[];
  description?: string;
}

export interface MilestoneProgressProps {
  activeGoal: WeightGoalWithMilestones | null;
  currentWeight: number | null;
  currentWeightDate?: string | null;
  householdId: string;
  onGoalArchived?: () => void;
}

export type MilestoneStatus = "completed" | "pending" | "overdue" | "upcoming";

export type ProcessedMilestone = Milestone & {
  status: MilestoneStatus;
  isConflicting: boolean;
};

export const getMilestoneStatus = (
  milestone: Milestone,
  currentWeight: number | null,
  goalStartDateStr: string,
  isWeightLossGoal: boolean
): MilestoneStatus => {
  if (currentWeight === null) return "pending";

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const milestoneTargetDate = new Date(milestone.target_date);
  milestoneTargetDate.setHours(0, 0, 0, 0);
  const goalStartDate = new Date(goalStartDateStr);
  goalStartDate.setHours(0, 0, 0, 0);

  if (currentDate < goalStartDate) return "upcoming";

  const isMilestoneAchieved = isWeightLossGoal
    ? currentWeight <= milestone.target_weight
    : currentWeight >= milestone.target_weight;

  if (isMilestoneAchieved) {
    return "completed";
  }

  if (currentDate > milestoneTargetDate) {
    return "overdue";
  }

  return "pending";
};

export const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];

export const STATUS_LABELS: Record<MilestoneStatus, string> = {
  completed: "Concluído",
  pending: "Pendente",
  overdue: "Atrasado",
  upcoming: "Futuro",
};

export const SAFETY_BANNER =
  "Este plano é um guia. Sempre siga a orientação do seu veterinário.";
export const NO_MILESTONES = "Nenhum marco definido para esta meta.";
export const GOAL_PROGRESS = "Progresso da Meta";
export const GOAL_ACHIEVED = "Meta alcançada!";
export const CURRENT_WEIGHT_LABEL = "Peso atual";
export const GOAL_LABEL = "Meta";
export const MILESTONES_LABEL = "Marcos";
export const VET_REMINDER =
  "Lembrete: agende exames clínicos e ajuste o plano com o veterinário.";
export const PLATEAU_ALERT =
  "Platô detectado. Reavalie a dieta com um profissional.";
export const ACCELERATED_LOSS_ALERT =
  "Atenção: perda de peso acelerada! Reduza a meta e consulte o veterinário.";
export const MILESTONE_REACHED = "Parabéns! Você completou:";

export type MilestoneProgressState = {
  newlyCompletedMilestone: Milestone | null;
  isSheetOpen: boolean;
  selectedMilestoneForSheet: Milestone | null;
};

export type MilestoneProgressAction =
  | { type: "SET_NEWLY_COMPLETED"; milestone: Milestone | null }
  | { type: "OPEN_SHEET"; milestone: Milestone }
  | { type: "SET_SHEET_OPEN"; value: boolean };

export const initialMilestoneProgressState: MilestoneProgressState = {
  newlyCompletedMilestone: null,
  isSheetOpen: false,
  selectedMilestoneForSheet: null,
};

export function milestoneProgressReducer(
  state: MilestoneProgressState,
  action: MilestoneProgressAction
): MilestoneProgressState {
  switch (action.type) {
    case "SET_NEWLY_COMPLETED":
      return { ...state, newlyCompletedMilestone: action.milestone };
    case "OPEN_SHEET":
      return { ...state, selectedMilestoneForSheet: action.milestone, isSheetOpen: true };
    case "SET_SHEET_OPEN":
      return {
        ...state,
        isSheetOpen: action.value,
        selectedMilestoneForSheet: action.value ? state.selectedMilestoneForSheet : null,
      };
    default:
      return state;
  }
}
