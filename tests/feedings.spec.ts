import { test, expect } from './fixtures/test-fixtures';

test.describe('Feedings Management', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test.beforeEach(async ({ loginPage, testUser }) => {
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
  });

  test('should navigate to feedings page', async ({ feedingsPage }) => {
    await feedingsPage.goto();
    await feedingsPage.expectOnFeedingsPage();
  });

  test('should navigate to create new feeding page', async ({ page, feedingNewPage }) => {
    await page.goto('/feedings/new');
    await page.waitForLoadState('networkidle');
    await feedingNewPage.expectOnNewFeedingPage();
  });
});

test.describe('Feedings API', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should get feedings list', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getFeedings();
    expect(result).toHaveProperty('success');
  });

  test('should create a new feeding via API', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const cat = await testDataManager.createTestCat({
      name: `Miau_${Date.now()}`,
      weight: '4.5',
    });

    const result = await apiHelper.createFeeding({
      catId: cat.id,
      amount: 50,
      unit: 'g',
      mealType: 'Refeição',
      foodType: 'Ração seca',
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('success');
    
    const resultData = result as { success: boolean; data?: { id: string }; error?: string };
    
    if (resultData.success) {
      expect(resultData).toHaveProperty('data');
    } else {
      // If creation failed, fail the test with a clear message
      const errorMsg = resultData.error || 'Unknown error';
      throw new Error(`Feeding creation failed: ${errorMsg}. Response: ${JSON.stringify(resultData)}`);
    }
    // Cleanup is now automatic via testDataManager fixture
  });
});
