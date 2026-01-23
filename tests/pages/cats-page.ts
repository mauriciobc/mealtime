import { type Page, type Locator, expect } from '@playwright/test';

export class CatsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly addCatButton: Locator;
  readonly catList: Locator;
  readonly catCards: Locator;
  readonly noCatsEmptyState: Locator;
  readonly noHouseholdEmptyState: Locator;
  readonly searchInput: Locator;
  readonly bottomNav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:visible, [class*="page-title"]:visible');
    this.addCatButton = page.locator('a[href="/cats/new"]:visible');
    this.catList = page.locator('[class*="cat-list"], [class*="CatList"]');
    this.catCards = page.locator('[class*="cat-card"]:visible, [class*="CatCard"]:visible, [class*="pet-card"]:visible');
    this.noCatsEmptyState = page.locator('text=Nenhum gato cadastrado:visible');
    this.noHouseholdEmptyState = page.locator('text=Sem Residência:visible');
    this.searchInput = page.locator('input[placeholder*="Buscar"]:visible, input[placeholder*="Search"]:visible');
    this.bottomNav = page.locator('[class*="bottom-nav"]:visible');
  }

  async goto() {
    await this.page.goto('/cats');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnCatsPage() {
    await expect(this.pageTitle).toBeVisible();
  }

  async expectNoCatsState() {
    await expect(this.noCatsEmptyState).toBeVisible();
  }

  async expectNoHouseholdState() {
    await expect(this.noHouseholdEmptyState).toBeVisible();
  }

  async expectCatCards(count?: number) {
    if (count !== undefined) {
      await expect(this.catCards).toHaveCount(count);
    } else {
      await expect(this.catCards.first()).toBeVisible();
    }
  }

  async clickAddCat() {
    await this.addCatButton.click();
  }

  async clickOnCat(catName: string) {
    await this.page.locator(`[class*="cat-card"]:has-text("${catName}")`).click();
  }

  async searchForCat(name: string) {
    await this.searchInput.fill(name);
    await this.page.waitForTimeout(500);
  }
}
