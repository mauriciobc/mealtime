import { type Page, type Locator, expect } from '@playwright/test';

export class NotificationsPage {
  readonly page: Page;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /notificações/i });
  }

  async goto() {
    await this.page.goto('/notifications');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnNotificationsPage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }
}
