import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly welcomeMessage: Locator;
  readonly addCatButton: Locator;
  readonly catCards: Locator;
  readonly noCatsEmptyState: Locator;
  readonly noHouseholdEmptyState: Locator;
  readonly recentFeedingsSection: Locator;
  readonly bottomNav: Locator;
  readonly pageHeading: Locator;
  readonly globalLoading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1:visible, [class*="page-title"]:visible');
    this.globalLoading = page.locator('[class*="loading"]:visible, [class*="Loading"]:visible').first();
    this.welcomeMessage = page.locator('h1:visible, h2:visible').first();
    this.addCatButton = page.locator('a[href="/cats/new"]:visible');
    this.catCards = page.locator('[class*="cat-card"]:visible, [class*="CatCard"]:visible, [class*="pet-card"]:visible');
    this.noCatsEmptyState = page.locator('text=Nenhum gato cadastrado:visible');
    this.noHouseholdEmptyState = page.locator('text=Associe uma Residência:visible, text=Sem Residência:visible');
    this.recentFeedingsSection = page.locator('text=Últimas Alimentações:visible');
    this.bottomNav = page.locator('[class*="bottom-nav"]:visible');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    // Wait for page content to be visible instead of fixed timeout
    await expect(this.page.locator('body')).toBeVisible();
    // Wait for either welcome message or empty state
    await Promise.race([
      this.pageHeading.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      this.noCatsEmptyState.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      this.noHouseholdEmptyState.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
    ]);
  }

  async expectOnDashboard() {
    await this.page.waitForURL('/');
    await expect(this.page).toHaveTitle(/MealTime/);
    await expect(this.page.locator('body')).toBeVisible();
  }

  async expectWelcomeMessage() {
    await expect(this.pageHeading.first()).toBeVisible();
  }

  async clickAddCat() {
    await this.addCatButton.first().click();
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
}
