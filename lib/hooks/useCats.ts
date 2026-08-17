import { domainKeys, useCatMutations, useCatsQuery } from '@/lib/hooks/domain';

export function useCats(householdId: string) {
  const query = useCatsQuery(householdId);
  const mutations = useCatMutations(householdId);

  return {
    cats: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    addCat: mutations.addCat.mutate,
    updateCat: mutations.updateCat.mutate,
    deleteCat: mutations.deleteCat.mutate,
    isAdding: mutations.addCat.isPending,
    isUpdating: mutations.updateCat.isPending,
    isDeleting: mutations.deleteCat.isPending,
  };
}

export { domainKeys };
