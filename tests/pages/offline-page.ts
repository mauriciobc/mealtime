import { type Page, type Locator, expect } from '@playwright/test';

export class OfflinePage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /você está offline/i });
    this.retryButton = page.getByRole('button', { name: /tentar novamente/i });
  }

  async goto() {
    await this.page.goto('/offline');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnOfflinePage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }
}
