import { test, expect } from './fixtures/test-fixtures';

test.describe('Schedules', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test.beforeEach(async ({ loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
  });

  test('should navigate to schedules page', async ({ schedulesPage }) => {
    await schedulesPage.goto();
    await schedulesPage.expectOnSchedulesPage();
  });

  test('should navigate to new schedule page', async ({ page, scheduleNewPage }) => {
    await page.goto('/schedules/new');
    await page.waitForLoadState('networkidle');
    await scheduleNewPage.expectOnNewSchedulePage();
  });

  test('should display schedules page with content or empty state', async ({ schedulesPage }) => {
    await schedulesPage.goto();
    const hasContent = await schedulesPage.activeSchedulesHeading.isVisible().catch(() => false);
    const hasEmptyState = await schedulesPage.emptyState.first().isVisible().catch(() => false);
    const hasNewButton = await schedulesPage.newScheduleButton.first().isVisible().catch(() => false);
    expect(hasContent || hasEmptyState || hasNewButton).toBeTruthy();
  });
});
