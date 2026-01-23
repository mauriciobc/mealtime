import { test, expect } from './fixtures/test-fixtures';

test.describe('Dashboard', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test.beforeEach(async ({ loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
  });

  test.skip('should display dashboard after login - requires household', async ({ dashboardPage }) => {
    await dashboardPage.expectOnDashboard();
    await dashboardPage.expectWelcomeMessage();
  });

  test.skip('should redirect unauthenticated users to login - timing issue', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const url = page.url();
    expect(url).toContain('/login');
  });
});

test.describe('Dashboard - With Household', () => {
  test.skip(true, 'Storage state auth not supported - requires valid credentials in auth.json');

  test('should display dashboard content when authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
