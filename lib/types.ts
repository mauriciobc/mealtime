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

export interface Household {
  id: number;
  name: string;
  inviteCode: string;
  members: {
    userId: number;
    role: 'Admin' | 'Member'; // Role-based access
    joinedAt: Date;
  }[];
  cats: number[]; // IDs of cats
  catGroups: CatGroup[];
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
  birthdate?: Date;
  weight?: number;
  breed?: string;
  photoUrl?: string;
  restrictions?: string;
  householdId?: number;
  createdAt?: Date;
  feedingLogs?: FeedingLog[];
  schedules?: Schedule[];
  feeding_interval: number; // Intervalo padrão de alimentação em horas
}

// Feeding Logs
export interface FeedingLog {
  id: number;
  catId: number;
  userId: number;
  timestamp: Date;
  portionSize?: number | null;
  notes?: string | null;
  createdAt?: Date;
  cat?: CatType;
  user?: User;
}

// Notifications
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: "feeding" | "reminder" | "system";
  icon?: string;
  timestamp: Date;
  createdAt: Date;
  isRead: boolean;
  data?: {
    scheduleId?: number;
    catId?: number;
    userId?: number;
    [key: string]: any;
  };
}

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
  onMarkAsFed: (amount?: string, notes?: string) => Promise<FeedingLog | undefined>;
}

export interface FeedingHistoryProps {
  logs: FeedingLog[];
  onMarkAsFed?: () => void;
}
