import { type Page, type Locator, expect } from '@playwright/test';

export class CatDetailPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly catName: Locator;
  readonly catPhoto: Locator;
  readonly editLink: Locator;
  readonly deleteButton: Locator;
  readonly feedingHistory: Locator;
  readonly weightSection: Locator;
  readonly addFeedingButton: Locator;
  readonly backToCats: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Detalhes do gato"), heading:has-text("Detalhes do gato")').first();
    this.catName = page.locator('h3:visible, [class*="cat-name"]:has-text("Whiskers")').first();
    this.catPhoto = page.locator('[class*="avatar"], [class*="cat-photo"]');
    this.editLink = page.locator('a[href*="/edit"]:visible, button:has-text("Editar")').first();
    this.deleteButton = page.locator('button:has-text("Excluir Gato"), button:has-text("Excluir")');
    this.feedingHistory = page.locator('text=Histórico de Alimentações');
    this.weightSection = page.locator('text=Peso, text=Weight');
    this.addFeedingButton = page.locator('a:has-text("Registrar Alimentação")');
    this.backToCats = page.locator('a[href="/cats"]:visible, button:has-text("Voltar")').first();
  }

  async goto(catId: string) {
    await this.page.goto(`/cats/${catId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async expectCatDetails() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
    await expect(this.catName).toBeVisible();
  }

  async clickEditLink() {
    await this.editLink.click();
  }

  async clickDeleteButton() {
    await this.deleteButton.click();
  }

  async clickAddFeeding() {
    await this.addFeedingButton.click();
  }

  async getCatName(): Promise<string | null> {
    return this.catName.textContent();
  }
}
