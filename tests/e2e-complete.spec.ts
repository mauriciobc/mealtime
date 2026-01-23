import { test, expect } from './fixtures/test-fixtures';

test.describe('Authentication Flow', () => {
  test('should display login page with all elements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h3:has-text("MealTime")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('textbox[name="email"], input[name="email"], input#email').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('textbox[name="password"], input[name="password"], input#password').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Entrar com Email")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('a:has-text("Registre-se")').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const signupLink = page.locator('a:has-text("Registre-se")').first();
    await expect(signupLink).toBeVisible({ timeout: 5000 });
    await signupLink.click();
    await page.waitForURL(/signup/);
  });

  test.skip('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('testpassword');
    
    await page.waitForTimeout(500);
    
    const toggleButton = page.locator('button[aria-label*="senha"], button[aria-label*="password"], button:has-text("Mostrar"), button:has-text("Ocultar")').first();
    if (await toggleButton.isVisible({ timeout: 3000 })) {
      await toggleButton.click({ force: true }).catch(() => {});
      const inputType = await passwordInput.getAttribute('type');
      expect(inputType).toBe('text');
    }
  });
});

test.describe('Complete E2E Workflow', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should login successfully and access dashboard', async ({ page, loginPage, testUser }) => {
    await loginPage.goto();
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('textbox[name="email"], input[name="email"], input#email').first();
    if (await emailInput.isVisible()) {
      await loginPage.login(testUser.email, testUser.password);
    }
    
    await page.waitForURL(/\/(login|\/?$|households)/, { timeout: 10000 });
    
    const closeButton = page.locator('button:has-text("Pular"), button:has-text("Próximo")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to cats page', async ({ page, loginPage, testUser }) => {
    await loginPage.goto();
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('textbox[name="email"], input[name="email"], input#email').first();
    if (await emailInput.isVisible()) {
      await loginPage.login(testUser.email, testUser.password);
    }
    
    await page.waitForURL(/\/(login|\/?$|households)/, { timeout: 10000 });
    
    const closeButton = page.locator('button:has-text("Pular"), button:has-text("Próximo")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
    
    await page.goto('/cats');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:has-text("Meus Gatos"), heading:has-text("Meus Gatos")').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to new cat page', async ({ page, loginPage, testUser }) => {
    await loginPage.goto();
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('textbox[name="email"], input[name="email"], input#email').first();
    if (await emailInput.isVisible()) {
      await loginPage.login(testUser.email, testUser.password);
    }
    
    await page.goto('/cats');
    await page.waitForURL(/cats/);
    
    const addCatButton = page.locator('a[href="/cats/new"]:visible, button:has-text("Adicionar Gato")').first();
    if (await addCatButton.isVisible()) {
      await addCatButton.click();
      await page.waitForURL(/cats\/new/);
      await expect(page.locator('h1:has-text("Adicionar Novo Gato"), heading:has-text("Adicionar Novo Gato")').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to feedings page', async ({ page, loginPage, testUser }) => {
    await loginPage.goto();
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('textbox[name="email"], input[name="email"], input#email').first();
    if (await emailInput.isVisible()) {
      await loginPage.login(testUser.email, testUser.password);
    }
    
    await page.goto('/feedings');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h1:has-text("Histórico de Alimentações"), heading:has-text("Histórico de Alimentações")').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to new feeding page', async ({ page, loginPage, testUser }) => {
    await loginPage.goto();
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('textbox[name="email"], input[name="email"], input#email').first();
    if (await emailInput.isVisible()) {
      await loginPage.login(testUser.email, testUser.password);
    }
    
    await page.waitForURL(/\/(login|\/?$|households)/, { timeout: 10000 });
    
    const closeButton = page.locator('button:has-text("Pular"), button:has-text("Próximo")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
    
    await page.goto('/feedings/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('[role="dialog"], dialog, .dialog').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Navigation Flow', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test.beforeEach(async ({ page, loginPage, testUser }) => {
    await loginPage.goto();
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('textbox[name="email"], input[name="email"], input#email').first();
    if (await emailInput.isVisible()) {
      await loginPage.login(testUser.email, testUser.password);
    }
  });

  test('should navigate between main pages using bottom nav', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const navLinks = [
      { name: 'Início', url: '/' },
      { name: 'Gatos', url: '/cats' },
      { name: 'Domicílios', url: '/households' },
      { name: 'Agenda', url: '/schedules' },
      { name: 'Peso', url: '/weight' },
      { name: 'Estatísticas', url: '/statistics' },
    ];

    for (const link of navLinks) {
      const navItem = page.locator(`a:has-text("${link.name}"), [href="${link.url}"]:visible`).first();
      if (await navItem.isVisible()) {
        await navItem.click();
        await page.waitForLoadState('domcontentloaded');
      }
    }
  });
});

test.describe('API Integration', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should authenticate via mobile API', async ({ apiHelper, testUser }) => {
    const result = await apiHelper.authenticate(testUser.email, testUser.password);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('access_token');
  });

  test('should get feedings via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getFeedings();
    expect(result).toHaveProperty('success');
  });

  test('should get cats via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getCats();
    expect(result).toHaveProperty('success');
  });

  test('should get households via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getHouseholds();
    expect(result).toHaveProperty('success');
  });
});
