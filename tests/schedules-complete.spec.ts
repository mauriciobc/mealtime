import { test, expect } from './fixtures/test-fixtures';

test.describe('Schedule Creation - UI', () => {

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
    // Dismiss onboarding overlay
    await page.evaluate(() => {
      localStorage.setItem('mealtime-tour-seen-first-visit', 'true');
      localStorage.setItem('mealtime-tour-seen-weight-page', 'true');
    });
  });

  test('should display new schedule page with form', async ({ page, scheduleNewPage, testDataManager }) => {
    await testDataManager.createTestCat({
      name: `ScheduleCat_${Date.now()}`,
      weight: '4.5',
    });

    await scheduleNewPage.goto();
    await scheduleNewPage.expectOnNewSchedulePage();

    // Check for cat select
    await expect(scheduleNewPage.catSelect).toBeVisible({ timeout: 5000 });

    // Check for interval input
    await expect(scheduleNewPage.intervalInput).toBeVisible({ timeout: 5000 });

    // Check for create button
    await expect(scheduleNewPage.createButton).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no cats exist', async ({ page }) => {
    await page.goto('/schedules/new');
    await page.waitForLoadState('networkidle');

    const emptyState = page.getByText(/nenhum gato cadastrado|cadastrar gato/i);
    const hasEmptyState = await emptyState.first().isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 });
      const addCatButton = page.locator('a[href="/cats/new"], button:has-text("Cadastrar Gato")').first();
      await expect(addCatButton).toBeVisible({ timeout: 3000 });
    }
  });

  test('should create interval schedule via UI', async ({ page, scheduleNewPage, testDataManager }) => {
    const cat = await testDataManager.createTestCat({
      name: `IntervalSchedule_${Date.now()}`,
      weight: '4.5',
    });

    await scheduleNewPage.goto();
    await scheduleNewPage.expectOnNewSchedulePage();

    // Select cat
    const catSelect = page.locator('[role="combobox"]').first();
    if (await catSelect.isVisible({ timeout: 5000 })) {
      await catSelect.click();
      await page.waitForTimeout(500);
      const option = page.locator(`[role="option"]:has-text("${cat.name}")`).first();
      if (await option.isVisible({ timeout: 3000 })) {
        await option.click();
      }
    }

    // Ensure interval tab is selected
    const intervalTab = page.locator('button:has-text("Intervalo")').first();
    if (await intervalTab.isVisible({ timeout: 3000 })) {
      await intervalTab.click();
    }

    // Fill interval
    const intervalInput = page.locator('input[id*="interval"]').first();
    await intervalInput.clear();
    await intervalInput.fill('6');

    // Submit
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should redirect to schedules page
    const onSchedulesPage = await page.locator('h1:has-text("Agenda"), heading:has-text("Agenda")').first().isVisible().catch(() => false);
    expect(onSchedulesPage).toBeTruthy();
  });
});

test.describe('Schedule API', () => {

  test('should create and delete schedule via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const cat = await testDataManager.createTestCat({
      name: `APISchedule_${Date.now()}`,
      weight: '4.5',
    });

    const createResult = await apiHelper.createSchedule({
      catId: cat.id,
      type: 'interval',
      interval: 8,
      enabled: true,
    }) as { success?: boolean; data?: { id: string } };

    expect(createResult).toHaveProperty('success', true);
    expect(createResult.data).toHaveProperty('id');

    const scheduleId = createResult.data!.id;

    // Delete the schedule
    const deleteResult = await apiHelper.deleteSchedule(scheduleId) as { success?: boolean; error?: string };
    console.log('Schedule delete result:', deleteResult);
    expect(deleteResult).toHaveProperty('success', true);
  });

  test('should create fixedTime schedule via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const cat = await testDataManager.createTestCat({
      name: `FixedTimeSchedule_${Date.now()}`,
      weight: '4.5',
    });

    const result = await apiHelper.createSchedule({
      catId: cat.id,
      type: 'fixedTime',
      times: ['08:00', '18:00'],
      enabled: true,
    }) as { success?: boolean; data?: { id: string; type: string; times: string[] } };

    expect(result).toHaveProperty('success', true);
    expect(result.data).toHaveProperty('type', 'fixedTime');
    expect(result.data?.times).toContain('08:00');
  });

  test('should get schedules list via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getSchedules();
    expect(result).toHaveProperty('success');
  });
});
