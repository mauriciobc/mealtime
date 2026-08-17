import { describe, expect, it } from 'vitest';
import { createCatSchema, updateCatSchema } from '@/lib/validations/cats';

describe('createCatSchema', () => {
  it('accepts a valid cat', () => {
    const result = createCatSchema.safeParse({
      name: 'Mimi',
      householdId: '550e8400-e29b-41d4-a716-446655440000',
      weight: 4.2,
      gender: 'female',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weight above 50kg', () => {
    const result = createCatSchema.safeParse({
      name: 'Mimi',
      householdId: '550e8400-e29b-41d4-a716-446655440000',
      weight: 51,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a birthdate in the future', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = createCatSchema.safeParse({
      name: 'Mimi',
      householdId: '550e8400-e29b-41d4-a716-446655440000',
      birthdate: future.toISOString(),
    });
    expect(result.success).toBe(false);
  });
});

describe('updateCatSchema', () => {
  it('accepts birthDate alias', () => {
    const result = updateCatSchema.safeParse({
      birthDate: new Date('2020-01-01').toISOString(),
    });
    expect(result.success).toBe(true);
  });
});
