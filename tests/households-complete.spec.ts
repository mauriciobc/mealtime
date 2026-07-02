import { test, expect } from './fixtures/test-fixtures';

test.describe('Household Edit - UI', () => {

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

  test('should display household edit page', async ({ page, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({
      name: `EditHousehold_${Date.now()}`,
    });

    await page.goto(`/households/${household.id}/edit`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1:has-text("Editar Residência")').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input#name').first()).toBeVisible({ timeout: 5000 });
  });

  test('should update household name via UI', async ({ page, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({
      name: `UpdateHousehold_${Date.now()}`,
    });

    await page.goto(`/households/${household.id}/edit`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Editar Residência")').first()).toBeVisible({ timeout: 15000 });

    const nameInput = page.locator('input#name').first();
    await nameInput.clear();
    const newName = `UpdatedHousehold_${Date.now()}`;
    await nameInput.fill(newName);

    const saveButton = page.locator('button:has-text("Salvar Alterações")').first();
    await saveButton.click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify redirect to household detail
    await expect(page).toHaveURL(new RegExp(`/households/${household.id}$`));
  });

  test('should cancel household edit', async ({ page, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({
      name: `CancelHousehold_${Date.now()}`,
    });

    await page.goto(`/households/${household.id}/edit`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Editar Residência")').first()).toBeVisible({ timeout: 15000 });

    const cancelButton = page.locator('button:has-text("Cancelar")').first();
    await cancelButton.click();

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(new RegExp(`/households/${household.id}$`));
  });

  test('should show validation for empty household name', async ({ page, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({
      name: `ValidationHousehold_${Date.now()}`,
    });

    await page.goto(`/households/${household.id}/edit`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Editar Residência")').first()).toBeVisible({ timeout: 15000 });

    const nameInput = page.locator('input#name').first();
    await nameInput.clear();

    const saveButton = page.locator('button:has-text("Salvar Alterações")').first();
    // Button should be disabled when name is empty
    const isDisabled = await saveButton.isDisabled().catch(() => false);
    expect(isDisabled).toBeTruthy();
  });
});

test.describe('Household Cats Page', () => {

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

  test('should display household cats page', async ({ page, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({
      name: `CatsHousehold_${Date.now()}`,
    });

    await page.goto(`/households/${household.id}/cats`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1:has-text("Cats")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show add cat button on household cats page', async ({ page, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({
      name: `AddCatHousehold_${Date.now()}`,
    });

    await page.goto(`/households/${household.id}/cats`);
    await page.waitForLoadState('networkidle');

    const addCatButton = page.locator('a[href*="/cats/new"], button:has-text("Adicionar")').first();
    const hasAddButton = await addCatButton.isVisible().catch(() => false);
    expect(hasAddButton).toBeTruthy();
  });
});

test.describe('Household Invite Features', () => {

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

  test('should display invite page with tabs', async ({ page, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({
      name: `InviteHousehold_${Date.now()}`,
    });

    await page.goto(`/households/${household.id}/members/invite`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1:has-text("Convidar Membros")').first()).toBeVisible({ timeout: 15000 });

    // Should have email and link tabs
    const emailTab = page.locator('button:has-text("Via E-mail")').first();
    const linkTab = page.locator('button:has-text("Via Link")').first();
    await expect(emailTab).toBeVisible({ timeout: 5000 });
    await expect(linkTab).toBeVisible({ timeout: 5000 });
  });

  test('should display invite link section', async ({ page, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({
      name: `LinkHousehold_${Date.now()}`,
    });

    await page.goto(`/households/${household.id}/members/invite`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Convidar Membros")').first()).toBeVisible({ timeout: 15000 });

    // Click on link tab
    const linkTab = page.locator('button:has-text("Via Link")').first();
    await linkTab.click();
    await page.waitForTimeout(500);

    // Should show invite link input or regenerate button
    const hasLinkInput = await page.locator('input#invite-link').first().isVisible().catch(() => false);
    const hasRegenerateButton = await page.locator('button[title*="Gerar novo código"]').first().isVisible().catch(() => false);
    expect(hasLinkInput || hasRegenerateButton).toBeTruthy();
  });

  test('should copy invite link', async ({ page, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({
      name: `CopyLinkHousehold_${Date.now()}`,
    });

    await page.goto(`/households/${household.id}/members/invite`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Convidar Membros")').first()).toBeVisible({ timeout: 15000 });

    // Click on link tab
    const linkTab = page.locator('button:has-text("Via Link")').first();
    await linkTab.click();
    await page.waitForTimeout(500);

    const copyButton = page.locator('button[title="Copiar link"]').first();
    if (await copyButton.isVisible({ timeout: 3000 })) {
      await copyButton.click();
      await page.waitForTimeout(1000);
      // Toast should appear
      const toast = page.locator('[data-sonner-toast]').first();
      const hasToast = await toast.isVisible().catch(() => false);
      expect(hasToast).toBeTruthy();
    }
  });
});

test.describe('Household Detail Page', () => {

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

  test('should display household detail page', async ({ page, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({
      name: `DetailHousehold_${Date.now()}`,
    });

    await page.goto(`/households/${household.id}`);
    await page.waitForLoadState('networkidle');

    // Should show some content
    const hasHeading = await page.locator('h1, h2, h3').first().isVisible().catch(() => false);
    expect(hasHeading).toBeTruthy();
  });

  test('should show household tabs', async ({ page, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({
      name: `TabsHousehold_${Date.now()}`,
    });

    await page.goto(`/households/${household.id}`);
    await page.waitForLoadState('networkidle');

    const membersTab = page.locator('button:has-text("Membros")').first();
    const catsTab = page.locator('button:has-text("Gatos")').first();

    const hasMembersTab = await membersTab.isVisible().catch(() => false);
    const hasCatsTab = await catsTab.isVisible().catch(() => false);

    expect(hasMembersTab || hasCatsTab).toBeTruthy();
  });
});

test.describe('Household API - Detail & Members', () => {

  test('should get household detail via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const household = await testDataManager.createTestHousehold({
      name: `APIDetail_${Date.now()}`,
    });

    const result = await apiHelper.getHouseholdDetail(household.id) as { success?: boolean; data?: { id: string; name: string } };
    expect(result).toHaveProperty('success', true);
    expect(result.data).toHaveProperty('id', household.id);
  });

  test('should get household cats via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const household = await testDataManager.createTestHousehold({
      name: `APICats_${Date.now()}`,
    });

    const result = await apiHelper.getHouseholdCats(household.id) as { success?: boolean; data?: unknown[] };
    expect(result).toHaveProperty('success', true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  test('should get household members via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const household = await testDataManager.createTestHousehold({
      name: `APIMembers_${Date.now()}`,
    });

    const result = await apiHelper.getHouseholdMembers(household.id) as { success?: boolean; data?: unknown[] };
    expect(result).toHaveProperty('success', true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});
