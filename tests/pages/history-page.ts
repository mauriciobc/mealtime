import { type Page, type Locator, expect } from '@playwright/test';

export class HistoryPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly registerFeedingLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Histórico"), h2:has-text("Histórico")').first();
    this.registerFeedingLink = page.getByRole('link', { name: /registrar alimentação/i }).or(
      page.getByRole('button', { name: /registrar alimentação/i })
    );
  }

  async goto() {
    await this.page.goto('/history');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnHistoryPage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }
}
