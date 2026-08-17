import { describe, expect, it } from 'vitest';
import { createScheduleSchema, updateScheduleSchema } from '@/lib/validations/schedules';
import { catsListQuerySchema, parseUploadType, uuidParamSchema } from '@/lib/validations/params';

describe('createScheduleSchema', () => {
  it('rejects interval schedules without a positive interval', () => {
    const result = createScheduleSchema.safeParse({
      catId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'interval',
    });
    expect(result.success).toBe(false);
  });

  it('accepts fixedTime schedules with HH:MM times', () => {
    const result = createScheduleSchema.safeParse({
      catId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'fixedTime',
      times: ['08:30', '18:00'],
    });
    expect(result.success).toBe(true);
  });
});

describe('updateScheduleSchema', () => {
  it('rejects non-positive interval', () => {
    expect(updateScheduleSchema.safeParse({ interval: 0 }).success).toBe(false);
  });
});

describe('params schemas', () => {
  it('requires a uuid householdId when present', () => {
    expect(catsListQuerySchema.safeParse({ householdId: 'not-a-uuid' }).success).toBe(false);
    expect(
      catsListQuerySchema.safeParse({
        householdId: '550e8400-e29b-41d4-a716-446655440000',
      }).success
    ).toBe(true);
  });

  it('parses upload type with a user default', () => {
    expect(parseUploadType('cat')).toBe('cat');
    expect(parseUploadType('nope')).toBe('user');
    expect(uuidParamSchema.safeParse('bad').success).toBe(false);
  });
});
