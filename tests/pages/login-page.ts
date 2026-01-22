import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly showPasswordButton: Locator;
  readonly errorMessage: Locator;
  readonly googleLoginButton: Locator;
  readonly signupLink: Locator;
  readonly termsLink: Locator;
  readonly privacyLink: Locator;
  readonly cardContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cardContainer = page.locator('.w-full.max-w-md');
    this.emailInput = page.locator('input[name="email"], input#email');
    this.passwordInput = page.locator('input[name="password"], input#password');
    this.submitButton = page.locator('button[type="submit"]:visible');
    this.showPasswordButton = page.locator('button:visible[aria-label*="senha" i], button:visible[aria-label*="password" i]');
    this.errorMessage = this.cardContainer.locator('[role="alert"]');
    this.googleLoginButton = page.locator('button:visible:has-text("Google")');
    this.signupLink = page.locator('a:visible:has-text("Registre-se"), a:visible:has-text("Sign up")');
    this.termsLink = page.locator('a[href="/terms"]');
    this.privacyLink = page.locator('a[href="/privacy"]');
  }

  async goto(callbackUrl?: string) {
    const url = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForSelector('[role="alert"]', { timeout: 5000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  async loginWithGoogle() {
    await this.googleLoginButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async togglePasswordVisibility() {
    await this.showPasswordButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.locator('div').last().textContent();
    }
    return null;
  }

  async expectOnLoginPage() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async clickSignup() {
    await this.signupLink.click();
  }

  async expectRedirectTo(path: string) {
    await this.page.waitForURL(new RegExp(path));
  }
}
