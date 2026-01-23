import { type Page, type Locator, expect } from '@playwright/test';

export class FeedingNewPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly catSelect: Locator;
  readonly amountInput: Locator;
  readonly unitSelect: Locator;
  readonly foodTypeSelect: Locator;
  readonly statusSelect: Locator;
  readonly notesInput: Locator;
  readonly dateTimeInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Registrar Alimentação"), h1:has-text("Nova Alimentação")');
    this.catSelect = page.locator('select[id*="cat"], [class*="cat-select"]');
    this.amountInput = page.locator('input[id*="amount"], input[id*="portion"]');
    this.unitSelect = page.locator('select[id*="unit"]');
    this.foodTypeSelect = page.locator('select[id*="food"], select[id*="type"]');
    this.statusSelect = page.locator('select[id*="status"]');
    this.notesInput = page.locator('textarea[id*="notes"], textarea[id*="observation"]');
    this.dateTimeInput = page.locator('input[id*="datetime"], input[id*="date"]');
    this.submitButton = page.locator('button[type="submit"]:has-text("Salvar"), button:has-text("Registrar")');
    this.cancelButton = page.locator('button:has-text("Cancelar")');
  }

  async goto() {
    await this.page.goto('/feedings/new');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnNewFeedingPage() {
    await expect(this.pageTitle).toBeVisible();
  }

  async fillFeedingDetails(data: {
    catId?: string;
    amount: string;
    unit?: string;
    foodType?: string;
    status?: string;
    notes?: string;
    dateTime?: string;
  }) {
    if (data.catId) {
      await this.catSelect.selectOption(data.catId);
    }

    await this.amountInput.fill(data.amount);

    if (data.unit) {
      await this.unitSelect.selectOption(data.unit);
    }

    if (data.foodType) {
      await this.foodTypeSelect.selectOption(data.foodType);
    }

    if (data.status) {
      await this.statusSelect.selectOption(data.status);
    }

    if (data.notes) {
      await this.notesInput.fill(data.notes);
    }

    if (data.dateTime) {
      await this.dateTimeInput.fill(data.dateTime);
    }
  }

  async submit() {
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async expectValidationError(message: string) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }
}
