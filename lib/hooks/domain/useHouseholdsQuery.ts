import { useQuery } from '@tanstack/react-query';
import { Household } from '@/lib/types';
import { domainKeys } from './query-keys';

async function fetchHouseholds(): Promise<Household[]> {
  const response = await fetch('/api/v2/households', {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    let errorMsg = `Erro ao carregar residências (${response.status})`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } else {
        const errorText = await response.text();
        errorMsg =
          errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText || errorMsg;
      }
    } catch {
      /* ignore parse errors */
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export function useHouseholdsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: domainKeys.households(userId),
    queryFn: fetchHouseholds,
    enabled: !!userId,
  });
}
