import { z } from 'zod';

export const createCatSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100).trim(),
  householdId: z.string().uuid('ID do domicílio inválido'),
  photoUrl: z.string().url('URL da foto inválida').optional().or(z.literal('')),
  birthdate: z.string().datetime().optional().nullable(),
  weight: z.number().positive('Peso deve ser positivo').max(50, 'Peso deve ser menor que 50kg').optional().nullable(),
  restrictions: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  feeding_interval: z.number().int().min(1, 'Intervalo mínimo é 1 hora').max(24, 'Intervalo máximo é 24 horas').optional().nullable(),
  portion_size: z.number().positive().optional().nullable(),
  portion_unit: z.string().optional().nullable(),
});

export const updateCatSchema = createCatSchema.partial();

export const catQuerySchema = z.object({
  householdId: z.string().uuid().optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
});

export type CreateCatInput = z.infer<typeof createCatSchema>;
export type UpdateCatInput = z.infer<typeof updateCatSchema>;
export type CatQueryInput = z.infer<typeof catQuerySchema>;
