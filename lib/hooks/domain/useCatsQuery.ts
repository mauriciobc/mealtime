import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { v2Delete, v2Get, v2Post, v2Put } from '@/lib/api/v2-client';
import { mapApiCat } from '@/lib/mappers/cat';
import type { CatType } from '@/lib/types';
import { domainKeys } from './query-keys';

async function fetchCatsForHousehold(householdId: string): Promise<CatType[]> {
  const cats = await v2Get<unknown[]>(`/api/v2/households/${householdId}/cats`);
  if (!Array.isArray(cats)) return [];
  return cats.map((cat) => mapApiCat(cat as Record<string, unknown>));
}

export function useCatsQuery(householdId: string | undefined, _userId?: string) {
  return useQuery({
    queryKey: domainKeys.cats(householdId),
    queryFn: () => fetchCatsForHousehold(householdId!),
    enabled: !!householdId,
  });
}

export function useCatMutations(householdId: string | undefined) {
  const queryClient = useQueryClient();
  const key = domainKeys.cats(householdId);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const addCat = useMutation({
    mutationFn: (cat: Partial<CatType> & Record<string, unknown>) =>
      v2Post<CatType>(`/api/v2/households/${householdId}/cats`, cat),
    onSuccess: () => {
      invalidate();
      toast.success('Cat added successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateCat = useMutation({
    mutationFn: ({ catId, updates }: { catId: string; updates: Partial<CatType> }) =>
      v2Put<CatType>(`/api/v2/cats/${catId}`, updates),
    onSuccess: () => {
      invalidate();
      toast.success('Cat updated successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteCat = useMutation({
    mutationFn: (catId: string) => v2Delete<void>(`/api/v2/cats/${catId}`),
    onSuccess: () => {
      invalidate();
      toast.success('Cat deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { addCat, updateCat, deleteCat, invalidate };
}
