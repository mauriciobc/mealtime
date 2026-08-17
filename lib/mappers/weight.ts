import type { WeightGoalRecord, WeightLogRecord } from '@/lib/hooks/domain/useWeightDataQuery';

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  return parseFloat(String(value));
}

export function mapApiWeightLog(log: Record<string, unknown>): WeightLogRecord {
  return {
    id: String(log.id),
    catId: String(log.cat_id ?? log.catId ?? ''),
    weight: asNumber(log.weight),
    date: new Date(String(log.date)),
    notes: (log.notes as string | undefined) ?? undefined,
    measuredBy: log.measured_by != null ? String(log.measured_by) : undefined,
    createdAt: new Date(String(log.created_at ?? log.createdAt)),
    updatedAt: new Date(String(log.updated_at ?? log.updatedAt)),
  };
}

export function mapApiWeightGoal(goal: Record<string, unknown>): WeightGoalRecord {
  return {
    id: String(goal.id),
    catId: String(goal.cat_id ?? goal.catId ?? ''),
    targetWeight: asNumber(goal.target_weight ?? goal.targetWeight),
    targetDate: goal.target_date ? new Date(String(goal.target_date)) : undefined,
    startWeight:
      goal.start_weight != null ? asNumber(goal.start_weight) : undefined,
    status: goal.status as WeightGoalRecord['status'],
    notes: (goal.notes as string | undefined) ?? undefined,
    createdBy: String(goal.created_by ?? goal.createdBy ?? ''),
    createdAt: new Date(String(goal.created_at ?? goal.createdAt)),
    updatedAt: new Date(String(goal.updated_at ?? goal.updatedAt)),
  };
}
