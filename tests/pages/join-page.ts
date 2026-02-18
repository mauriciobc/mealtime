import { type Page, type Locator, expect } from '@playwright/test';

export class JoinPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly inviteCodeInput: Locator;
  readonly joinButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /entrar em um domicílio/i });
    this.inviteCodeInput = page.getByLabel(/código de convite/i).or(
      page.locator('input[id="inviteCode"], input[placeholder*="código"]')
    );
    this.joinButton = page.getByRole('button', { name: /entrar no domicílio|entrando/i });
  }

  async goto(code?: string) {
    const url = code ? `/join?code=${encodeURIComponent(code)}` : '/join';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async expectOnJoinPage() {
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
  }

  async fillInviteCode(code: string) {
    await this.inviteCodeInput.fill(code);
  }

  async clickJoin() {
    await this.joinButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}
