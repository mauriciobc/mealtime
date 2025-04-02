/**
 * Tipo base para IDs numéricos em toda a aplicação
 */
export type ID = number;

/**
 * Interface base para usuários do sistema
 */
export interface BaseUser {
  id: ID;
  name: string;
  email: string;
  avatar?: string;
  householdId: number | null;
  household?: {
    id: number;
    name: string;
  } | null;
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
}

/**
 * Interface base para gatos cadastrados no sistema
 */
export interface BaseCat {
  id: ID;
  name: string;
  photoUrl?: string;
  birthdate?: Date;
  weight?: number;
  restrictions?: string;
  notes?: string;
  householdId: ID;
  feedingInterval: number;
  portion_size?: number;
}

/**
 * Interface base para registros de alimentação
 */
export interface BaseFeedingLog {
  id: ID;
  catId: ID;
  userId: ID;
  timestamp: Date;
  portionSize?: number;
  notes?: string;
  status?: "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro";
  createdAt: Date;
}

/**
 * Interface base para famílias/grupos de usuários
 */
export interface BaseHousehold {
  id: number;
  name: string;
  ownerId: number;
} 