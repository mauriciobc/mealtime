import { type Page, type Locator, expect } from '@playwright/test';

export class WeightPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly registerWeightButton: Locator;
  readonly newGoalButton: Locator;
  readonly setGoalButton: Locator;
  readonly catButtons: Locator;
  readonly currentWeight: Locator;
  readonly goalText: Locator;
  readonly weightChart: Locator;
  readonly timeRangeTabs: Locator;
  readonly recentHistory: Locator;
  readonly milestonesSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /painel de peso|painel de acompanhamento de peso/i }).or(
      page.locator('h1:has-text("Painel")').first()
    );
    this.registerWeightButton = page.locator('button:has-text("Registrar Peso")').first();
    this.newGoalButton = page.locator('button:has-text("Nova Meta de Peso"), button:has-text("Nova Meta")').first();
    this.setGoalButton = page.locator('button:has-text("Definir Meta")').first();
    this.catButtons = page.locator('button:has-text("Whiskers"), [class*="cat-select"]').first();
    this.currentWeight = page.locator('text=4.5 kg').first();
    this.goalText = page.locator('text=Nenhuma meta definida., text=Meta').locator('xpath=..');
    this.weightChart = page.locator('[class*="chart"], application').first();
    this.timeRangeTabs = page.locator('[role="tablist"], tablist');
    this.recentHistory = page.locator('text=Histórico Recente').first();
    this.milestonesSection = page.locator('text=Progresso da Meta').first();
  }

  async goto() {
    await this.page.goto('/weight');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnWeightPage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }

  async clickRegisterWeight() {
    await this.registerWeightButton.click();
  }

  async clickNewGoal() {
    await this.newGoalButton.click();
  }

  async clickSetGoal() {
    await this.setGoalButton.click();
  }

  async selectCat(catName: string) {
    const catButton = this.page.locator(`button:has-text("${catName}")`).first();
    await catButton.click();
  }

  async getCurrentWeight(): Promise<string | null> {
    if (await this.currentWeight.isVisible()) {
      return this.currentWeight.textContent();
    }
    return null;
  }

  async selectTimeRange(days: number) {
    const tab = this.page.locator(`button:has-text("${days} Dias")`).first();
    await tab.click();
  }

  async getRecentHistoryCount(): Promise<number> {
    const historyItems = this.page.locator('[class*="history"] li, [class*="history"] div').count();
    return historyItems;
  }
}

export class WeightRegisterDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly title: Locator;
  readonly weightInput: Locator;
  readonly dateTimeButton: Locator;
  readonly notesInput: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]').filter({ has: page.locator('text=Registrar Novo Peso') }).first();
    this.title = this.dialog.locator('heading:has-text("Registrar Novo Peso")').first();
    this.weightInput = this.dialog.locator('input[type="number"], spinbutton').first();
    this.dateTimeButton = this.dialog.locator('button[id*="date"], button:has-text("de janeiro")').first();
    this.notesInput = this.dialog.locator('textarea, textbox').first();
    this.cancelButton = this.dialog.locator('button:has-text("Cancelar")').first();
    this.saveButton = this.dialog.locator('button:has-text("Salvar Registro")').first();
  }

  async expectDialogVisible() {
    await expect(this.dialog).toBeVisible({ timeout: 5000 });
  }

  async fillWeight(weight: string) {
    await this.weightInput.fill(weight);
  }

  async fillNotes(notes: string) {
    await this.notesInput.fill(notes);
  }

  async clickSave() {
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCancel() {
    await this.cancelButton.click();
  }
}

export class WeightGoalDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly title: Locator;
  readonly targetWeightInput: Locator;
  readonly startDateInput: Locator;
  readonly targetDateInput: Locator;
  readonly notesInput: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]').filter({ has: page.locator('heading:has-text("Meta")') }).first();
    this.title = this.dialog.locator('heading:has-text("Meta"), heading:has-text("Nova Meta")').first();
    this.targetWeightInput = this.dialog.locator('input[type="number"], spinbutton').first();
    this.startDateInput = this.dialog.locator('button[id*="start"], input[id*="start"]').first();
    this.targetDateInput = this.dialog.locator('button[id*="target"], input[id*="target"]').first();
    this.notesInput = this.dialog.locator('textarea, textbox').first();
    this.cancelButton = this.dialog.locator('button:has-text("Cancelar")').first();
    this.saveButton = this.dialog.locator('button:has-text("Salvar")').first();
  }

  async expectDialogVisible() {
    await expect(this.dialog).toBeVisible({ timeout: 5000 });
  }

  async fillTargetWeight(weight: string) {
    await this.targetWeightInput.fill(weight);
  }

  async fillNotes(notes: string) {
    await this.notesInput.fill(notes);
  }

  async clickSave() {
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCancel() {
    await this.cancelButton.click();
  }
}
