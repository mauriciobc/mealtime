import { test, expect } from './fixtures/test-fixtures';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page correctly', async ({ loginPage }) => {
    await loginPage.expectOnLoginPage();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should show error message for empty fields', async ({ loginPage, page }) => {
    await loginPage.submitButton.click();
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await loginPage.login('invalid@example.com', 'wrongpassword');
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).not.toBeNull();
  });

  test('should navigate to signup page', async ({ loginPage, signupPage }) => {
    await loginPage.clickSignup();
    await signupPage.expectOnSignupPage();
  });

  test('should redirect to signup on successful registration link click', async ({ loginPage, page }) => {
    await loginPage.clickSignup();
    await expect(page).toHaveURL(/signup/);
  });

  test('should toggle password visibility', async ({ loginPage }) => {
    await loginPage.passwordInput.fill('testpassword');
    await loginPage.togglePasswordVisibility();
    const inputType = await loginPage.passwordInput.getAttribute('type');
    expect(inputType).toBe('text');
  });
});

test.describe('Authentication - Mobile API', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping API tests - no test user configured');

  test('should authenticate via mobile API', async ({ apiHelper, testUser }) => {
    const result = await apiHelper.authenticate(testUser.email, testUser.password);
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('access_token');
  });

  test('should fail authentication with invalid credentials', async ({ apiHelper }) => {
    try {
      const result = await apiHelper.authenticate('invalid@example.com', 'wrongpassword');
      expect(result).toHaveProperty('success', false);
    } catch (error) {
      expect((error as Error).message).toContain('Authentication failed');
    }
  });
});
