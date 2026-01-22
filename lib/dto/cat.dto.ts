import { z } from 'zod';
import { MAX_CAT_NAME_LENGTH, MAX_CAT_WEIGHT_KG, MAX_RESTRICTIONS_LENGTH, MAX_NOTES_LENGTH, MAX_FEEDING_INTERVAL_HOURS, MIN_FEEDING_INTERVAL_HOURS } from '../constants';

export const createCatDtoSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(MAX_CAT_NAME_LENGTH).trim(),
  householdId: z.string().uuid('ID do domicílio inválido'),
  photoUrl: z.string().url('URL da foto inválida').optional().or(z.literal('')),
  birthdate: z.string().datetime().optional().nullable(),
  weight: z.number().positive().max(MAX_CAT_WEIGHT_KG).optional().nullable(),
  restrictions: z.string().max(MAX_RESTRICTIONS_LENGTH).optional().nullable(),
  notes: z.string().max(MAX_NOTES_LENGTH).optional().nullable(),
  feeding_interval: z.number().int().min(MIN_FEEDING_INTERVAL_HOURS).max(MAX_FEEDING_INTERVAL_HOURS).optional().nullable(),
  portion_size: z.number().positive().optional().nullable(),
  portion_unit: z.string().optional().nullable(),
});

export const updateCatDtoSchema = createCatDtoSchema.partial();

export const catQueryDtoSchema = z.object({
  householdId: z.string().uuid().optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
});

export type CreateCatDto = z.infer<typeof createCatDtoSchema>;
export type UpdateCatDto = z.infer<typeof updateCatDtoSchema>;
export type CatQueryDto = z.infer<typeof catQueryDtoSchema>;

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateDto<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const issues = result.error.issues;
  const firstError = issues[0];
  
  if (!firstError) {
    return {
      success: false,
      error: new ValidationError('Validation failed', undefined, result.error.flatten())
    };
  }
  
  return {
    success: false,
    error: new ValidationError(
      firstError.message,
      firstError.path.join('.'),
      result.error.flatten()
    )
  };
}
