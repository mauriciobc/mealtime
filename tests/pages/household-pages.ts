import { type Page, type Locator, expect } from '@playwright/test';

export class HouseholdNewPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly nameInput: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Novo Domicílio"), heading:has-text("Novo Domicílio")').first();
    this.nameInput = page.locator('input[name="name"], input[id*="name"], textbox[name="name"]').first();
    this.createButton = page.locator('button:has-text("Criar Domicílio"), button[type="submit"]:visible').first();
    this.cancelButton = page.locator('button:has-text("Cancelar")').first();
    this.backButton = page.locator('button:has-text("Voltar")').first();
  }

  async goto() {
    await this.page.goto('/households/new');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnNewHouseholdPage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }

  async fillHouseholdName(name: string) {
    await this.nameInput.fill(name);
  }

  async clickCreate() {
    await this.createButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCancel() {
    await this.cancelButton.click();
  }
}

export class HouseholdEditPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly backButton: Locator;
  readonly optionsButton: Locator;
  readonly deleteOption: Locator;
  readonly leaveOption: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Editar Residência"), heading:has-text("Editar Residência")').first();
    this.nameInput = page.locator('input[name="name"], input[id*="name"], textbox[name="name"]').first();
    this.saveButton = page.locator('button:has-text("Salvar Alterações"), button[type="submit"]:visible').first();
    this.cancelButton = page.locator('button:has-text("Cancelar")').first();
    this.backButton = page.locator('button:has-text("Voltar")').first();
    this.optionsButton = page.locator('button:has-text("Opções da Residência")').first();
    this.deleteOption = page.locator('menuitem:has-text("Excluir Residência")').first();
    this.leaveOption = page.locator('menuitem:has-text("Sair da Residência")').first();
  }

  async goto(householdId: string) {
    await this.page.goto(`/households/${householdId}/edit`);
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnEditPage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }

  async clearAndFillName(name: string) {
    await this.nameInput.clear();
    await this.nameInput.fill(name);
  }

  async updateName(name: string) {
    await this.clearAndFillName(name);
  }

  async clickSave() {
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async clickOptions() {
    await this.optionsButton.click();
  }

  async clickDeleteOption() {
    await this.deleteOption.click();
  }

  async clickLeaveOption() {
    await this.leaveOption.click();
  }

  async getHouseholdName(): Promise<string | null> {
    return this.nameInput.inputValue();
  }
}
