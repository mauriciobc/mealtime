import { z } from 'zod';

export const createFeedingLogDtoSchema = z.object({
  catId: z.string().uuid('ID do gato inválido'),
  householdId: z.string().uuid('ID do domicílio inválido'),
  mealType: z.string().min(1, 'Tipo de refeição é obrigatório'),
  amount: z.number().positive('Quantidade deve ser positiva'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  notes: z.string().max(500).optional().nullable(),
  foodType: z.string().optional().nullable(),
  fedAt: z.string().datetime().optional(),
});

export const updateFeedingLogDtoSchema = z.object({
  mealType: z.string().optional(),
  amount: z.number().positive().optional(),
  unit: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
  foodType: z.string().optional().nullable(),
  fedAt: z.string().datetime().optional(),
});

export const feedingLogQueryDtoSchema = z.object({
  catId: z.string().uuid().optional(),
  householdId: z.string().uuid().optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateFeedingLogDto = z.infer<typeof createFeedingLogDtoSchema>;
export type UpdateFeedingLogDto = z.infer<typeof updateFeedingLogDtoSchema>;
export type FeedingLogQueryDto = z.infer<typeof feedingLogQueryDtoSchema>;
