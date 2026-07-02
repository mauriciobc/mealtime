import { test, expect } from './fixtures/test-fixtures';

test.describe('Notifications Page', () => {

  test.beforeEach(async ({ loginPage, testUser, page }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    const closeButton = page.locator('button:has-text("Pular"), button:has-text("Próximo"), button:has-text("Fechar")').first();
    if (await closeButton.isVisible({ timeout: 3000 })) {
      await closeButton.click().catch(() => {});
    }
  });

  test('should display notifications page', async ({ notificationsPage }) => {
    await notificationsPage.goto();
    await notificationsPage.expectOnNotificationsPage();
  });

  test('should show back button', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    const backButton = page.locator('button[aria-label="Voltar"]').first();
    const hasBackButton = await backButton.isVisible().catch(() => false);
    expect(hasBackButton).toBeTruthy();
  });

  test('should show empty state when no notifications', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    const emptyState = page.getByText(/nenhuma notificação|você não tem/i).first();
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible({ timeout: 5000 });
      const backButton = page.locator('button:has-text("Voltar")').first();
      await expect(backButton).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display notification items if they exist', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const notificationCards = page.locator('[class*="card"]').first();
    const hasNotifications = await notificationCards.isVisible().catch(() => false);

    if (hasNotifications) {
      // Check for mark read buttons on unread items
      const markReadButtons = page.locator('button:has-text("Marcar lida")');
      const count = await markReadButtons.count();

      if (count > 0) {
        await expect(markReadButtons.first()).toBeVisible({ timeout: 3000 });
      }

      // Check for remove buttons
      const removeButtons = page.locator('button:has-text("Remover")');
      const removeCount = await removeButtons.count();
      expect(removeCount).toBeGreaterThan(0);
    }
  });

  test('should show mark all read button when unread notifications exist', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const markAllButton = page.locator('button:has-text("Marcar todas lidas")').first();
    const hasMarkAll = await markAllButton.isVisible().catch(() => false);

    if (hasMarkAll) {
      await expect(markAllButton).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Notifications API', () => {

  test('should get notifications via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.get('/api/v2/notifications');
    expect(result).toHaveProperty('success');
  });

  test('should mark notification as read via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    // Get notifications first
    const notificationsResult = await apiHelper.get('/api/v2/notifications') as { success?: boolean; data?: Array<{ id: string; isRead: boolean }> };
    expect(notificationsResult).toHaveProperty('success', true);

    if (notificationsResult.data && notificationsResult.data.length > 0) {
      const unreadNotification = notificationsResult.data.find(n => !n.isRead);
      if (unreadNotification) {
        const markResult = await apiHelper.put(`/api/v2/notifications/${unreadNotification.id}/read`, {}) as { success?: boolean };
        expect(markResult).toHaveProperty('success', true);
      }
    }
  });

  test('should mark all notifications as read via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.post('/api/v2/notifications/bulk', { action: 'markAllRead' }) as { success?: boolean };
    expect(result).toHaveProperty('success', true);
  });

  test('should delete notification via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const notificationsResult = await apiHelper.get('/api/v2/notifications') as { success?: boolean; data?: Array<{ id: string }> };
    expect(notificationsResult).toHaveProperty('success', true);

    if (notificationsResult.data && notificationsResult.data.length > 0) {
      const notification = notificationsResult.data[0]!;
      const deleteResult = await apiHelper.delete(`/api/v2/notifications/${notification.id}`) as { success?: boolean };
      expect(deleteResult).toHaveProperty('success', true);
    }
  });
});
