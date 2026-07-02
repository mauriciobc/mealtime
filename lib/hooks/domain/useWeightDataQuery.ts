import { useQuery } from '@tanstack/react-query';
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
  const fetchInit: RequestInit = { credentials: 'include' };

  const catsResponse = await fetch(`/api/v2/households/${householdId}/cats`, fetchInit);
  const catsJson = await catsResponse.json();
  const cats: Array<{ id: string }> = catsJson.data ?? catsJson ?? [];

  if (!catsResponse.ok) {
    throw new Error(`Erro ao carregar gatos (${catsResponse.status})`);
  }

  const logBatches = await Promise.all(
    cats.map(async (cat) => {
      const res = await fetch(`/api/v2/weight-logs?catId=${cat.id}`, fetchInit);
      const body = await res.json();
      return res.ok ? (body.data ?? []) : [];
    })
  );
  const weightLogsData = logBatches.flat();

  const goalsResponse = await fetch('/api/v2/goals', fetchInit);
  let weightGoalsData: any[] = [];
  if (goalsResponse.ok) {
    const goalsJson = await goalsResponse.json();
    weightGoalsData = goalsJson.data ?? goalsJson ?? [];
  }

  const weightLogs: WeightLogRecord[] = weightLogsData
    .map((log: any) => ({
      id: log.id,
      catId: log.cat_id,
      weight: parseFloat(log.weight),
      date: new Date(log.date),
      notes: log.notes,
      measuredBy: log.measured_by,
      createdAt: new Date(log.created_at),
      updatedAt: new Date(log.updated_at),
    }))
    .sort((a: WeightLogRecord, b: WeightLogRecord) => b.date.getTime() - a.date.getTime());

  const weightGoals: WeightGoalRecord[] = weightGoalsData.map((goal: any) => ({
    id: goal.id,
    catId: goal.cat_id,
    targetWeight: parseFloat(goal.target_weight),
    targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
    startWeight: goal.start_weight ? parseFloat(goal.start_weight) : undefined,
    status: goal.status,
    notes: goal.notes,
    createdBy: goal.created_by,
    createdAt: new Date(goal.created_at),
    updatedAt: new Date(goal.updated_at),
  }));

  return { weightLogs, weightGoals };
}

export function useWeightDataQuery(householdId: string | undefined) {
  return useQuery({
    queryKey: domainKeys.weightLogs(householdId),
    queryFn: () => fetchWeightData(householdId!),
    enabled: !!householdId,
  });
}
