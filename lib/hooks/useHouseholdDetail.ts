import { useQuery } from "@tanstack/react-query";
import { Household } from "@/lib/types";
import { v2Get } from "@/lib/api/v2-client";

async function fetchHouseholdDetail(householdId: string): Promise<Household> {
  return v2Get<Household>(`/api/v2/households/${householdId}`);
}

export function useHouseholdDetail(householdId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["household", householdId],
    queryFn: () => fetchHouseholdDetail(householdId!),
    enabled: !!householdId && !!userId,
  });
}
