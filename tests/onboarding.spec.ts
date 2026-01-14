import { test, expect } from '@playwright/test';

const LOCAL_STORAGE_KEYS = {
  firstVisit: 'mealtime-tour-seen-first-visit',
  weightPage: 'mealtime-tour-seen-weight-page',
};

test.describe('Onboarding Tours', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((keys) => {
      localStorage.removeItem(keys.firstVisit);
      localStorage.removeItem(keys.weightPage);
    }, LOCAL_STORAGE_KEYS);
  });

  test.describe('First Visit Tour', () => {
    test('should trigger on first visit to home page', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await expect(tourCard).toBeVisible();
      await expect(tourCard).toContainText('Bem-vindo ao MealTime');
    });

    test('should show all 6 steps', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      const steps = [
        'Bem-vindo ao MealTime',
        'Seus Gatos',
        'Domicílios',
        'Agenda',
        'Peso',
        'Estatísticas',
      ];

      for (const step of steps) {
        const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
        await expect(tourCard).toContainText(step, { timeout: 5000 });
        if (step !== 'Estatísticas') {
          await page.getByRole('button', { name: 'Próximo' }).click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should not trigger after completion', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // Complete the tour
      const nextButton = page.getByRole('button', { name: 'Próximo' });
      for (let i = 0; i < 5; i++) {
        await nextButton.click();
        await page.waitForTimeout(400);
      }
      await page.getByRole('button', { name: 'Concluir' }).click();
      await page.waitForTimeout(800);

      // Reload and verify tour doesn't show
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await expect(tourCard).not.toBeVisible();
    });

    test('should not trigger on auth pages', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await expect(tourCard).not.toBeVisible();
    });
  });

  test.describe('Weight Page Tour', () => {
    test.skip('should trigger on weight page', async ({ page }) => {
      // Skipped: Weight page requires cats data to be loaded which needs full auth setup
      await page.goto('/weight');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await expect(tourCard).toBeVisible();
      await expect(tourCard).toContainText('Rastreamento de Peso');
    });

    test.skip('should show all 6 weight steps', async ({ page }) => {
      // Skipped: Weight page requires cats data to be loaded which needs full auth setup
      await page.goto('/weight');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const steps = [
        'Bem-vindo ao Rastreamento de Peso',
        'Visão Geral do Painel',
        'Registrando Novos Pesos',
        'Acompanhando o Progresso',
        'Visualizando o Histórico',
        'Pronto para Começar',
      ];

      for (const step of steps) {
        const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
        await expect(tourCard).toContainText(step, { timeout: 5000 });
        if (step !== 'Pronto para Começar') {
          await page.getByRole('button', { name: 'Próximo' }).click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('localStorage Management', () => {
    test('should create correct storage key after first tour completion', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // Complete the tour
      const nextButton = page.getByRole('button', { name: 'Próximo' });
      for (let i = 0; i < 5; i++) {
        await nextButton.click();
        await page.waitForTimeout(400);
      }
      await page.getByRole('button', { name: 'Concluir' }).click();
      await page.waitForTimeout(800);

      const storageValue = await page.evaluate(() =>
        localStorage.getItem('mealtime-tour-seen-first-visit')
      );
      expect(storageValue).toBe('true');
    });

    test.skip('should have separate storage keys for different tours', async ({ page }) => {
      // Skipped: Weight page requires cats data to be loaded which needs full auth setup
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // Complete first tour
      const nextButton = page.getByRole('button', { name: 'Próximo' });
      for (let i = 0; i < 5; i++) {
        await nextButton.click();
        await page.waitForTimeout(400);
      }
      await page.getByRole('button', { name: 'Concluir' }).click();
      await page.waitForTimeout(800);

      // Weight tour should still be available
      await page.goto('/weight');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await expect(tourCard).toBeVisible();
      await expect(tourCard).toContainText('Rastreamento de Peso');
    });
  });
});
