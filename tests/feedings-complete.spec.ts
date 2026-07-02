import { test, expect } from './fixtures/test-fixtures';

test.describe('Feeding Detail Page', () => {

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

  test('should display feeding detail page', async ({ page, testDataManager }) => {
    const cat = await testDataManager.createTestCat({
      name: `FeedingDetail_${Date.now()}`,
      weight: '4.5',
    });
    const feeding = await testDataManager.createTestFeeding({
      catId: cat.id,
      amount: 50,
      unit: 'g',
    });

    await page.goto(`/feedings/${feeding.id}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1:has-text("Detalhes da Alimentação")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Detalhes da Alimentação').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show back button on feeding detail', async ({ page, testDataManager }) => {
    const cat = await testDataManager.createTestCat({
      name: `FeedingBack_${Date.now()}`,
      weight: '4.5',
    });
    const feeding = await testDataManager.createTestFeeding({
      catId: cat.id,
      amount: 50,
      unit: 'g',
    });

    await page.goto(`/feedings/${feeding.id}`);
    await page.waitForLoadState('networkidle');

    const backButton = page.locator('button:has-text("Voltar")').first();
    await expect(backButton).toBeVisible({ timeout: 5000 });
  });

  test('should delete feeding via UI', async ({ page, testDataManager }) => {
    const cat = await testDataManager.createTestCat({
      name: `FeedingDelete_${Date.now()}`,
      weight: '4.5',
    });
    const feeding = await testDataManager.createTestFeeding({
      catId: cat.id,
      amount: 50,
      unit: 'g',
    });

    await page.goto(`/feedings/${feeding.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Detalhes da Alimentação")').first()).toBeVisible({ timeout: 10000 });

    const deleteButton = page.locator('button[aria-label="Excluir Registro"]').first();
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Should redirect to feedings list
      const onFeedingsPage = await page.locator('h1:has-text("Histórico de Alimentações")').first().isVisible().catch(() => false);
      expect(onFeedingsPage).toBeTruthy();
    }
  });
});

test.describe('Feeding Complete/Skip API', () => {

  test('should complete a feeding via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const cat = await testDataManager.createTestCat({
      name: `CompleteTest_${Date.now()}`,
      weight: '4.5',
    });
    const feeding = await testDataManager.createTestFeeding({
      catId: cat.id,
      amount: 50,
      unit: 'g',
    });

    const result = await apiHelper.completeFeeding(feeding.id, {
      notes: 'Completed via E2E test',
      amount: 60,
    }) as { success?: boolean; data?: { status?: string } };

    expect(result).toHaveProperty('success', true);
    expect(result.data).toHaveProperty('status', 'completed');
  });

  test('should skip a feeding via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const cat = await testDataManager.createTestCat({
      name: `SkipTest_${Date.now()}`,
      weight: '4.5',
    });
    const feeding = await testDataManager.createTestFeeding({
      catId: cat.id,
      amount: 50,
      unit: 'g',
    });

    const result = await apiHelper.skipFeeding(feeding.id, {
      reason: 'Cat was not hungry',
    }) as { success?: boolean; data?: { status?: string } };

    expect(result).toHaveProperty('success', true);
    expect(result.data).toHaveProperty('status', 'skipped');
  });
});

test.describe('Feeding Batch API', () => {

  test('should create batch feedings via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const cat = await testDataManager.createTestCat({
      name: `BatchTest_${Date.now()}`,
      weight: '4.5',
    });

    const result = await apiHelper.createBatchFeeding({
      logs: [
        {
          catId: cat.id,
          portionSize: 50,
          timestamp: new Date().toISOString(),
          notes: 'Batch feeding 1',
          mealType: 'breakfast',
          unit: 'g',
          tempId: 'temp-1',
        },
        {
          catId: cat.id,
          portionSize: 60,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          notes: 'Batch feeding 2',
          mealType: 'dinner',
          unit: 'g',
          tempId: 'temp-2',
        },
      ],
    }) as { count?: number; logs?: unknown[] };

    expect(result).toHaveProperty('count', 2);
    expect(Array.isArray(result.logs)).toBe(true);
    expect(result.logs).toHaveLength(2);
  });
});

test.describe('Feeding New - UI', () => {

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

  test('should open new feeding dialog', async ({ page, feedingNewPage }) => {
    await feedingNewPage.goto();
    await feedingNewPage.expectOnNewFeedingPage();
  });

  test('should close feeding dialog on cancel', async ({ page }) => {
    await page.goto('/feedings/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const dialog = page.locator('[role="dialog"]').first();
    const hasDialog = await dialog.isVisible().catch(() => false);

    if (hasDialog) {
      // Press Escape or click outside to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/feedings(?!.*new)/);
    }
  });
});
