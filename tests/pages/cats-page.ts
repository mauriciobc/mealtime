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
    // Use getByRole for headings - more resilient to CSS changes
    this.pageTitle = page.getByRole('heading', { name: /meus gatos|my cats/i }).or(
      page.locator('h1:visible').first()
    );
    // Use getByRole for links and buttons
    this.addCatButton = page.getByRole('link', { name: /adicionar gato|add cat|novo gato|new cat/i }).or(
      page.getByRole('button', { name: /adicionar gato|add cat/i })
    ).or(page.locator('a[href="/cats/new"]:visible')).first();
    // Use more generic selectors for lists and cards (these are structural)
    this.catList = page.locator('[class*="cat-list"], [class*="CatList"], [role="list"]').first();
    this.catCards = page.locator('[class*="cat-card"], [class*="CatCard"], [class*="pet-card"], article').filter({ hasNot: page.locator('[class*="empty"]') });
    // Use getByText for text content
    this.noCatsEmptyState = page.getByText(/nenhum gato cadastrado|no cats registered/i);
    this.noHouseholdEmptyState = page.getByText(/sem residência|no household/i);
    // Use getByPlaceholder for search inputs
    this.searchInput = page.getByPlaceholder(/buscar|search/i).or(page.locator('input[type="search"]:visible')).first();
    // Navigation is typically in a nav element
    this.bottomNav = page.getByRole('navigation').or(page.locator('[class*="bottom-nav"], nav:visible')).first();
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
    // Wait for search results to update
    await this.page.waitForLoadState('networkidle');
  }
}
