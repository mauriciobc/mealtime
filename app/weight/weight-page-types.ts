"use client";

import { WeightLogFormValues } from '@/components/weight/quick-log-panel';

// Interface for Cat - matches expected API structure from /api/cats
export interface Cat {
  id: string;
  name: string;
  photo_url?: string | null;
  weight?: number;
  targetWeight?: number;
  healthTip?: string;
  activeGoalId?: string | null;
  birthdate?: string | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface for WeightGoalWithMilestones - matches expected API structure from /api/goals
export interface WeightGoalWithMilestones {
  id: string;
  cat_id: string;
  goal_name: string;
  start_date: string;
  target_date: string;
  initial_weight: number;
  target_weight: number;
  unit: 'kg' | 'lbs';
  milestones: Milestone[];
  description?: string;
  isArchived?: boolean;
  achieved_date?: string | null;
  outcome_notes?: string;
}

// Interface for Milestone
export interface Milestone {
  id: string;
  name: string;
  target_weight: number;
  target_date: string;
  description?: string;
  goal_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface for WeightLog - matches API structure from /api/weight-logs
export interface WeightLog {
  id: string;
  cat_id: string;
  date: string;
  weight: number;
  notes?: string;
  measured_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Define a type for the data used specifically when editing a log
// It combines form values with a mandatory ID.
export type LogForEditing = WeightLogFormValues & { id: string };

// Interface para compatibilidade com o componente MilestoneProgress
export interface WeightLogEntry {
  id: string;
  catId: string;
  weight: number;
  date: string;
  notes?: string;
  measuredBy?: string;
}

export type WeightPageState =
  | { type: 'LOADING' }
  | { type: 'ERROR'; error: string }
  | { type: 'NO_USER' }
  | { type: 'NO_HOUSEHOLD' }
  | { type: 'NO_CATS' }
  | { type: 'NO_SELECTED_CAT' }
  | { type: 'READY' };