import { test, expect } from './fixtures/test-fixtures';

test.describe('Profile', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test.beforeEach(async ({ loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
  });

  test('should navigate to profile page', async ({ profilePage }) => {
    await profilePage.goto();
    await profilePage.expectOnProfilePage();
  });

  test('should navigate to profile edit page', async ({ profilePage, page }) => {
    await profilePage.goto();
    await profilePage.clickEditProfile();
    await expect(page).toHaveURL(/\/profile\/edit/);
  });
});
