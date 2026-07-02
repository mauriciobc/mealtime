import { test, expect } from './fixtures/test-fixtures';

test.describe('Notifications', () => {

  test.beforeEach(async ({ loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
  });

  test('should navigate to notifications page', async ({ notificationsPage }) => {
    await notificationsPage.goto();
    await notificationsPage.expectOnNotificationsPage();
  });
});
