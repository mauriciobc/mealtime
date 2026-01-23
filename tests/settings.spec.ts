import { test, expect } from './fixtures/test-fixtures';

test.describe('Settings', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test.beforeEach(async ({ loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
  });

  test('should navigate to settings page', async ({ settingsPage }) => {
    await settingsPage.goto();
    await settingsPage.expectOnSettingsPage();
  });
});

test.describe('Weight Logs API', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should get weight logs', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getWeightLogs('test-cat-id');
    expect(result).toHaveProperty('success');
  });
});

test.describe('Schedules API', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should get schedules', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getSchedules();
    expect(result).toHaveProperty('success');
  });
});
