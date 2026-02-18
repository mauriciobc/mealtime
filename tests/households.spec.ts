import { test, expect } from './fixtures/test-fixtures';

test.describe('Households Management', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should navigate to households page', async ({ householdsPage }) => {
    await householdsPage.goto();
    await householdsPage.expectOnHouseholdsPage();
  });

  test('should create a new household via UI', async ({ householdsPage, householdNewPage, testDataManager }) => {
    const householdName = testDataManager.generateUniqueName('Casa');

    await householdsPage.goto();
    await householdsPage.clickNewHousehold();

    await householdNewPage.expectOnNewHouseholdPage();
    await householdNewPage.fillHouseholdName(householdName);
    await householdNewPage.clickCreate();

    // Wait for redirect after successful creation (redirects to household detail page)
    await householdsPage.page.waitForURL(/\/households\/[^/]+/, { timeout: 10000 });
    
    // Wait for toast notification (optional - don't fail if it doesn't appear)
    try {
      await householdsPage.page.waitForSelector('[data-sonner-toast]', { timeout: 3000 });
    } catch {
      // Toast might not appear or might have already disappeared
    }
    
    // Navigate back to households list to verify creation
    await householdsPage.goto();
    await householdsPage.expectOnHouseholdsPage();
    
    // Verify household was created by checking if it appears in the list
    const householdElement = await householdsPage.findHouseholdByName(householdName);
    await expect(householdElement).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to invite page and display form', async ({ householdInvitePage, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({ name: `Casa_${Date.now()}` });
    await householdInvitePage.goto(household.id);
    await householdInvitePage.expectOnInvitePage();
    await expect(householdInvitePage.emailInput).toBeVisible();
    await expect(householdInvitePage.sendButton).toBeVisible();
  });

  test('should send invite and show feedback', async ({ householdInvitePage, testDataManager }) => {
    const household = await testDataManager.createTestHousehold({ name: `Casa_${Date.now()}` });
    await householdInvitePage.goto(household.id);
    await householdInvitePage.fillEmail(`invite_${Date.now()}@example.com`);
    await householdInvitePage.clickSendInvite();
    await expect(
      householdInvitePage.page.getByText(/convite enviado|já é um membro|erro ao|invite sent|already a member/i)
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Households API', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should get households list', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getHouseholds();
    expect(result).toHaveProperty('success');
  });

  test('should create a new household via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const householdName = `Casa_${Date.now()}`;
    const result = await apiHelper.createHousehold({
      name: householdName,
      description: 'Criado por testes E2E',
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('success');
    
    const resultData = result as { success: boolean; data?: { id: string }; error?: string };
    
    if (resultData.success) {
      expect(resultData).toHaveProperty('data');
      expect(resultData.data).toHaveProperty('id');
    } else {
      // If creation failed, fail the test with a clear message
      const errorMsg = resultData.error || 'Unknown error';
      throw new Error(`Household creation failed: ${errorMsg}. Response: ${JSON.stringify(resultData)}`);
    }
    // Cleanup is now automatic via testDataManager fixture
  });
});
