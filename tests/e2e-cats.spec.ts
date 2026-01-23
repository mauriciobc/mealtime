import { test, expect } from './fixtures/test-fixtures';

test.describe('Cat Management', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test.describe('Cat Creation', () => {
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

    test('should display cats page', async ({ page }) => {
      await page.goto('/cats');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1:has-text("Meus Gatos")').first()).toBeVisible({ timeout: 10000 });
    });

    test('should navigate directly to new cat page', async ({ page }) => {
      await page.goto('/cats/new');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1:has-text("Adicionar Novo Gato")').first()).toBeVisible({ timeout: 10000 });
    });

    test('should create a new cat via API and verify', async ({ apiHelper, testUser, page }) => {
      await apiHelper.authenticate(testUser.email, testUser.password);

      const catName = `Miau_${Date.now()}`;
      const result = await apiHelper.createCat({
        name: catName,
        weight: '4.5',
        portionSize: '50',
        portionUnit: 'g',
      });

      expect(result).toHaveProperty('success');
      
      await page.goto('/cats');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1:has-text("Meus Gatos")').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Cat Edition', () => {
    test.beforeEach(async ({ loginPage, testUser, page }) => {
      await loginPage.goto();
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[name="email"], input#email').first();
      if (await emailInput.isVisible()) {
        await loginPage.login(testUser.email, testUser.password);
      }
    });

    test('should navigate to cat edit page', async ({ page }) => {
      const catId = 'bb45639d-c013-4124-ae0d-6193369a228c';
      await page.goto(`/cats/${catId}/edit`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1:has-text("Editar")').first()).toBeVisible({ timeout: 10000 });
    });

    test('should update cat name via API', async ({ apiHelper, testUser }) => {
      await apiHelper.authenticate(testUser.email, testUser.password);

      const newName = `Updated_${Date.now()}`;
      const result = await apiHelper.updateCat('bb45639d-c013-4124-ae0d-6193369a228c', {
        name: newName,
      });

      expect(result).toHaveProperty('success', true);
    });

    test('should update cat weight via API', async ({ apiHelper, testUser }) => {
      await apiHelper.authenticate(testUser.email, testUser.password);

      const result = await apiHelper.updateCat('bb45639d-c013-4124-ae0d-6193369a228c', {
        weight: '5.0',
      });

      expect(result).toHaveProperty('success', true);
    });

    test('should update feeding interval via API', async ({ apiHelper, testUser }) => {
      await apiHelper.authenticate(testUser.email, testUser.password);

      const result = await apiHelper.updateCat('bb45639d-c013-4124-ae0d-6193369a228c', {
        feedingInterval: 6,
      });

      expect(result).toHaveProperty('success', true);
    });
  });

  test.describe('Cat Navigation', () => {
    test.beforeEach(async ({ loginPage, testUser, page }) => {
      await loginPage.goto();
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[name="email"], input#email').first();
      if (await emailInput.isVisible()) {
        await loginPage.login(testUser.email, testUser.password);
      }
    });

    test('should display cat cards on cats page', async ({ page }) => {
      await page.goto('/cats');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('img[alt*="Photo"]').first()).toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe('Cat API', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should get cats via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getCats();
    expect(result).toHaveProperty('success');
  });

  test('should create cat via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const catName = `API_Cat_${Date.now()}`;
    const result = await apiHelper.createCat({
      name: catName,
      weight: '4.5',
      portionSize: '50',
      portionUnit: 'g',
    });

    expect(result).toHaveProperty('success');

    const resultData = result as { success: boolean; data?: { id: string } };
    if (resultData.success && resultData.data?.id) {
      await testDataManager.cleanupTestData();
    }
  });
});
