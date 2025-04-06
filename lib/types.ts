import { BaseCat } from "./types/common";

// User & Household
export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  households: string[]; // IDs of households
  primaryHousehold: string; // ID of primary household
  preferences: {
    timezone: string;
    language: string; // en-US, pt-BR, es-ES
    notifications: NotificationSettings;
  };
  role: 'admin' | 'user';
  imageUrl?: string;
}

// Define HouseholdMember explicitly
export interface HouseholdMember {
  id?: number;
  userId: number;
  role: 'Admin' | 'Member';
  joinedAt: Date;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface Household {
  id: number;
  name: string;
  inviteCode: string;
  members: HouseholdMember[];
  cats: number[];
  catGroups: CatGroup[];
  createdAt: Date;
  owner?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CatGroup {
  id: number;
  name: string;
  catIds: number[];
}

// Cat Profiles
export interface CatType {
  id: number;
  name: string;
  photoUrl?: string;
  birthdate?: Date;
  weight?: number;
  feedingInterval: number;
  restrictions?: string;
  portion_size?: number;
  notes?: string;
  householdId: number;
  createdAt?: Date;
  updatedAt?: Date;
  schedules?: Schedule[];
}

// Feeding Logs
export interface FeedingLog {
  id: number;
  catId: number;
  userId: number;
  timestamp: Date;
  portionSize?: number;
  notes?: string;
  createdAt: Date;
  status?: "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro";
  cat?: CatType;
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    householdId: number | null;
    preferences: {
      timezone: string;
      language: string;
      notifications: {
        pushEnabled: boolean;
        emailEnabled: boolean;
        feedingReminders: boolean;
        missedFeedingAlerts: boolean;
        householdUpdates: boolean;
      };
    };
    role: 'admin' | 'user';
  };
}

// Notifications
export type { Notification, NotificationType, CreateNotificationPayload } from './types/notification';

export interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  feedingReminders: boolean;
  missedFeedingAlerts: boolean;
  householdUpdates: boolean;
}

// Store the current cat data structure for compatibility
export interface LegacyCatProfile {
  id: number;
  name: string;
  avatar: string;
  regularAmount: string;
  foodUnit: string;
  feedingInterval: number;
  lastFed: string;
  feedingHistory: {
    time: string;
    amount: string;
  }[];
}

export interface Schedule {
  id: number;
  catId: number;
  userId: number;
  type: 'interval' | 'fixedTime';
  interval?: number; // Hours between feedings
  times?: string; // Specific times (e.g., "08:00")
  days: string[];
  enabled: boolean;
  status?: "pending" | "completed" | "missed";
  createdAt?: Date;
  cat?: CatType;
  user?: User;
}

export interface StatisticsData {
  totalFeedings: number;
  averagePortionSize: number;
  maxConsecutiveDays: number;
  missedSchedules: number;
  timeSeriesData: TimeSeriesDataPoint[];
  catPortionData: CatPortion[];
  timeDistributionData: TimeSeriesDataPoint[];
}

export interface TimeSeriesDataPoint {
  name: string;
  valor: number;
}

export interface CatPortion {
  name: string;
  value: number;
}

export interface FeedingFormProps {
  catId: number;
  onMarkAsFed: (amount?: string, notes?: string, timestamp?: Date) => Promise<FeedingLog | undefined>;
}

export interface FeedingHistoryProps {
  logs: FeedingLog[];
  onMarkAsFed?: () => void;
}
