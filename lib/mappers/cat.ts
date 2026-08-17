import { parseGender } from '@/lib/types/common';
import type { CatType } from '@/lib/types';

export function mapApiCat(cat: Record<string, unknown>): CatType {
  return {
    id: String(cat.id),
    name: String(cat.name ?? ''),
    birthdate: cat.birth_date ? new Date(String(cat.birth_date)) : null,
    weight: cat.weight != null ? parseFloat(String(cat.weight)) : null,
    householdId: String(cat.household_id ?? cat.householdId ?? ''),
    createdAt: cat.created_at ? new Date(String(cat.created_at)) : new Date(),
    updatedAt: cat.updated_at ? new Date(String(cat.updated_at)) : undefined,
    photo_url: (cat.photo_url as string | null) ?? null,
    restrictions: (cat.restrictions as string | null) ?? null,
    notes: (cat.notes as string | null) ?? null,
    feeding_interval: (cat.feeding_interval as number | string | null) ?? null,
    portion_size: cat.portion_size != null ? String(cat.portion_size) : null,
    gender: parseGender(cat.gender),
    schedules: [],
  };
}
