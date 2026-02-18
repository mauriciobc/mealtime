import { test, expect } from './fixtures/test-fixtures';

test.describe('Join', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test.beforeEach(async ({ loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
  });

  test('should navigate to join page', async ({ joinPage }) => {
    await joinPage.goto();
    await joinPage.expectOnJoinPage();
    await expect(joinPage.inviteCodeInput).toBeVisible();
    await expect(joinPage.joinButton).toBeVisible();
  });

  test('should display form when visiting with code query', async ({ joinPage }) => {
    await joinPage.goto('test-code-123');
    await joinPage.expectOnJoinPage();
    await expect(joinPage.inviteCodeInput).toHaveValue('test-code-123', { timeout: 5000 });
  });
});
