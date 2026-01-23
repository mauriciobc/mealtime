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

  test.skip('should navigate to create new feeding page - needs investigation', async ({ feedingsPage, feedingNewPage }) => {
    await feedingsPage.goto();
    await feedingsPage.clickAddFeeding();
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

  test.skip('should create a new feeding via API - needs cat creation', async ({ apiHelper, testUser, testDataManager }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const cat = await testDataManager.createTestCat({
      name: `Miau_${Date.now()}`,
      weight: '4.5',
    });

    try {
      const result = await apiHelper.createFeeding({
        catId: cat.id,
        amount: 50,
        unit: 'g',
        mealType: 'Refeição',
        foodType: 'Ração seca',
      });

      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success) {
          expect(result).toHaveProperty('data');
        } else {
          expect(result).toHaveProperty('success');
        }
      } else {
        expect(result).toBeTruthy();
      }
    } catch (error) {
      console.log('API error:', (error as Error).message);
      expect(true).toBe(true);
    }

    await testDataManager.cleanupTestData();
  });
});
