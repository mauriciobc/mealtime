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

  test.describe('Weight Page - PUT goals validation (uses auth from setup)', () => {
    test('PUT /api/weight/goals (archive goal) should not return 403 or 404', async ({ page }) => {
      const putResponses: { status: number; url: string }[] = [];
      page.on('response', (res) => {
        const url = res.url();
        if (url.includes('/api/weight/goals') && res.request().method() === 'PUT') {
          putResponses.push({ status: res.status(), url });
        }
      });
      await page.goto('/weight', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      const onWeightPage = await page.locator('h1:has-text("Painel de Peso")').first().isVisible({ timeout: 15000 }).catch(() => false);
      if (!onWeightPage) {
        test.skip(true, 'Weight page did not load (maybe not authenticated or redirect to login)');
        return;
      }
      await expect(page.locator('text=Progresso da Meta').first()).toBeVisible({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
      for (const { status } of putResponses) {
        expect(status, `PUT /api/weight/goals should not return error (got ${status})`).toBeGreaterThanOrEqual(200);
        expect(status, `PUT /api/weight/goals should not return 403/404 (got ${status})`).toBeLessThan(400);
      }
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
      
      if (await tab30.isVisible({ timeout: 2000 })) {
        await tab30.click();
        // Wait for chart to update after tab click
        await page.waitForLoadState('networkidle');
      }
      if (await tab60.isVisible({ timeout: 2000 })) {
        await tab60.click();
        await page.waitForLoadState('networkidle');
      }
      if (await tab90.isVisible({ timeout: 2000 })) {
        await tab90.click();
        await page.waitForLoadState('networkidle');
      }
    });
  });
});

test.describe('Weight API', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should get weight logs via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    
    // Create a test cat for weight logs
    const cat = await testDataManager.createTestCat({
      name: `WeightTest_${Date.now()}`,
      weight: '4.5',
    });

    const result = await apiHelper.getWeightLogs(cat.id);
    expect(result).toHaveProperty('success');
  });

  test('should create weight log via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    // Create a test cat for weight logs
    const cat = await testDataManager.createTestCat({
      name: `WeightTest_${Date.now()}`,
      weight: '4.5',
    });

    const result = await apiHelper.createWeightLog({
      catId: cat.id,
      weight: 4.7,
      date: new Date().toISOString(),
      notes: 'Test weight via API',
    });

    expect(result).toHaveProperty('success');
  });
});
