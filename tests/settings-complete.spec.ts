import { test, expect } from './fixtures/test-fixtures';

test.describe('Settings Page', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test.beforeEach(async ({ loginPage, testUser, page }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    const closeButton = page.locator('button:has-text("Pular"), button:has-text("Próximo"), button:has-text("Fechar")').first();
    if (await closeButton.isVisible({ timeout: 3000 })) {
      await closeButton.click().catch(() => {});
    }
  });

  test('should display settings page', async ({ settingsPage }) => {
    await settingsPage.goto();
    await settingsPage.expectOnSettingsPage();
  });

  test('should show profile section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const profileSection = page.getByText(/sua conta|perfil/i).first();
    await expect(profileSection).toBeVisible({ timeout: 10000 });

    const editProfileButton = page.locator('button[aria-label="Editar perfil"]').first();
    await expect(editProfileButton).toBeVisible({ timeout: 5000 });
  });

  test('should show appearance section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const appearanceSection = page.getByText(/aparência|tema/i).first();
    await expect(appearanceSection).toBeVisible({ timeout: 10000 });
  });

  test('should show regional preferences section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const regionalSection = page.getByText(/preferências regionais|idioma/i).first();
    await expect(regionalSection).toBeVisible({ timeout: 10000 });
  });

  test('should show notifications section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const notificationsSection = page.getByText(/notificações|gerenciar notificações/i).first();
    await expect(notificationsSection).toBeVisible({ timeout: 10000 });
  });

  test('should show household section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const householdSection = page.getByText(/residência|gerenciar residência/i).first();
    await expect(householdSection).toBeVisible({ timeout: 10000 });
  });

  test('should show logout button', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const logoutButton = page.locator('button:has-text("Sair")').first();
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
  });

  test('should open edit profile modal', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const editProfileButton = page.locator('button[aria-label="Editar perfil"]').first();
    await editProfileButton.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]').filter({ hasText: /editar perfil/i }).first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.locator('input#name').first();
    await expect(nameInput).toBeVisible({ timeout: 3000 });
  });

  test('should open regional preferences modal', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const editRegionalButton = page.locator('button[aria-label="Editar preferências regionais"]').first();
    await editRegionalButton.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]').filter({ hasText: /preferências regionais/i }).first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const languageSelect = dialog.locator('#language').first();
    await expect(languageSelect).toBeVisible({ timeout: 3000 });
  });

  test('should open notifications modal', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const editNotificationsButton = page.locator('button[aria-label="Editar notificações"]').first();
    await editNotificationsButton.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]').filter({ hasText: /configurações de notificação/i }).first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const pushToggle = dialog.locator('label:has-text("Notificações Push Gerais")').first();
    await expect(pushToggle).toBeVisible({ timeout: 3000 });
  });

  test('should open household management modal', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const manageHouseholdButton = page.locator('button[aria-label="Gerenciar residência"]').first();
    await manageHouseholdButton.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]').filter({ hasText: /gerenciar residência|residência/i }).first();
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Settings - Logout', () => {
  test.skip(({ testUser }) => !testUser.email || !testUser.password, 'Skipping - no test user configured');

  test.beforeEach(async ({ loginPage, testUser, page }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    const closeButton = page.locator('button:has-text("Pular"), button:has-text("Próximo"), button:has-text("Fechar")').first();
    if (await closeButton.isVisible({ timeout: 3000 })) {
      await closeButton.click().catch(() => {});
    }
  });

  test('should logout from settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const logoutButton = page.locator('button:has-text("Sair")').first();
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
    await logoutButton.click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
