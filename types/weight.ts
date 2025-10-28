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

