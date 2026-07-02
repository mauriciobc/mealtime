import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/monitoring/logger';
import { v2Delete, v2Get, v2Patch, v2Post } from '@/lib/api/v2-client';

interface Cat {
  id: string;
  name: string;
  breed?: string;
  birth_date?: string;
  weight?: number;
  feeding_schedule?: any;
  medical_history?: any;
  created_at: string;
  updated_at: string;
}

export function useCats(householdId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const fetchCats = async (): Promise<Cat[]> => {
    try {
      return await v2Get<Cat[]>(`/api/v2/households/${householdId}/cats`);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          router.push('/login');
          throw new Error('Please login to continue');
        }
        if (error.message.includes('403')) {
          router.push('/households');
          throw new Error('You do not have access to this household');
        }
      }
      logger.error('[useCats] Error fetching cats', { householdId, error });
      throw error;
    }
  };

  const addCat = async (cat: Partial<Cat>): Promise<Cat> => {
    return v2Post<Cat>(`/api/v2/households/${householdId}/cats`, cat);
  };

  const updateCat = async (catId: string, updates: Partial<Cat>): Promise<Cat> => {
    return v2Patch<Cat>(`/api/v2/cats/${catId}`, updates);
  };

  const deleteCat = async (catId: string): Promise<void> => {
    await v2Delete<void>(`/api/v2/cats/${catId}`);
  };

  const catsQuery = useQuery({
    queryKey: ['cats', householdId],
    queryFn: fetchCats,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('login') || error?.message?.includes('access')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const addCatMutation = useMutation({
    mutationFn: addCat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cats', householdId] });
      toast.success('Cat added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ catId, updates }: { catId: string; updates: Partial<Cat> }) =>
      updateCat(catId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cats', householdId] });
      toast.success('Cat updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: deleteCat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cats', householdId] });
      toast.success('Cat deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    cats: catsQuery.data ?? [],
    isLoading: catsQuery.isLoading,
    isError: catsQuery.isError,
    error: catsQuery.error,
    addCat: addCatMutation.mutate,
    updateCat: updateCatMutation.mutate,
    deleteCat: deleteCatMutation.mutate,
    isAdding: addCatMutation.isPending,
    isUpdating: updateCatMutation.isPending,
    isDeleting: deleteCatMutation.isPending,
  };
}
