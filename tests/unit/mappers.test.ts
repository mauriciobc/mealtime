import { describe, expect, it } from 'vitest';
import { mapApiFeeding } from '@/lib/mappers/feeding';
import { mapApiSchedule } from '@/lib/mappers/schedule';
import { mapApiWeightGoal, mapApiWeightLog } from '@/lib/mappers/weight';

describe('domain mappers', () => {
  it('maps feeding snake_case to FeedingLog', () => {
    const log = mapApiFeeding({
      id: 'f1',
      cat_id: 'c1',
      fed_by: 'u1',
      fed_at: '2026-08-17T12:00:00.000Z',
      amount: '12.5',
      notes: 'ok',
      meal_type: 'lunch',
      household_id: 'h1',
      feeder: { full_name: 'Ada', avatar_url: 'a.png' },
    });

    expect(log).toMatchObject({
      id: 'f1',
      catId: 'c1',
      userId: 'u1',
      amount: 12.5,
      portionSize: 12.5,
      householdId: 'h1',
      mealType: 'lunch',
    });
    expect(log.timestamp).toBeInstanceOf(Date);
    expect(log.user).toEqual({ id: 'u1', name: 'Ada', avatar: 'a.png' });
  });

  it('maps schedule snake_case to Schedule', () => {
    const schedule = mapApiSchedule({
      id: 's1',
      cat_id: 'c1',
      household_id: 'h1',
      user_id: 'u1',
      type: 'interval',
      interval: 8,
      times: ['08:00'],
      days: ['mon'],
      enabled: true,
      created_at: '2026-08-17T00:00:00.000Z',
      cat: { id: 'c1', name: 'Mimi' },
    });

    expect(schedule.catId).toBe('c1');
    expect(schedule.userId).toBe('u1');
    expect(schedule.cat?.name).toBe('Mimi');
  });

  it('maps weight log and goal snake_case', () => {
    const log = mapApiWeightLog({
      id: 'w1',
      cat_id: 'c1',
      weight: '4.2',
      date: '2026-08-01',
      measured_by: 'u1',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    });
    expect(log).toMatchObject({ catId: 'c1', weight: 4.2, measuredBy: 'u1' });

    const goal = mapApiWeightGoal({
      id: 'g1',
      cat_id: 'c1',
      target_weight: '4',
      start_weight: '5',
      status: 'active',
      created_by: 'u1',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    });
    expect(goal).toMatchObject({
      catId: 'c1',
      targetWeight: 4,
      startWeight: 5,
      createdBy: 'u1',
    });
  });
});
