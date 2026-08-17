import { useQuery } from '@tanstack/react-query';
import { v2Get } from '@/lib/api/v2-client';
import { mapApiSchedule } from '@/lib/mappers/schedule';
import { Schedule } from '@/lib/types';
import { domainKeys } from './query-keys';

export async function fetchSchedulesForHousehold(
  householdId: string,
  _userId?: string
): Promise<Schedule[]> {
  const raw = await v2Get<unknown[]>(`/api/v2/schedules?householdId=${householdId}`);
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((s) => mapApiSchedule(s as Record<string, unknown>));
}

export function useSchedulesQuery(householdId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: domainKeys.schedules(householdId),
    queryFn: () => fetchSchedulesForHousehold(householdId!, userId),
    enabled: !!householdId,
  });
}
