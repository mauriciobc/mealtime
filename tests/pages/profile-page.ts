import { type Page, type Locator, expect } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly editProfileLink: Locator;
  readonly avatar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editProfileLink = page.getByRole('link', { name: /editar perfil/i });
    this.avatar = page.locator('[class*="avatar"]').or(page.getByRole('img', { name: /avatar/i }));
  }

  async goto() {
    await this.page.goto('/profile');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnProfilePage() {
    await expect(this.editProfileLink.or(this.avatar)).toBeVisible({ timeout: 10000 });
  }

  async clickEditProfile() {
    await this.editProfileLink.click();
  }
}
