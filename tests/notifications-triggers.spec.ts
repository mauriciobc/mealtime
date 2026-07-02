import { test, expect } from './fixtures/test-fixtures';
import type { APIHelper } from './helpers/api-helper';

type NotificationRow = {
  type: string;
  metadata?: { duplicate?: boolean; catId?: string; feedingLogId?: string };
};

async function resolveHouseholdId(
  apiHelper: APIHelper,
  fallback?: string
): Promise<string> {
  const households = (await apiHelper.getHouseholds()) as {
    success?: boolean;
    data?: { id: string }[];
  };
  const fromApi = households.data?.[0]?.id;
  expect(fromApi ?? fallback, 'Need a household to run notification trigger tests').toBeTruthy();
  return (fromApi ?? fallback)!;
}

test.describe('Notification triggers (API)', () => {
  test('POST feeding creates feeding notification', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const householdId = await resolveHouseholdId(apiHelper, testUser.householdId);

    const catName = `NotifFeed_${Date.now()}`;
    const created = (await apiHelper.createCat({
      name: catName,
      householdId,
      weight: '4',
      feedingInterval: 8,
    })) as { success?: boolean; data?: { id: string } };
    expect(created.success).toBe(true);
    const catId = created.data!.id;

    const before = (await apiHelper.getNotifications({ limit: 50 })) as {
      success?: boolean;
      data?: NotificationRow[];
    };
    expect(before.success).toBe(true);
    const beforeFeeding = (before.data ?? []).filter((n) => n.type === 'feeding').length;

    const feeding = (await apiHelper.createFeeding({
      catId,
      amount: 10,
      unit: 'g',
    })) as { success?: boolean; data?: { id: string } };
    expect(feeding.success).toBe(true);

    const after = (await apiHelper.getNotifications({ limit: 50 })) as {
      success?: boolean;
      data?: NotificationRow[];
    };
    expect(after.success).toBe(true);
    const feedingNotifications = (after.data ?? []).filter(
      (n) => n.type === 'feeding' && n.metadata?.catId === catId
    );
    expect(feedingNotifications.length).toBeGreaterThan(beforeFeeding);
  });

  test('duplicate feeding returns 409 and creates warning notification', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const householdId = await resolveHouseholdId(apiHelper, testUser.householdId);

    const created = (await apiHelper.createCat({
      name: `NotifDup_${Date.now()}`,
      householdId,
      weight: '4',
      feedingInterval: 8,
    })) as { success?: boolean; data?: { id: string } };
    expect(created.success).toBe(true);
    const catId = created.data!.id;

    const first = (await apiHelper.createFeeding({ catId, amount: 10, unit: 'g' })) as {
      success?: boolean;
    };
    expect(first.success).toBe(true);

    const dup = await apiHelper.postFeedingRaw({
      catId,
      amount: 10,
      unit: 'g',
      meal_type: 'manual',
    });
    expect(dup.status).toBe(409);
    expect(dup.body).toMatchObject({ success: false });

    const notifications = (await apiHelper.getNotifications({ limit: 50 })) as {
      success?: boolean;
      data?: NotificationRow[];
    };
    expect(notifications.success).toBe(true);
    const warnings = (notifications.data ?? []).filter(
      (n) => n.type === 'warning' && n.metadata?.duplicate === true && n.metadata?.catId === catId
    );
    expect(warnings.length).toBeGreaterThan(0);
  });
});
