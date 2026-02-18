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
    // Use getByRole for headings
    this.pageTitle = page.getByRole('heading', { name: /novo gato|novo pet|new cat|add cat/i }).or(
      page.locator('h1:visible').first()
    );
    // Use getByLabel for form inputs (most accessible)
    this.nameInput = page.getByLabel(/nome|name/i).or(page.locator('input[name="name"]:visible')).first();
    this.birthDateInput = page.getByLabel(/data de nascimento|birthdate|birth date/i).or(
      page.locator('input[name="birthdate"]:visible')
    ).first();
    this.weightInput = page.getByLabel(/peso|weight/i).or(page.locator('input[name="weight"]:visible')).first();
    this.portionSizeInput = page.getByLabel(/porção|portion/i).or(
      page.locator('input[name="portion_size"]:visible')
    ).first();
    // Use getByRole for select elements
    this.portionUnitSelect = page.getByRole('combobox').or(page.locator('select:visible')).first();
    this.feedingIntervalInput = page.getByLabel(/intervalo|interval/i).or(
      page.locator('input[name="feedingInterval"]:visible')
    ).first();
    this.notesInput = page.getByLabel(/notas|notes/i).or(
      page.locator('textarea[name="notes"]:visible, textarea[id*="notes"]:visible')
    ).first();
    // Use getByRole for submit buttons
    this.submitButton = page.getByRole('button', { name: /salvar|cadastrar|save|create|add/i }).filter({ 
      has: page.locator('[type="submit"]') 
    }).or(page.locator('button[type="submit"]:visible')).first();
    // File inputs are typically accessible by type
    this.photoUpload = page.locator('input[type="file"]').or(page.locator('[class*="upload"]')).first();
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
    // Wait for form submission and potential redirect
    await this.page.waitForLoadState('networkidle');
    // Wait for redirect to cats page or error message
    await Promise.race([
      this.page.waitForURL(/\/cats/, { timeout: 10000 }),
      this.page.waitForSelector('[role="alert"]', { timeout: 5000 }).catch(() => {}),
    ]);
  }

  async expectValidationError(field: string) {
    await expect(this.page.locator(`text=${field} has-error`)).toBeVisible();
  }
}
