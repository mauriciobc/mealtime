import { test, expect } from './fixtures/test-fixtures';

test.describe('Dashboard', () => {
  test('should display dashboard content when authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    const heading = page.getByRole('heading').first();
    const emptyState = page.getByText(/associe uma residência|sem residência|cadastrar meu primeiro gato|cat care timeline/i);
    await expect(heading.or(emptyState).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display dashboard with content or empty state', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    const hasContent = await page.getByRole('heading', { name: /cat care timeline|início/i }).isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/associe uma residência|sem residência|cadastrar meu primeiro gato|nenhum gato cadastrado/i).first().isVisible().catch(() => false);
    expect(hasContent || hasEmptyState).toBeTruthy();
  });

  test('should show empty state CTAs when no household or no cats', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const householdsLink = page.getByRole('link', { name: /ir para configurações de residência|configurações de residência/i });
    const addCatLink = page.getByRole('link', { name: /cadastrar meu primeiro gato/i });
    const hasEmptyStateCTA = await householdsLink.or(addCatLink).first().isVisible().catch(() => false);
    const hasDashboardContent = await page.getByRole('heading', { name: /cat care timeline|início/i }).isVisible().catch(() => false);
    expect(hasEmptyStateCTA || hasDashboardContent).toBeTruthy();
  });
});
