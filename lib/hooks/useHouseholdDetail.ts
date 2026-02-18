import { useQuery } from "@tanstack/react-query";
import { Household } from "@/lib/types";

async function fetchHouseholdDetail(householdId: string, userId: string): Promise<Household> {
  const response = await fetch(`/api/households/${householdId}`, {
    headers: { Accept: "application/json", "X-User-ID": userId },
  });
  const data = await response.json();
  if (!response.ok) {
    let errorMessage = "Failed to load household";
    if (response.status === 400 && data.error) {
      if (Array.isArray(data.error)) {
        errorMessage = data.error.map((err: { message?: string }) => err.message).join(", ");
      } else if (typeof data.error === "object") {
        errorMessage = Object.values(data.error).join(", ");
      } else {
        errorMessage = data.error;
      }
    } else {
      errorMessage = data.error || data.message || `Failed to load household (${response.status})`;
    }
    throw new Error(errorMessage);
  }
  return data;
}

export function useHouseholdDetail(householdId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["household", householdId],
    queryFn: () => fetchHouseholdDetail(householdId!, userId!),
    enabled: !!householdId && !!userId,
  });
}
