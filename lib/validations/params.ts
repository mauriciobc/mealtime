import { z } from 'zod';

export const uuidParamSchema = z.string().uuid();

export const catsListQuerySchema = z.object({
  householdId: z.string().uuid().optional(),
});

export const uploadTypeSchema = z.enum(['user', 'cat', 'thumbnail']);

export function parseUploadType(value: unknown): z.infer<typeof uploadTypeSchema> {
  if (typeof value !== 'string') return 'user';
  const parsed = uploadTypeSchema.safeParse(value.trim().toLowerCase());
  return parsed.success ? parsed.data : 'user';
}
