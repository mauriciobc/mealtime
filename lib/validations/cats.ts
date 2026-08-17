import { z } from 'zod';

const optionalUrl = z
  .string()
  .url('URL da foto inválida')
  .nullable()
  .optional()
  .or(z.literal(''));

const optionalWeight = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) {
      ctx.addIssue({ code: 'custom', message: 'Peso deve ser um número válido' });
      return z.NEVER;
    }
    if (num <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Peso deve ser positivo' });
      return z.NEVER;
    }
    if (num > 50) {
      ctx.addIssue({ code: 'custom', message: 'Peso deve ser menor que 50kg' });
      return z.NEVER;
    }
    return num;
  });

const optionalBirthdate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Data de nascimento deve ser uma data válida' });
      return z.NEVER;
    }
    if (date > new Date()) {
      ctx.addIssue({ code: 'custom', message: 'Data de nascimento não pode ser no futuro' });
      return z.NEVER;
    }
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
    if (date < thirtyYearsAgo) {
      ctx.addIssue({ code: 'custom', message: 'Data de nascimento não pode ser há mais de 30 anos' });
      return z.NEVER;
    }
    return date.toISOString();
  });

const optionalFeedingInterval = z
  .number()
  .int()
  .min(1, 'Intervalo mínimo é 1 hora')
  .max(24, 'Intervalo máximo é 24 horas')
  .optional();

function normalizeCatAliases(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }
  const data = { ...(input as Record<string, unknown>) };
  if (data.birthDate !== undefined && data.birthdate === undefined) {
    data.birthdate = data.birthDate;
  }
  if (data.feeding_interval !== undefined && data.feedingInterval === undefined) {
    data.feedingInterval = data.feeding_interval;
  }
  return data;
}

const catWriteObject = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  photoUrl: optionalUrl,
  birthdate: optionalBirthdate,
  weight: optionalWeight,
  restrictions: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  feedingInterval: optionalFeedingInterval,
  feeding_interval: optionalFeedingInterval,
  portion_size: z.number().positive().optional(),
  portion_unit: z.string().optional().nullable(),
});

export const catWriteSchema = z.preprocess(normalizeCatAliases, catWriteObject);

export const createCatInHouseholdSchema = catWriteSchema;

export const createCatSchema = z.preprocess(
  normalizeCatAliases,
  catWriteObject.extend({
    householdId: z.string().uuid('ID do domicílio inválido'),
  })
);

export const updateCatSchema = z.preprocess(
  normalizeCatAliases,
  catWriteObject.partial().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Pelo menos um campo deve ser fornecido para atualização' }
  )
);

export const catQuerySchema = z.object({
  householdId: z.string().uuid().optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).optional(),
  offset: z.string().transform((val) => parseInt(val, 10)).optional(),
});

export type CatWriteInput = z.infer<typeof catWriteSchema>;
export type CreateCatInput = z.infer<typeof createCatSchema>;
export type UpdateCatInput = z.infer<typeof updateCatSchema>;
export type CatQueryInput = z.infer<typeof catQuerySchema>;

export function feedingIntervalOf(data: {
  feedingInterval?: number;
  feeding_interval?: number;
}): number | null {
  return data.feedingInterval ?? data.feeding_interval ?? null;
}

/** @deprecated alias kept for docs; use createCatSchema */
export const createCatDtoSchema = createCatSchema;
