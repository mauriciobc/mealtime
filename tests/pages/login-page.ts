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
    // Use getByRole for better accessibility-based selection
    this.cardContainer = page.getByRole('main').or(page.locator('[role="main"]')).first();
    this.emailInput = page.getByLabel('Email').or(page.getByPlaceholder(/email/i)).first();
    this.passwordInput = page.getByLabel('Senha').or(page.getByLabel('Password')).or(page.getByPlaceholder(/senha|password/i)).first();
    this.submitButton = page
      .getByRole('button', { name: /entrar com email|login with email|sign in with email/i })
      .or(page.locator('button[type="submit"]'))
      .first();
    this.showPasswordButton = page.getByRole('button', { name: /mostrar senha|ocultar senha|show password|hide password/i });
    this.errorMessage = page.getByRole('alert');
    this.googleLoginButton = page.getByRole('button', { name: /google/i });
    this.signupLink = page.getByRole('link', { name: /registre-se|sign up|cadastrar/i });
    this.termsLink = page.getByRole('link', { name: /termos|terms/i }).or(page.locator('a[href="/terms"]'));
    this.privacyLink = page.getByRole('link', { name: /privacidade|privacy/i }).or(page.locator('a[href="/privacy"]'));
  }

  async goto(callbackUrl?: string) {
    const url = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login';
    await this.page.goto(url, { waitUntil: 'networkidle' });
    // Wait for the loading overlay to disappear and form to be visible
    await this.page.waitForSelector('[data-loading="true"]', { state: 'detached', timeout: 10000 }).catch(() => {});
    // Ensure the email input is visible and ready for interaction
    await this.emailInput.waitFor({ state: 'visible', timeout: 20000 });
  }

  async login(email: string, password: string) {
    // Ensure elements are visible and enabled before interacting
    await this.emailInput.waitFor({ state: 'visible' });
    await this.passwordInput.waitFor({ state: 'visible' });
    
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    
    // Wait for either success (redirect) or error (alert)
    try {
      await Promise.race([
        this.page.waitForURL(/^\/(?!login)/, { timeout: 10000 }),
        this.page.waitForSelector('[role="alert"]', { timeout: 10000 }),
      ]);
    } catch {
      // If neither happens, continue - might already be logged in
    }
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
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
      const text = await this.errorMessage.textContent();
      return text ? text.replace('Login Error', '').trim() : null;
    } catch {
      return null;
    }
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
