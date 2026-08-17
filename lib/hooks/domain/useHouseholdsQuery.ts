import { useQuery } from '@tanstack/react-query';
import { v2Get } from '@/lib/api/v2-client';
import { Household } from '@/lib/types';
import { domainKeys } from './query-keys';

export function useHouseholdsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: domainKeys.households(userId),
    queryFn: () => v2Get<Household[]>('/api/v2/households'),
    enabled: !!userId,
  });
}
