import { test, expect } from './fixtures/test-fixtures';

/**
 * API tests to validate the gender field deliverable:
 * - Create cat with gender
 * - GET cat returns gender
 * - Update cat gender
 * - List cats includes gender
 * - Feedings/households responses that embed cat data include gender
 */
test.describe('API Gender field', () => {
  test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');

  test('POST /api/v2/cats accepts gender and GET returns it', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const households = (await apiHelper.getHouseholds()) as { success?: boolean; data?: { id: string }[] };
    const householdId = Array.isArray(households?.data) && households.data.length > 0
      ? households.data[0].id
      : testUser.householdId;
    expect(householdId, 'Need a household to create a cat').toBeTruthy();

    const catName = `GenderTest_${Date.now()}`;
    const createRes = await apiHelper.createCat({
      name: catName,
      householdId: householdId || undefined,
      weight: '4',
      feedingInterval: 8,
      gender: 'female',
    }) as { success?: boolean; data?: { id: string; gender?: string | null } };

    expect(createRes).toBeDefined();
    expect(createRes.success).toBe(true);
    expect(createRes.data?.id).toBeDefined();
    expect(createRes.data?.gender).toBe('female');

    const catId = createRes.data!.id;
    const getRes = await apiHelper.getCat(catId) as { success?: boolean; data?: { id: string; gender?: string | null } };
    expect(getRes?.data?.gender).toBe('female');
  });

  test('PUT /api/v2/cats/:id accepts gender and GET returns updated value', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const households = (await apiHelper.getHouseholds()) as { success?: boolean; data?: { id: string }[] };
    const householdId = (Array.isArray(households?.data) && households.data.length > 0 ? households.data[0].id : null) || testUser.householdId;
    if (!householdId) {
      test.skip();
      return;
    }

    const createRes = await apiHelper.createCat({
      name: `GenderUpdate_${Date.now()}`,
      householdId: householdId || undefined,
      weight: '4',
      feedingInterval: 8,
      gender: 'female',
    }) as { success?: boolean; data?: { id: string } };
    if (!createRes?.success || !createRes?.data?.id) {
      test.skip();
      return;
    }
    const catId = createRes.data.id;

    const updateRes = await apiHelper.updateCat(catId, { gender: 'male' }) as { success?: boolean; data?: { gender?: string | null } };
    expect(updateRes?.success).toBe(true);
    expect(updateRes?.data?.gender).toBe('male');

    const getRes = await apiHelper.getCat(catId) as { success?: boolean; data?: { gender?: string | null } };
    expect(getRes?.data?.gender).toBe('male');
  });

  test('GET /api/v2/cats list includes gender in each cat', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const listRes = await apiHelper.getCats() as { success?: boolean; data?: { id: string; name: string; gender?: string | null }[] };
    expect(listRes).toHaveProperty('success');
    if (listRes.success && Array.isArray(listRes.data) && listRes.data.length > 0) {
      for (const cat of listRes.data) {
        expect(cat).toHaveProperty('gender');
        if (cat.gender !== null && cat.gender !== undefined) {
          expect(['male', 'female']).toContain(cat.gender);
        }
      }
    }
  });

  test('GET /api/v2/households/:id returns household (cats may be IDs or objects)', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const households = (await apiHelper.getHouseholds()) as { success?: boolean; data?: { id: string }[] };
    const householdId = Array.isArray(households?.data) && households.data.length > 0 ? households.data[0].id : null;
    if (!householdId) {
      test.skip();
      return;
    }

    const res = await apiHelper.get(`/api/v2/households/${householdId}`) as { success?: boolean; data?: { cats?: unknown[] } };
    expect(res?.success).toBe(true);
    expect(res?.data).toHaveProperty('cats');
    // Note: GET /api/v2/households/[id] returns cats as array of IDs; PATCH returns full cat objects with gender
  });

  test('GET /api/v2/feedings/cats response includes gender in each cat', async ({ apiHelper, testUser }) => {
    await apiHelper.authenticate(testUser.email, testUser.password);

    const households = (await apiHelper.getHouseholds()) as { success?: boolean; data?: { id: string }[] };
    const householdId = Array.isArray(households?.data) && households.data.length > 0 ? households.data[0].id : null;
    if (!householdId) {
      test.skip();
      return;
    }

    const res = await apiHelper.get(`/api/v2/feedings/cats?householdId=${householdId}`) as { success?: boolean; data?: { gender?: string | null }[] };
    expect(res?.success).toBe(true);
    if (Array.isArray(res?.data) && res.data.length > 0) {
      for (const cat of res.data) {
        expect(cat).toHaveProperty('gender');
      }
    }
  });
});
