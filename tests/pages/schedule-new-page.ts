import { type Page, type Locator, expect } from '@playwright/test';

export class ScheduleNewPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly catSelect: Locator;
  readonly createButton: Locator;
  readonly intervalInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /novo agendamento/i });
    this.catSelect = page.locator('[role="combobox"]').or(page.locator('select')).first();
    this.createButton = page.getByRole('button', { name: /criar agendamento|criando/i });
    this.intervalInput = page.locator('input[id*="interval"], input[name*="interval"]');
  }

  async goto() {
    await this.page.goto('/schedules/new');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnNewSchedulePage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }

  async clickCreate() {
    await this.createButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}
