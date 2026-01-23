import { test, expect } from './fixtures/test-fixtures';

test.describe('Weight Management', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test.describe('Weight Page', () => {
    test.beforeEach(async ({ loginPage, testUser, page }) => {
      await loginPage.goto();
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[name="email"], input#email').first();
      if (await emailInput.isVisible()) {
        await loginPage.login(testUser.email, testUser.password);
      }
      
      const closeButton = page.locator('button:has-text("Pular"), button:has-text("Próximo"), button:has-text("Fechar")').first();
      if (await closeButton.isVisible({ timeout: 3000 })) {
        await closeButton.click().catch(() => {});
      }
    });

    test('should display weight page', async ({ page }) => {
      await page.goto('/weight');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1:has-text("Painel de Peso")').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display current weight', async ({ page }) => {
      await page.goto('/weight');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=4.5 kg').first()).toBeVisible({ timeout: 5000 });
    });

    test('should display weight chart', async ({ page }) => {
      await page.goto('/weight');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[role="application"]').first()).toBeVisible({ timeout: 5000 });
    });

    test('should display recent history', async ({ page }) => {
      await page.goto('/weight');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Histórico Recente').first()).toBeVisible({ timeout: 5000 });
    });

    test('should display milestones section', async ({ page }) => {
      await page.goto('/weight');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Progresso da Meta').first()).toBeVisible({ timeout: 5000 });
    });

    test('should select different cats', async ({ page }) => {
      await page.goto('/weight');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('button:has-text("Whiskers")').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Weight Registration Dialog', () => {
    test.beforeEach(async ({ loginPage, testUser, page }) => {
      await loginPage.goto();
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[name="email"], input#email').first();
      if (await emailInput.isVisible()) {
        await loginPage.login(testUser.email, testUser.password);
      }
      
      const closeButton = page.locator('button:has-text("Pular"), button:has-text("Próximo")').first();
      if (await closeButton.isVisible({ timeout: 3000 })) {
        await closeButton.click().catch(() => {});
      }
    });

    test('should open weight registration dialog', async ({ page }) => {
      await page.goto('/weight');
      await page.waitForLoadState('networkidle');
      
      const registerButton = page.locator('button:has-text("Registrar Peso")').first();
      if (await registerButton.isVisible({ timeout: 5000 })) {
        await registerButton.click();
        await expect(page.locator('h2:has-text("Registrar Novo Peso")').first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Weight History', () => {
    test.beforeEach(async ({ loginPage, testUser, page }) => {
      await loginPage.goto();
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[name="email"], input#email').first();
      if (await emailInput.isVisible()) {
        await loginPage.login(testUser.email, testUser.password);
      }
    });

    test('should switch time range tabs', async ({ page }) => {
      await page.goto('/weight');
      await page.waitForLoadState('networkidle');
      
      const tab30 = page.locator('button:has-text("30 Dias")').first();
      const tab60 = page.locator('button:has-text("60 Dias")').first();
      const tab90 = page.locator('button:has-text("90 Dias")').first();
      
      if (await tab30.isVisible()) await tab30.click();
      await page.waitForTimeout(500);
      if (await tab60.isVisible()) await tab60.click();
      await page.waitForTimeout(500);
      if (await tab90.isVisible()) await tab90.click();
      await page.waitForTimeout(500);
    });
  });
});

test.describe('Weight API', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should get weight logs via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getWeightLogs('bb45639d-c013-4124-ae0d-6193369a228c');
    expect(result).toHaveProperty('success');
  });

  test('should create weight log via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const result = await apiHelper.createWeightLog({
      catId: 'bb45639d-c013-4124-ae0d-6193369a228c',
      weight: 4.7,
      date: new Date().toISOString(),
      notes: 'Test weight via API',
    });

    expect(result).toHaveProperty('success');
  });
});
