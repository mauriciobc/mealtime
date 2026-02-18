import { type Page, type Locator, expect } from '@playwright/test';

export class SchedulesPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly newScheduleButton: Locator;
  readonly emptyState: Locator;
  readonly activeSchedulesHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /agendamentos/i });
    this.newScheduleButton = page.locator('a[href="/schedules/new"]').or(
      page.getByRole('link', { name: /novo agendamento/i })
    );
    this.emptyState = page.getByText(/sem agendamentos|cadastrar gato|criar primeiro agendamento|sem residência associada/i);
    this.activeSchedulesHeading = page.getByRole('heading', { name: /agendamentos ativos/i });
  }

  async goto() {
    await this.page.goto('/schedules');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnSchedulesPage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }

  async clickNewSchedule() {
    await this.newScheduleButton.first().click();
  }
}
