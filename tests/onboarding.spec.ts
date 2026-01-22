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
      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await tourCard.waitFor({ state: 'visible', timeout: 5000 });
      await expect(tourCard).toContainText('Bem-vindo ao MealTime');
    });

    test('should show all 6 steps', async ({ page }) => {
      await page.goto('/');
      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await tourCard.waitFor({ state: 'visible', timeout: 5000 });

      const steps = [
        'Bem-vindo ao MealTime',
        'Seus Gatos',
        'Domicílios',
        'Agenda',
        'Peso',
        'Estatísticas',
      ];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await expect(tourCard).toContainText(step, { timeout: 5000 });

        if (i < steps.length - 1) {
          await page.getByRole('button', { name: 'Próximo' }).click();
          // Wait for the next step to appear, which indicates the transition is complete
          await expect(tourCard).toContainText(steps[i + 1], { timeout: 5000 });
        }
      }
    });

    test('should not trigger after completion', async ({ page }) => {
      await page.goto('/');
      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await tourCard.waitFor({ state: 'visible', timeout: 5000 });

      // Complete the tour
      const nextButton = page.getByRole('button', { name: 'Próximo' });
      for (let i = 0; i < 5; i++) {
        await nextButton.click();
      }
      await page.getByRole('button', { name: 'Concluir' }).click();
      await tourCard.waitFor({ state: 'hidden', timeout: 5000 });

      // Reload and verify tour doesn't show
      await page.reload();
      await page.waitForTimeout(1000); // Allow time for the page to re-render
      await expect(tourCard).not.toBeVisible();
    });

    test('should not trigger on auth pages', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await expect(tourCard).not.toBeVisible();
    });
  });

  test.describe('Weight Page Tour', () => {
    test.skip('should trigger on weight page', async ({ page }) => {
      // Skipped: Weight page requires cats data to be loaded which needs full auth setup
      await page.goto('/weight');
      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await tourCard.waitFor({ state: 'visible', timeout: 5000 });
      await expect(tourCard).toContainText('Rastreamento de Peso');
    });

    test.skip('should show all 6 weight steps', async ({ page }) => {
      // Skipped: Weight page requires cats data to be loaded which needs full auth setup
      await page.goto('/weight');
      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await tourCard.waitFor({ state: 'visible', timeout: 5000 });

      const steps = [
        'Bem-vindo ao Rastreamento de Peso',
        'Visão Geral do Painel',
        'Registrando Novos Pesos',
        'Acompanhando o Progresso',
        'Visualizando o Histórico',
        'Pronto para Começar',
      ];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await expect(tourCard).toContainText(step, { timeout: 5000 });
        if (i < steps.length - 1) {
          await page.getByRole('button', { name: 'Próximo' }).click();
          await expect(tourCard).toContainText(steps[i + 1], { timeout: 5000 });
        }
      }
    });
  });

  test.describe('localStorage Management', () => {
    test('should create correct storage key after first tour completion', async ({ page }) => {
      await page.goto('/');
      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await tourCard.waitFor({ state: 'visible', timeout: 5000 });

      // Complete the tour
      const nextButton = page.getByRole('button', { name: 'Próximo' });
      for (let i = 0; i < 5; i++) {
        await nextButton.click();
      }
      await page.getByRole('button', { name: 'Concluir' }).click();
      await tourCard.waitFor({ state: 'hidden', timeout: 5000 });

      const storageValue = await page.evaluate(
        (key) => localStorage.getItem(key),
        LOCAL_STORAGE_KEYS.firstVisit
      );
      expect(storageValue).toBe('true');
    });

    test.skip('should have separate storage keys for different tours', async ({ page }) => {
      // Skipped: Weight page requires cats data to be loaded which needs full auth setup
      await page.goto('/');
      const tourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await tourCard.waitFor({ state: 'visible', timeout: 5000 });

      // Complete first tour
      const nextButton = page.getByRole('button', { name: 'Próximo' });
      for (let i = 0; i < 5; i++) {
        await nextButton.click();
      }
      await page.getByRole('button', { name: 'Concluir' }).click();
      await tourCard.waitFor({ state: 'hidden', timeout: 5000 });

      // Weight tour should still be available
      await page.goto('/weight');
      const weightTourCard = page.locator('[class*="border-2"][class*="shadow-xl"]').first();
      await weightTourCard.waitFor({ state: 'visible', timeout: 5000 });
      await expect(weightTourCard).toContainText('Rastreamento de Peso');
    });
  });
});
