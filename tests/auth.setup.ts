import { test as setup, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';

const authFile = 'tests/fixtures/auth.json';

// Ensure setup always starts without any persisted auth state
setup.use({
  storageState: { cookies: [], origins: [] },
});

setup('authenticate', async ({ page }) => {
  const testEmail = process.env.TEST_USER_EMAIL || 'test_e2e@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'Test@123456';

  const loginPage = new LoginPage(page);
  
  // Navigate to login page and wait for it to be ready
  await loginPage.goto();
  
  // Verify we're on the login page and form is visible
  await loginPage.expectOnLoginPage();
  
  // Perform login
  await loginPage.login(testEmail, testPassword);

  // Wait for successful login - check if we're redirected away from login page
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  
  // Wait for the page to fully load after login
  await page.waitForLoadState('networkidle');

  // Verify we're authenticated by checking we're not on the login page
  const currentUrl = page.url();
  expect(currentUrl).not.toContain('/login');

  // Save signed-in state to 'auth.json'
  await page.context().storageState({ path: authFile });
});
