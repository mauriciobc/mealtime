import type { CatType, Schedule } from '@/lib/types';

export function mapApiSchedule(raw: Record<string, unknown>): Schedule {
  const householdId = raw.household_id != null ? String(raw.household_id) : '';
  const catRaw =
    raw.cat && typeof raw.cat === 'object' ? (raw.cat as Record<string, unknown>) : null;

  const cat: CatType | undefined = catRaw
    ? {
        id: String(catRaw.id),
        name: String(catRaw.name ?? ''),
        birthdate: undefined,
        weight: null,
        householdId,
        photo_url: null,
        restrictions: null,
        notes: null,
        feeding_interval: null,
        portion_size: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      }
    : undefined;

  return {
    id: String(raw.id),
    catId: String(raw.cat_id ?? raw.catId ?? ''),
    userId: String(raw.user_id ?? raw.userId ?? ''),
    type: raw.type as Schedule['type'],
    interval: raw.interval != null ? Number(raw.interval) : undefined,
    times: Array.isArray(raw.times) ? (raw.times as string[]) : [],
    days: Array.isArray(raw.days) ? (raw.days as string[]) : [],
    enabled: Boolean(raw.enabled),
    createdAt: raw.created_at ? new Date(String(raw.created_at)) : new Date(),
    cat,
  } as unknown as Schedule;
}
