import { test, expect } from './fixtures/test-fixtures';

test.describe('Household Management', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test.describe('Household Creation', () => {
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

    test('should display households page', async ({ page }) => {
      await page.goto('/households');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1:has-text("Minhas Residências")').first()).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to new household page', async ({ page }) => {
      await page.goto('/households/new');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1:has-text("Novo Domicílio")').first()).toBeVisible({ timeout: 10000 });
    });

    test('should create household via API', async ({ apiHelper, testUser, testDataManager }) => {
      await apiHelper.authenticate(testUser.email, testUser.password);

      const householdName = `TestHousehold_${Date.now()}`;
      const result = await apiHelper.createHousehold({
        name: householdName,
        description: 'Created via E2E test',
      });

      expect(result).toHaveProperty('success');

      const resultData = result as { success: boolean; data?: { id: string } };
      if (resultData.success && resultData.data?.id) {
        await testDataManager.cleanupTestData();
      }
    });
  });

  test.describe('Household Edition', () => {
    test.beforeEach(async ({ loginPage, testUser, page }) => {
      await loginPage.goto();
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[name="email"], input#email').first();
      if (await emailInput.isVisible()) {
        await loginPage.login(testUser.email, testUser.password);
      }
    });

    test('should navigate to household management page', async ({ page, testUser }) => {
      if (testUser.householdId) {
        await page.goto(`/households/${testUser.householdId}`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1, h3').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('should navigate to household edit page', async ({ page, testUser }) => {
      if (testUser.householdId) {
        await page.goto(`/households/${testUser.householdId}/edit`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('h1:has-text("Editar Residência")').first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('should update household name via API', async ({ apiHelper, testUser }) => {
      if (!testUser.householdId) {
        test.skip(true, 'No household ID configured');
        return;
      }

      await apiHelper.authenticate(testUser.email, testUser.password);

      const newName = `UpdatedHousehold_${Date.now()}`;
      const result = await apiHelper.put(`/api/v2/households/${testUser.householdId}`, {
        name: newName,
      });

      expect(result).toHaveProperty('success', true);
    });
  });

  test.describe('Household Navigation', () => {
    test.beforeEach(async ({ loginPage, testUser, page }) => {
      await loginPage.goto();
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[name="email"], input#email').first();
      if (await emailInput.isVisible()) {
        await loginPage.login(testUser.email, testUser.password);
      }
    });

    test('should display household cards', async ({ page }) => {
      await page.goto('/households');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h3:visible').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display household tabs (Members, Cats)', async ({ page, testUser }) => {
      if (testUser.householdId) {
        await page.goto(`/households/${testUser.householdId}`);
        await page.waitForLoadState('networkidle');
        
        await expect(page.locator('button:has-text("Membros")').first()).toBeVisible({ timeout: 5000 });
        await expect(page.locator('button:has-text("Gatos")').first()).toBeVisible();
      }
    });
  });
});

test.describe('Household API', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should create household via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const householdName = `API_Household_${Date.now()}`;
    const result = await apiHelper.createHousehold({
      name: householdName,
      description: 'Created via E2E test',
    });

    expect(result).toHaveProperty('success');

    const resultData = result as { success: boolean; data?: { id: string } };
    if (resultData.success && resultData.data?.id) {
      await testDataManager.cleanupTestData();
    }
  });

  test('should get households via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getHouseholds();
    expect(result).toHaveProperty('success');
  });
});
