import { useQuery } from '@tanstack/react-query';
import { v2Get } from '@/lib/api/v2-client';
import { mapApiFeeding } from '@/lib/mappers/feeding';
import { FeedingLog } from '@/lib/types';
import { domainKeys } from './query-keys';

export async function fetchFeedingsForHousehold(
  householdId: string,
  _userId?: string
): Promise<FeedingLog[]> {
  const raw = await v2Get<unknown[]>(`/api/v2/feedings?householdId=${householdId}`);
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((meal) => mapApiFeeding(meal as Record<string, unknown>))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function useFeedingsQuery(householdId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: domainKeys.feedings(householdId),
    queryFn: () => fetchFeedingsForHousehold(householdId!, userId),
    enabled: !!householdId,
  });
}
