import { test, expect } from './fixtures/test-fixtures';

test.describe('Statistics', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test.beforeEach(async ({ loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
  });

  test('should navigate to statistics page', async ({ statisticsPage }) => {
    await statisticsPage.goto();
    await statisticsPage.expectOnStatisticsPage();
  });
});
