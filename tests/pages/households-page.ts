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
    this.pageTitle = page.locator('h1:has-text("Minhas Residências"), heading:has-text("Minhas Residências")').first();
    this.newHouseholdButton = page.locator('a[href="/households/new"]:visible, button:has-text("Nova Residência")').first();
    this.householdCards = page.locator('[class*="household-card"], [class*="HouseholdCard"], [class*="residence"]').first();
    this.householdNames = page.locator('h3:visible, [class*="household"]:has-text("Casa"), [class*="residence"]:has-text("Casa")');
    this.manageLinks = page.locator('a:has-text("Gerenciar"), [href*="/households/"]:visible').first();
    this.optionsButton = page.locator('button:has-text("Opções da Residência"), button:has-text("Abrir menu")').first();
    this.backButton = page.locator('button:has-text("Voltar"), a:has-text("Voltar")').first();
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
    return this.page.locator(`h3:has-text("${name}"), [class*="household"]:has-text("${name}")`);
  }

  async clickManageOnHousehold(householdName: string) {
    const manageLink = this.page.locator(`h3:has-text("${householdName}")`).locator('xpath=..').locator('a:has-text("Gerenciar")').first();
    await manageLink.click();
  }

  async clickOptionsButton() {
    await this.optionsButton.click();
  }
}
