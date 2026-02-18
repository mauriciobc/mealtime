import { type Page, type Locator, expect } from '@playwright/test';

export class SignupPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly fullNameInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loginLink: Locator;
  readonly termsCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('text=MealTime').first();
    this.emailInput = page.locator('input[name="email"]:visible, input[id*="email"]:visible');
    this.passwordInput = page.locator('input[name="password"]:visible, input[id*="password"]:visible');
    this.confirmPasswordInput = page.locator('input[id*="confirm"]:visible, input[name*="confirm"]:visible');
    this.fullNameInput = page.getByLabel('Nome Completo').or(page.locator('input#name')).first();
    this.submitButton = page.getByRole('button', { name: /criar conta com email|registrar|cadastrar/i }).or(
      page.locator('button[type="submit"]:visible')
    ).first();
    this.errorMessage = page.locator('.text-sm.text-red-500:visible');
    this.loginLink = page.locator('a:visible:has-text("Já tem uma conta"), a:visible:has-text("Login"), a:visible:has-text("Entre")');
    this.termsCheckbox = page.locator('input[type="checkbox"]:visible');
  }

  async goto() {
    await this.page.goto('/signup');
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnSignupPage() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  async signup(email: string, password: string, fullName?: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    
    if (fullName) {
      await this.fullNameInput.fill(fullName);
    }

    if (await this.termsCheckbox.isVisible()) {
      await this.termsCheckbox.check();
    }

    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async clickLogin() {
    await this.loginLink.click();
  }

  async expectRedirectTo(path: string) {
    await this.page.waitForURL(new RegExp(path));
  }
}
