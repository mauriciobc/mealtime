import { test, expect } from '@playwright/test';

test.describe('Static Pages', () => {
  test('should display terms page', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    const hasContent = await page.locator('h1, h2, h3, p').first().isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('should display privacy page', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    const hasContent = await page.locator('h1, h2, h3, p').first().isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('should display api-docs page', async ({ page }) => {
    await page.goto('/api-docs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    const hasContent = await page.locator('h1, h2, h3, p').first().isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('should display error page', async ({ page }) => {
    await page.goto('/error');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display offline page', async ({ page }) => {
    await page.goto('/offline');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    const hasContent = await page.getByText(/offline|sem conexão/i).first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('should display auth error page', async ({ page }) => {
    await page.goto('/auth/auth-code-error');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('API Documentation', () => {
  test('should display swagger YAML', async ({ page }) => {
    const response = await page.request.get('/api/swagger');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('openapi:');
  });

  test('should display v2 swagger YAML', async ({ page }) => {
    const response = await page.request.get('/api/v2/swagger');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('openapi:');
  });
});

test.describe('Health and Monitoring', () => {
  test('should return healthy status', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status', 'healthy');
  });
});
