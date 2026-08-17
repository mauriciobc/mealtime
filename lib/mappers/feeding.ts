import type { FeedingLog } from '@/lib/types';

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function mapApiFeeding(meal: Record<string, unknown>): FeedingLog {
  const amount = asNumber(meal.amount);
  const feeder =
    meal.feeder && typeof meal.feeder === 'object'
      ? (meal.feeder as Record<string, unknown>)
      : null;

  return {
    id: String(meal.id),
    catId: String(meal.cat_id ?? meal.catId ?? ''),
    userId: String(meal.fed_by ?? meal.userId ?? ''),
    timestamp: new Date(String(meal.fed_at ?? meal.timestamp)),
    amount,
    portionSize: amount,
    notes: (meal.notes as string | null) ?? null,
    mealType: meal.meal_type as FeedingLog['mealType'],
    householdId: meal.household_id != null ? String(meal.household_id) : undefined,
    user: {
      id: String(meal.fed_by ?? feeder?.id ?? ''),
      name: (feeder?.full_name as string | null) ?? null,
      avatar: (feeder?.avatar_url as string | null) ?? null,
    },
  };
}
