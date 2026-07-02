import { useQuery } from '@tanstack/react-query';
import { FeedingLog } from '@/lib/types';
import { domainKeys } from './query-keys';

export async function fetchFeedingsForHousehold(
  householdId: string,
  _userId?: string
): Promise<FeedingLog[]> {
  const response = await fetch(`/api/v2/feedings?householdId=${householdId}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Erro ao carregar alimentações (${response.status}): ${errorText || 'Unknown error'}`
    );
  }
  const json = await response.json();
  const rawFeedingsData: any[] = Array.isArray(json) ? json : (json.data ?? []);
  const mappedFeedingsData: FeedingLog[] = rawFeedingsData.map((meal) => ({
    id: meal.id,
    catId: meal.cat_id,
    userId: meal.fed_by,
    timestamp: new Date(meal.fed_at),
    amount: typeof meal.amount === 'string' ? parseFloat(meal.amount) : meal.amount,
    portionSize: typeof meal.amount === 'string' ? parseFloat(meal.amount) : meal.amount,
    notes: meal.notes,
    mealType: meal.meal_type,
    householdId: meal.household_id,
    user: {
      id: meal.fed_by,
      name: meal.feeder?.full_name ?? null,
      avatar: meal.feeder?.avatar_url ?? null,
    },
    cat: undefined as any,
    status: undefined as any,
    createdAt: undefined as any,
  }));
  return mappedFeedingsData.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function useFeedingsQuery(householdId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: domainKeys.feedings(householdId),
    queryFn: () => fetchFeedingsForHousehold(householdId!, userId),
    enabled: !!householdId,
  });
}
