import { type Page, type Locator, expect } from '@playwright/test';

export class FeedingsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly addFeedingButton: Locator;
  readonly feedingTimeline: Locator;
  readonly feedingItems: Locator;
  readonly noFeedingsEmptyState: Locator;
  readonly searchInput: Locator;
  readonly sortButton: Locator;
  readonly bottomNav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:visible, [class*="page-title"]:visible');
    this.addFeedingButton = page.locator('a[href="/feedings/new"]:visible, button:visible:has-text("Registrar"), a:visible:has-text("Registrar Alimentação")').first();
    this.feedingTimeline = page.locator('[class*="timeline"], [class*="Timeline"]');
    this.feedingItems = page.locator('[class*="feeding"]:visible, [class*="Feeding"]:visible, [class*="log"]:visible');
    this.noFeedingsEmptyState = page.locator('text=Nenhum registro encontrado:visible, text=Nenhuma alimentação:visible');
    this.searchInput = page.locator('input[placeholder*="Buscar"]:visible, input[placeholder*="Search"]:visible');
    this.sortButton = page.locator('button:visible[aria-label*="Ordenar"], button:visible[title*="Ordenar"]');
    this.bottomNav = page.locator('[class*="bottom-nav"]:visible');
  }

  async goto() {
    await this.page.goto('/feedings');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnFeedingsPage() {
    await expect(this.pageTitle).toBeVisible();
  }

  async expectNoFeedingsState() {
    await expect(this.noFeedingsEmptyState).toBeVisible();
  }

  async expectFeedingItems(count?: number) {
    if (count !== undefined) {
      await expect(this.feedingItems).toHaveCount(count);
    } else {
      await expect(this.feedingItems.first()).toBeVisible();
    }
  }

  async clickAddFeeding() {
    await this.addFeedingButton.click();
  }

  async searchForFeeding(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    // Wait for search results to update
    await this.page.waitForLoadState('networkidle');
  }

  async clickOnFeedingItem(feedingLogId: string) {
    await this.page.locator(`[data-id="${feedingLogId}"]`).click();
  }
}
