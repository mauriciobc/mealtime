export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      cats: {
        Row: {
          id: string
          name: string
          age: number
          breed: string
          weight: number | null
          household_id: string
          created_at: string
          updated_at: string
          gender: string | null
        }
        Insert: {
          id?: string
          name: string
          age: number
          breed: string
          weight?: number | null
          household_id: string
          created_at?: string
          updated_at?: string
          gender?: string | null
        }
        Update: {
          id?: string
          name?: string
          age?: number
          breed?: string
          weight?: number | null
          household_id?: string
          created_at?: string
          updated_at?: string
          gender?: string | null
        }
      }
      cat_weight_logs: {
        Row: {
          id: string
          cat_id: string
          weight: number
          date: string
          notes: string | null
          measured_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cat_id: string
          weight: number
          date: string
          notes?: string | null
          measured_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cat_id?: string
          weight?: number
          date?: string
          notes?: string | null
          measured_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      weight_goals: {
        Row: {
          id: string
          cat_id: string
          target_weight: number
          target_date: string | null
          start_weight: number | null
          status: string
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cat_id: string
          target_weight: number
          target_date?: string | null
          start_weight?: number | null
          status?: string
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cat_id?: string
          target_weight?: number
          target_date?: string | null
          start_weight?: number | null
          status?: string
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      weight_goal_milestones: {
        Row: {
          id: string
          goal_id: string
          weight: number
          date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          weight: number
          date: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          weight?: number
          date?: string
          notes?: string | null
          created_at?: string
        }
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 