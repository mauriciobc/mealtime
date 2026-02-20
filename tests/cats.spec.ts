import { test, expect } from './fixtures/test-fixtures';

test.describe('Cats Management', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should navigate to cats page', async ({ catsPage }) => {
    await catsPage.goto();
    await catsPage.expectOnCatsPage();
  });

  test('should navigate to create new cat page', async ({ catsPage, catNewPage }) => {
    await catsPage.goto();
    await catsPage.clickAddCat();
    await catNewPage.expectOnNewCatPage();
  });

  test('should create a new cat', async ({ catsPage, catNewPage, testDataManager }) => {
    const catName = testDataManager.generateUniqueName('Miau');

    await catsPage.goto();
    await catsPage.clickAddCat();

    await catNewPage.expectOnNewCatPage();
    await catNewPage.fillCatDetails({
      name: catName,
      weight: '4.5',
      portionSize: '50',
      feedingInterval: '8',
    });

    await catNewPage.submit();

    // Wait for redirect to cats page after successful creation
    await catsPage.page.waitForURL(/\/cats/, { timeout: 10000 });
    await catsPage.expectOnCatsPage();
    
    // Wait for toast notification (optional - don't fail if it doesn't appear)
    try {
      await catsPage.page.waitForSelector('[data-sonner-toast]', { timeout: 3000 });
    } catch {
      // Toast might not appear or might have already disappeared
    }
    
    // Verify cat was created by checking for cat cards
    await catsPage.expectCatCards();
  });
});

test.describe('Cats API', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('should get cats list', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);
    const result = await apiHelper.getCats();
    expect(result).toHaveProperty('success');
  });

  test('should create a new cat via API', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const households = (await apiHelper.getHouseholds()) as { success?: boolean; data?: { id: string }[] };
    const householdId = (Array.isArray(households?.data) && households.data.length > 0 ? households.data[0].id : null) || testUser.householdId;
    expect(householdId, 'Need a household to create a cat').toBeTruthy();

    const catName = `Miau_${Date.now()}`;
    const result = await apiHelper.createCat({
      name: catName,
      householdId: householdId || undefined,
      weight: '4.5',
      portion_size: '50',
      portion_unit: 'g',
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
      throw new Error(`Cat creation failed: ${errorMsg}. Response: ${JSON.stringify(resultData)}`);
    }
    // Cleanup is now automatic via testDataManager fixture
  });
});
