import { type Page, type Locator, expect } from '@playwright/test';

export class StatisticsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly registerFeedingLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Estatísticas"), h1:has-text("Consumo")').first();
    this.registerFeedingLink = page.getByRole('link', { name: /registrar alimentação/i });
  }

  async goto() {
    await this.page.goto('/statistics');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnStatisticsPage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }
}
