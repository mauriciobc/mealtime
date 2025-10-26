/**
 * Tipos compartilhados para componentes de alimentação
 */

export interface FeedingLog {
  id: string;
  catId: string;
  amount: number;
  notes: string;
  timestamp: Date;
}

