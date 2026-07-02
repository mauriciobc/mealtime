import { useQuery } from '@tanstack/react-query';
import { Schedule } from '@/lib/types';
import { domainKeys } from './query-keys';

export async function fetchSchedulesForHousehold(
  householdId: string,
  _userId?: string
): Promise<Schedule[]> {
  const response = await fetch(`/api/v2/schedules?householdId=${householdId}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ${response.status}: ${errorText || 'Failed to load schedules'}`);
  }
  const json = await response.json();
  const rawSchedulesData: any[] = Array.isArray(json) ? json : (json.data ?? []);
  return rawSchedulesData.map((s) => ({
    id: String(s.id),
    catId: String(s.cat_id),
    householdId: s.household_id,
    userId: s.user_id,
    type: s.type,
    interval: s.interval,
    times: Array.isArray(s.times) ? s.times : [],
    days: Array.isArray(s.days) ? s.days : [],
    enabled: s.enabled,
    createdAt: s.created_at ? new Date(s.created_at) : new Date(),
    updatedAt: s.updated_at ? new Date(s.updated_at) : undefined,
    cat: s.cat
      ? {
          id: String(s.cat.id),
          name: s.cat.name,
          birthdate: undefined,
          weight: null,
          householdId: s.household_id,
          photo_url: null,
          restrictions: null,
          notes: null,
          feeding_interval: null,
          portion_size: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        }
      : undefined,
  }));
}

export function useSchedulesQuery(householdId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: domainKeys.schedules(householdId),
    queryFn: () => fetchSchedulesForHousehold(householdId!, userId),
    enabled: !!householdId,
  });
}
