import { test, expect } from './fixtures/test-fixtures';

test.describe('Statistics API', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test('should get statistics for 7dias period', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getStatistics('7dias') as { success?: boolean; data?: unknown };
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('data');
  });

  test('should get statistics for 30dias period', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getStatistics('30dias') as { success?: boolean; data?: unknown };
    expect(result).toHaveProperty('success', true);
  });

  test('should get statistics for 3meses period', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getStatistics('3meses') as { success?: boolean; data?: unknown };
    expect(result).toHaveProperty('success', true);
  });

  test('should reject invalid period', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getStatistics('invalid') as { success?: boolean; error?: string };
    expect(result).toHaveProperty('success', false);
    expect(result.error).toContain('Período inválido');
  });
});

test.describe('Next Feeding API', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test('should get next feeding for a cat', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const cat = await testDataManager.createTestCat({
      name: `NextFeeding_${Date.now()}`,
      weight: '4.5',
      feedingInterval: 8,
    });

    const result = await apiHelper.getNextFeeding(cat.id) as { success?: boolean; data?: unknown };
    expect(result).toHaveProperty('success', true);
  });
});

test.describe('Weight Goals API', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test('should create and get weight goal', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const cat = await testDataManager.createTestCat({
      name: `GoalCat_${Date.now()}`,
      weight: '4.5',
    });

    const startDate = new Date().toISOString().slice(0, 10);
    const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const createResult = await apiHelper.createGoal({
      cat_id: cat.id,
      goal_name: 'Test Goal',
      start_date: startDate,
      target_date: targetDate,
      initial_weight: 4.5,
      target_weight: 4.0,
      unit: 'kg',
      description: 'Test weight goal',
    }) as { success?: boolean; data?: { id: string; goal_name: string } };

    expect(createResult).toHaveProperty('success', true);
    expect(createResult.data).toHaveProperty('goal_name', 'Test Goal');

    const getResult = await apiHelper.getGoals() as { success?: boolean; data?: unknown[] } | unknown[];
    const isArray = Array.isArray(getResult);
    const hasDataArray = !isArray && typeof getResult === 'object' && getResult !== null && Array.isArray((getResult as { data?: unknown[] }).data);
    expect(isArray || hasDataArray).toBe(true);
  });

  test('should reject goal with invalid unit', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const cat = await testDataManager.createTestCat({
      name: `InvalidGoal_${Date.now()}`,
      weight: '4.5',
    });

    const startDate = new Date().toISOString().slice(0, 10);
    const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const result = await apiHelper.createGoal({
      cat_id: cat.id,
      goal_name: 'Invalid Goal',
      start_date: startDate,
      target_date: targetDate,
      initial_weight: 4.5,
      target_weight: 4.0,
      unit: 'invalid' as 'kg',
    }) as { error?: string };

    expect(result.error).toContain('Invalid unit');
  });
});

test.describe('User Preferences API', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test('should get user preferences', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getUserPreferences(testUser.userId);
    expect(result).toBeDefined();
  });

  test('should update user language preference', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.updateUserPreferences(testUser.userId, {
      language: 'en-US',
    }) as { success?: boolean };
    expect(result).toBeDefined();
  });

  test('should update user timezone preference', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.updateUserPreferences(testUser.userId, {
      timezone: 'America/New_York',
    }) as { success?: boolean };
    expect(result).toBeDefined();
  });

  test('should update notification preferences', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.updateUserPreferences(testUser.userId, {
      notifications: {
        pushEnabled: true,
        feedingReminders: true,
        missedFeedingAlerts: false,
        householdUpdates: true,
      },
    }) as { success?: boolean };
    expect(result).toBeDefined();
  });
});

test.describe('Upload API', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test('should reject upload without authentication', async ({ apiHelper }) => {
    await apiHelper.setAccessToken('');
    // Create a minimal PNG buffer
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    const response = await apiHelper.uploadFile(pngBuffer, 'test.png', 'cat');
    expect(response).toHaveProperty('error');
  });
});

test.describe('Feeding Logs API', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test('should get feeding logs via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const cat = await testDataManager.createTestCat({
      name: `FeedingLogs_${Date.now()}`,
      weight: '4.5',
    });

    const result = await apiHelper.get(`/api/feeding-logs?catId=${cat.id}`) as { data?: unknown[] };
    expect(result).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });
});

test.describe('Household Join API', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test('should reject join with invalid invite code', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.post('/api/v2/households/join', { inviteCode: 'invalid-code' }) as { success?: boolean; error?: string };
    expect(result).toHaveProperty('success', false);
  });
});

test.describe('Invite Accept/Reject API', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test('should reject accept invite with invalid notification id', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.acceptInvite('00000000-0000-0000-0000-000000000000') as { success?: boolean; error?: string };
    expect(result).toHaveProperty('success', false);
  });

  test('should reject reject invite with invalid notification id', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.rejectInvite('00000000-0000-0000-0000-000000000000') as { success?: boolean; error?: string };
    expect(result).toHaveProperty('success', false);
  });
});
