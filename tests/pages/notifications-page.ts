import { type Page, type Locator, expect } from '@playwright/test';

export class NotificationsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly backButton: Locator;
  readonly markAllReadButton: Locator;
  readonly notificationItems: Locator;
  readonly emptyState: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Notificações"), h2:has-text("Notificações")').first();
    this.backButton = page.locator('button[aria-label="Voltar"]').first();
    this.markAllReadButton = page.locator('button:has-text("Marcar todas lidas")').first();
    this.notificationItems = page.locator('[class*="card"]').first();
    this.emptyState = page.getByText(/nenhuma notificação|você não tem/i).first();
    this.errorMessage = page.locator('div[class*="bg-destructive"]').first();
    this.loadingSpinner = page.locator('div[class*="spinner"]').first();
  }

  async goto() {
    await this.page.goto('/notifications');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnNotificationsPage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }

  async clickMarkAllRead() {
    if (await this.markAllReadButton.isVisible({ timeout: 3000 })) {
      await this.markAllReadButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async clickBack() {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async hasNotifications(): Promise<boolean> {
    return this.notificationItems.isVisible().catch(() => false);
  }

  async hasEmptyState(): Promise<boolean> {
    return this.emptyState.isVisible().catch(() => false);
  }
}
