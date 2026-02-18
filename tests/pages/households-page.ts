import { type Page, type Locator, expect } from '@playwright/test';

export class HouseholdsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly newHouseholdButton: Locator;
  readonly householdCards: Locator;
  readonly householdNames: Locator;
  readonly manageLinks: Locator;
  readonly optionsButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use getByRole for headings
    this.pageTitle = page.getByRole('heading', { name: /minhas residências|my households/i }).or(
      page.locator('h1:visible').first()
    );
    // Use getByRole for links and buttons
    this.newHouseholdButton = page.getByRole('link', { name: /nova residência|new household|criar nova/i }).or(
      page.getByRole('button', { name: /nova residência|new household/i })
    ).or(page.locator('a[href="/households/new"]:visible')).first();
    // Use more generic selectors for cards (structural elements)
    this.householdCards = page.locator('[class*="household-card"], [class*="HouseholdCard"], [class*="residence"], article').first();
    // Use getByRole for headings within cards
    this.householdNames = page.getByRole('heading', { level: 3 }).or(
      page.locator('h3:visible')
    );
    // Use getByRole for links
    this.manageLinks = page.getByRole('link', { name: /gerenciar|manage/i }).or(
      page.locator('a[href*="/households/"]:visible')
    ).first();
    // Use getByRole for buttons with accessible names
    this.optionsButton = page.getByRole('button', { name: /opções|options|abrir menu|open menu/i }).first();
    this.backButton = page.getByRole('button', { name: /voltar|back/i }).or(
      page.getByRole('link', { name: /voltar|back/i })
    ).first();
  }

  async goto() {
    await this.page.goto('/households');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnHouseholdsPage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }

  async clickNewHousehold() {
    await this.newHouseholdButton.click();
  }

  async getHouseholdCount(): Promise<number> {
    return this.householdNames.count();
  }

  async findHouseholdByName(name: string) {
    return this.page.getByRole('heading', { name: new RegExp(name, 'i') }).or(
      this.page.locator(`h3:has-text("${name}"), [class*="household"]:has-text("${name}")`)
    );
  }

  async clickManageOnHousehold(householdName: string) {
    // Find the household card first, then find the manage link within it
    const householdCard = this.page.getByRole('heading', { name: new RegExp(householdName, 'i') }).locator('..').locator('..');
    const manageLink = householdCard.getByRole('link', { name: /gerenciar|manage/i }).first();
    await manageLink.click();
  }

  async clickOptionsButton() {
    await this.optionsButton.click();
  }
}
