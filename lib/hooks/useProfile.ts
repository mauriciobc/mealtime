import { useQuery } from "@tanstack/react-query";

export interface ProfileData {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  timezone?: string;
  createdAt?: string;
  household_members?: Array<{
    role: string;
    household: {
      id: string;
      name: string;
      description?: string;
      cats: Array<{ id: string; name: string }>;
      household_members: Array<{
        user: {
          id: string;
          full_name?: string;
          avatar_url?: string;
          email?: string;
        };
        role: string;
      }>;
    };
  }>;
  owned_cats?: Array<{
    id: string;
    name: string;
    photo_url?: string;
    weight?: number;
    weight_logs?: Array<{ weight: number; date: string }>;
    feeding_logs?: Array<{ fed_at: string }>;
  }>;
}

async function fetchProfile(userId: string): Promise<ProfileData> {
  const res = await fetch(`/api/profile/${userId}`);
  if (!res.ok) throw new Error("Erro ao buscar perfil");
  return res.json();
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
}
