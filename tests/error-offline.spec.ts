import { test, expect } from './fixtures/test-fixtures';

test.describe('Error Page', () => {
  test('should display error page', async ({ errorPage }) => {
    await errorPage.goto();
    await errorPage.expectOnErrorPage();
  });

  test('should display error page with custom message', async ({ errorPage }) => {
    await errorPage.goto('redirect-loop-detected');
    await expect(errorPage.page.getByText(/loop de redirecionamento/i)).toBeVisible({ timeout: 5000 });
    await errorPage.expectOnErrorPage();
  });
});

test.describe('Offline Page', () => {
  test('should display offline page', async ({ offlinePage }) => {
    await offlinePage.goto();
    await offlinePage.expectOnOfflinePage();
  });
});
