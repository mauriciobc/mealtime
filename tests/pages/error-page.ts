import { type Page, type Locator, expect } from '@playwright/test';

export class ErrorPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly retryButton: Locator;
  readonly homeLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading').first();
    this.retryButton = page.getByRole('button', { name: /tentar novamente|muitas tentativas/i });
    this.homeLink = page.getByRole('link', { name: /ir para início|início/i });
  }

  async goto(message?: string) {
    const url = message ? `/error?message=${encodeURIComponent(message)}` : '/error';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnErrorPage() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
    await expect(this.retryButton.or(this.homeLink)).toBeVisible({ timeout: 5000 });
  }
}
