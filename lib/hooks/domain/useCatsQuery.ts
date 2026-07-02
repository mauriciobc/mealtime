import { useQuery } from '@tanstack/react-query';
import { fetchCatsForHousehold } from '@/lib/services/apiService';
import { domainKeys } from './query-keys';

export function useCatsQuery(householdId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: domainKeys.cats(householdId),
    queryFn: () => fetchCatsForHousehold(householdId!, userId),
    enabled: !!householdId,
  });
}
