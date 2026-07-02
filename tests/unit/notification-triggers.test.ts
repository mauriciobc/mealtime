import { describe, it, expect } from 'vitest';
import {
  assertNotificationPayload,
  buildDuplicateFeedingWarning,
  buildFeedingRegisteredNotification,
  buildHouseholdFeedingBroadcast,
  buildHouseholdJoinNotifications,
  buildScheduleUpdateNotification,
  isValidNotificationType,
} from '@/lib/notifications/event-payloads';

const FIXED_NOW = '2026-07-02T12:00:00.000Z';

describe('notification event payloads', () => {
  it('validates notification types', () => {
    expect(isValidNotificationType('feeding')).toBe(true);
    expect(isValidNotificationType('household')).toBe(true);
    expect(isValidNotificationType('invalid')).toBe(false);
  });

  it('builds duplicate feeding warning', () => {
    const row = buildDuplicateFeedingWarning({
      id: 'n1',
      userId: 'u1',
      catId: 'c1',
      catName: 'Mimi',
      householdId: 'h1',
      now: FIXED_NOW,
    });

    expect(row.type).toBe('warning');
    expect(row.metadata?.duplicate).toBe(true);
    expect(row.metadata?.catId).toBe('c1');
    assertNotificationPayload({
      title: row.title,
      message: row.message,
      type: row.type,
      metadata: row.metadata,
    });
  });

  it('builds feeding registered notification for feeder', () => {
    const row = buildFeedingRegisteredNotification({
      id: 'n2',
      userId: 'u1',
      catId: 'c1',
      feedingLogId: 'f1',
      householdId: 'h1',
      now: FIXED_NOW,
    });

    expect(row.type).toBe('feeding');
    expect(row.metadata?.feedingLogId).toBe('f1');
  });

  it('builds household broadcast when another member feeds', () => {
    const row = buildHouseholdFeedingBroadcast({
      id: 'n3',
      recipientUserId: 'u2',
      catId: 'c1',
      catName: 'Mimi',
      feederId: 'u1',
      feederName: 'Maria',
      fedAt: FIXED_NOW,
      now: FIXED_NOW,
    });

    expect(row.user_id).toBe('u2');
    expect(row.message).toContain('Maria');
    expect(row.type).toBe('feeding');
  });

  it('builds household join notifications for other members', () => {
    let counter = 0;
    const rows = buildHouseholdJoinNotifications({
      householdId: 'h1',
      householdName: 'Casa',
      joiningUserId: 'u-new',
      joiningUserName: 'João',
      otherMemberIds: ['u2', 'u3'],
      idFactory: () => `n-${++counter}`,
      now: FIXED_NOW,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]?.type).toBe('household');
    expect(rows[0]?.message).toContain('João');
    expect(rows[0]?.metadata?.householdId).toBe('h1');
  });

  it('builds schedule update system notification', () => {
    const payload = buildScheduleUpdateNotification({
      catId: 'c1',
      catName: 'Mimi',
      scheduleId: 's1',
      updatedFields: ['times'],
    });

    expect(payload.type).toBe('system');
    expect(payload.metadata?.scheduleId).toBe('s1');
    assertNotificationPayload(payload);
  });

  it('rejects invalid payloads', () => {
    expect(() =>
      assertNotificationPayload({
        title: '',
        message: 'x',
        type: 'feeding',
      })
    ).toThrow(/title/i);
  });
});
