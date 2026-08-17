import { useQuery } from '@tanstack/react-query';
import { v2Get } from '@/lib/api/v2-client';
import { mapApiWeightGoal, mapApiWeightLog } from '@/lib/mappers/weight';
import { domainKeys } from './query-keys';

export interface WeightLogRecord {
  id: string;
  catId: string;
  weight: number;
  date: Date;
  notes?: string;
  measuredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeightGoalRecord {
  id: string;
  catId: string;
  targetWeight: number;
  targetDate?: Date;
  startWeight?: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeightData {
  weightLogs: WeightLogRecord[];
  weightGoals: WeightGoalRecord[];
}

export async function fetchWeightData(householdId: string): Promise<WeightData> {
  const cats = await v2Get<Array<{ id: string }>>(`/api/v2/households/${householdId}/cats`);
  const catList = Array.isArray(cats) ? cats : [];

  const logBatches = await Promise.all(
    catList.map(async (cat) => {
      try {
        const rows = await v2Get<unknown[]>(`/api/v2/weight-logs?catId=${cat.id}`);
        return Array.isArray(rows) ? rows : [];
      } catch {
        return [];
      }
    })
  );

  let goalsRaw: unknown[] = [];
  try {
    const goals = await v2Get<unknown[]>('/api/v2/goals');
    goalsRaw = Array.isArray(goals) ? goals : [];
  } catch {
    goalsRaw = [];
  }

  const weightLogs = logBatches
    .flat()
    .map((log) => mapApiWeightLog(log as Record<string, unknown>))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const weightGoals = goalsRaw.map((goal) =>
    mapApiWeightGoal(goal as Record<string, unknown>)
  );

  return { weightLogs, weightGoals };
}

export function useWeightDataQuery(householdId: string | undefined) {
  return useQuery({
    queryKey: domainKeys.weightLogs(householdId),
    queryFn: () => fetchWeightData(householdId!),
    enabled: !!householdId,
  });
}
