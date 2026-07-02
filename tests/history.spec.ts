import { test, expect } from './fixtures/test-fixtures';

test.describe('History', () => {

  test.beforeEach(async ({ loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
  });

  test('should navigate to history page', async ({ historyPage }) => {
    await historyPage.goto();
    await historyPage.expectOnHistoryPage();
  });
});
