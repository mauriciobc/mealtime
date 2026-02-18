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
    const alert = page.getByRole('alert').first();
    await expect(alert).toBeVisible({ timeout: 8000 });
    const errorMessage = (await alert.textContent())?.replace('Login Error', '').trim() || await alert.textContent();
    expect(errorMessage).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ loginPage, page }) => {
    await loginPage.login('invalid@example.com', 'wrongpassword');
    const alert = page.getByRole('alert').first();
    await expect(alert).toBeVisible({ timeout: 10000 });
    const errorMessage = (await alert.textContent())?.replace('Login Error', '').trim() || await alert.textContent();
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

  test('should show validation error when passwords do not match', async ({ page, signupPage }) => {
    await signupPage.goto();
    await signupPage.fullNameInput.fill('Test User');
    await signupPage.emailInput.fill(`test_${Date.now()}@example.com`);
    await signupPage.passwordInput.fill('ValidPass123');
    await signupPage.confirmPasswordInput.fill('DifferentPass123');
    if (await signupPage.termsCheckbox.isVisible()) {
      await signupPage.termsCheckbox.check();
    }
    await signupPage.submitButton.click();
    await page.waitForSelector('[data-sonner-toast]', { timeout: 5000 });
    await expect(page.locator('[data-sonner-toast]').getByText(/senhas não coincidem|as senhas não coincidem/i)).toBeVisible();
  });

  test('should show validation error when password is too short', async ({ page, signupPage }) => {
    await signupPage.goto();
    await signupPage.fullNameInput.fill('Test User');
    await signupPage.emailInput.fill(`test_${Date.now()}@example.com`);
    await signupPage.passwordInput.fill('12345');
    await signupPage.confirmPasswordInput.fill('12345');
    if (await signupPage.termsCheckbox.isVisible()) {
      await signupPage.termsCheckbox.check();
    }
    await signupPage.submitButton.click();
    await page.waitForSelector('[data-sonner-toast]', { timeout: 5000 });
    await expect(page.locator('[data-sonner-toast]').getByText(/6 caracteres|pelo menos 6/i)).toBeVisible();
  });

  test('should complete signup flow and show success or error feedback', async ({ page, signupPage }) => {
    await signupPage.goto();
    const uniqueEmail = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = 'ValidPass123';
    await signupPage.fullNameInput.fill('E2E Test User');
    await signupPage.emailInput.fill(uniqueEmail);
    await signupPage.passwordInput.fill(password);
    await signupPage.confirmPasswordInput.fill(password);
    if (await signupPage.termsCheckbox.isVisible()) {
      await signupPage.termsCheckbox.check();
    }
    await signupPage.submitButton.click();
    await page.waitForSelector('[data-sonner-toast]', { timeout: 10000 });
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible();
    const toastText = await toast.textContent();
    const hasExpectedFeedback = /conta criada com sucesso|verifique seu email|erro ao criar conta|preencha todos os campos|muitas requisições|tente novamente|too many/i.test(toastText ?? '');
    expect(hasExpectedFeedback || (toastText && toastText.length > 0)).toBeTruthy();
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

  test('should reject API requests without authentication', async ({ apiHelper, page }) => {
    // Clear any existing token
    await apiHelper.setAccessToken('');
    
    // Try to access protected API endpoint
    const response = await page.request.get('/api/v2/cats', {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const result = await response.json();
    // Should return error or unauthorized status
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(result).toHaveProperty('success', false);
  });
});

test.describe('Logout', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user credentials');

  test('should logout and redirect to login', async ({ page, loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const userMenuTrigger = page.getByRole('button', { name: /abrir menu do usuário|menu do usuário/i });
    await userMenuTrigger.click();
    await page.getByRole('menuitem', { name: /sair|log out/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Protected Routes - Error Handling', () => {
  test('should redirect unauthenticated users to login when accessing protected route', async ({ page }) => {
    // Try to access a protected route without authentication
    await page.goto('/cats');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users to login when accessing dashboard', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users to login when accessing households', async ({ page }) => {
    await page.goto('/households');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users to login when accessing feedings', async ({ page }) => {
    await page.goto('/feedings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users to login when accessing schedules', async ({ page }) => {
    await page.goto('/schedules');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users to login when accessing weight', async ({ page }) => {
    await page.goto('/weight');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users to login when accessing statistics', async ({ page }) => {
    await page.goto('/statistics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users to login when accessing profile', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect unauthenticated users to login when accessing settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Form Validation - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should show validation error for empty email on login', async ({ loginPage, page }) => {
    await loginPage.passwordInput.fill('somepassword');
    await loginPage.submitButton.click();
    const alert = page.getByRole('alert').first();
    await expect(alert).toBeVisible({ timeout: 8000 });
    const errorMessage = (await alert.textContent())?.replace('Login Error', '').trim() || await alert.textContent();
    expect(errorMessage).toBeTruthy();
  });

  test('should show validation error for empty password on login', async ({ loginPage, page }) => {
    await loginPage.emailInput.fill('test@example.com');
    await loginPage.submitButton.click();
    const alert = page.getByRole('alert').first();
    await expect(alert).toBeVisible({ timeout: 8000 });
    const errorMessage = (await alert.textContent())?.replace('Login Error', '').trim() || await alert.textContent();
    expect(errorMessage).toBeTruthy();
  });
});
