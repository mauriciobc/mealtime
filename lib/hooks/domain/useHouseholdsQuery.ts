import { useQuery } from '@tanstack/react-query';
import { Household } from '@/lib/types';
import { domainKeys } from './query-keys';

type HouseholdsListResponse = {
  success?: boolean;
  data?: Household[];
  error?: string;
};

function normalizeHouseholdsList(payload: unknown): Household[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as HouseholdsListResponse).data;
    if (Array.isArray(data)) {
      return data;
    }
  }
  return [];
}

async function fetchHouseholds(): Promise<Household[]> {
  const response = await fetch('/api/v2/households', {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  const responseText = await response.text();
  let payload: unknown = null;

  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = responseText;
  }

  if (!response.ok) {
    let errorMsg = `Erro ao carregar residências (${response.status})`;
    if (payload && typeof payload === 'object' && 'error' in payload && typeof (payload as { error?: string }).error === 'string') {
      errorMsg = (payload as { error: string }).error;
    } else if (typeof payload === 'string' && payload) {
      errorMsg = payload.length > 200 ? payload.substring(0, 200) + '...' : payload;
    }
    throw new Error(errorMsg);
  }

  const households = normalizeHouseholdsList(payload);
  if (
    !households.length &&
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    !Array.isArray((payload as HouseholdsListResponse).data)
  ) {
    throw new Error('Resposta inválida ao carregar residências');
  }

  return households;
}

export function useHouseholdsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: domainKeys.households(userId),
    queryFn: fetchHouseholds,
    enabled: !!userId,
  });
}
