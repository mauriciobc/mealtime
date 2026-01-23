import { type Page, type Locator, expect } from '@playwright/test';

export class CatEditPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly nameInput: Locator;
  readonly birthDateInput: Locator;
  readonly weightInput: Locator;
  readonly feedingIntervalInput: Locator;
  readonly portionSizeInput: Locator;
  readonly restrictionsInput: Locator;
  readonly notesInput: Locator;
  readonly saveButton: Locator;
  readonly deleteButton: Locator;
  readonly cancelButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Editar Whiskers"), heading:has-text("Editar")').first();
    this.nameInput = page.locator('input[name="name"], textbox[name="name"]').first();
    this.birthDateInput = page.locator('button:has-text("Selecionar data"), input[name="birthdate"]').first();
    this.weightInput = page.locator('spinbutton, input[type="number"][name="weight"], input[id*="weight"]').first();
    this.feedingIntervalInput = page.locator('spinbutton[id*="interval"], input[name="feedingInterval"]').first();
    this.portionSizeInput = page.locator('spinbutton[id*="portion"], input[name="portion"]').first();
    this.restrictionsInput = page.locator('textarea[id*="restriction"], input[id*="restriction"]').first();
    this.notesInput = page.locator('textarea[id*="notes"], input[id*="notes"]').first();
    this.saveButton = page.locator('button:has-text("Salvar Alterações"), button[type="submit"]:visible').first();
    this.deleteButton = page.locator('button:has-text("Excluir Gato"), button:has-text("Excluir")').first();
    this.cancelButton = page.locator('button:has-text("Cancelar")').first();
    this.backButton = page.locator('button:has-text("Voltar")').first();
  }

  async goto(catId: string) {
    await this.page.goto(`/cats/${catId}/edit`);
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnEditPage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }

  async fillCatDetails(data: {
    name?: string;
    birthDate?: string;
    weight?: string;
    feedingInterval?: string;
    portionSize?: string;
    restrictions?: string;
    notes?: string;
  }) {
    if (data.name) {
      await this.nameInput.clear();
      await this.nameInput.fill(data.name);
    }

    if (data.birthDate) {
      await this.birthDateInput.click();
    }

    if (data.weight) {
      await this.weightInput.fill(data.weight);
    }

    if (data.feedingInterval) {
      await this.feedingIntervalInput.fill(data.feedingInterval);
    }

    if (data.portionSize) {
      await this.portionSizeInput.fill(data.portionSize);
    }

    if (data.restrictions) {
      await this.restrictionsInput.fill(data.restrictions);
    }

    if (data.notes) {
      await this.notesInput.fill(data.notes);
    }
  }

  async updateName(name: string) {
    await this.nameInput.clear();
    await this.nameInput.fill(name);
  }

  async updateWeight(weight: string) {
    await this.weightInput.fill(weight);
  }

  async updateFeedingInterval(interval: string) {
    await this.feedingIntervalInput.fill(interval);
  }

  async updatePortionSize(size: string) {
    await this.portionSizeInput.fill(size);
  }

  async clickSave() {
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickDelete() {
    await this.deleteButton.click();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async getCatName(): Promise<string | null> {
    return this.nameInput.inputValue();
  }

  async getCurrentWeight(): Promise<string | null> {
    return this.weightInput.inputValue();
  }
}
