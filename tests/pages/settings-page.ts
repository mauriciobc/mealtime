import { type Page, type Locator, expect } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly householdSection: Locator;
  readonly profileSection: Locator;
  readonly notificationsSection: Locator;
  readonly themeSelect: Locator;
  readonly logoutButton: Locator;
  readonly bottomNav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:visible, [class*="page-title"]:visible');
    this.householdSection = page.locator('text=Residência:visible, text=Household:visible');
    this.profileSection = page.locator('text=Perfil:visible, text=Profile:visible');
    this.notificationsSection = page.locator('text=Notificações:visible, text=Notifications:visible');
    this.themeSelect = page.locator('select[id*="theme"]:visible, [class*="theme-select"]:visible');
    this.logoutButton = page.locator('button:visible:has-text("Sair"), button:visible:has-text("Logout")');
    this.bottomNav = page.locator('[class*="bottom-nav"]:visible');
  }

  async goto() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnSettingsPage() {
    await expect(this.pageTitle).toBeVisible();
  }

  async clickHouseholdSection() {
    await this.householdSection.click();
  }

  async clickProfileSection() {
    await this.profileSection.click();
  }

  async clickLogout() {
    await this.logoutButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async changeTheme(theme: string) {
    await this.themeSelect.selectOption(theme);
  }
}
