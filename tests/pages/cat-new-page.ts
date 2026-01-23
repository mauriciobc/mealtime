import { type Page, type Locator, expect } from '@playwright/test';

export class CatNewPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly nameInput: Locator;
  readonly birthDateInput: Locator;
  readonly weightInput: Locator;
  readonly portionSizeInput: Locator;
  readonly portionUnitSelect: Locator;
  readonly feedingIntervalInput: Locator;
  readonly notesInput: Locator;
  readonly submitButton: Locator;
  readonly photoUpload: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('text=Novo Gato, text=Novo Pet').first();
    this.nameInput = page.locator('input[name="name"]:visible');
    this.birthDateInput = page.locator('input[name="birthdate"]:visible');
    this.weightInput = page.locator('input[name="weight"]:visible');
    this.portionSizeInput = page.locator('input[name="portion_size"]:visible');
    this.portionUnitSelect = page.locator('select:visible');
    this.feedingIntervalInput = page.locator('input[name="feedingInterval"]:visible');
    this.notesInput = page.locator('textarea[name="notes"]:visible, textarea[id*="notes"]:visible');
    this.submitButton = page.locator('button[type="submit"]:visible:has-text("Salvar"), button:visible:has-text("Cadastrar")');
    this.photoUpload = page.locator('input[type="file"], [class*="upload"]');
  }

  async goto() {
    await this.page.goto('/cats/new');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnNewCatPage() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.nameInput).toBeVisible();
  }

  async fillCatDetails(data: {
    name: string;
    birthDate?: string;
    weight?: string;
    portionSize?: string;
    portionUnit?: string;
    feedingInterval?: string;
    notes?: string;
  }) {
    await this.nameInput.fill(data.name);

    if (data.birthDate) {
      await this.birthDateInput.fill(data.birthDate);
    }

    if (data.weight) {
      await this.weightInput.fill(data.weight);
    }

    if (data.portionSize) {
      await this.portionSizeInput.fill(data.portionSize);
    }

    if (data.portionUnit) {
      await this.portionUnitSelect.selectOption(data.portionUnit);
    }

    if (data.feedingInterval) {
      await this.feedingIntervalInput.fill(data.feedingInterval);
    }

    if (data.notes) {
      await this.notesInput.fill(data.notes);
    }
  }

  async submit() {
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectValidationError(field: string) {
    await expect(this.page.locator(`text=${field} has-error`)).toBeVisible();
  }
}
