import { type Page, type BrowserContext } from '@playwright/test';

export class TestDataManager {
  readonly page: Page;
  readonly context: BrowserContext;
  private createdCats: string[] = [];
  private createdFeedings: string[] = [];
  private createdHouseholds: string[] = [];
  private currentHouseholdId: string | null = null;
  private accessToken: string | null = null;

  constructor(page: Page) {
    this.page = page;
    this.context = page.context() as BrowserContext;
  }

  async ensureHousehold(existingHouseholdId?: string): Promise<string> {
    if (this.currentHouseholdId) {
      return this.currentHouseholdId;
    }

    // Try to use existing household ID from env or parameter
    if (existingHouseholdId) {
      this.currentHouseholdId = existingHouseholdId;
      return existingHouseholdId;
    }

    if (process.env.TEST_HOUSEHOLD_ID) {
      this.currentHouseholdId = process.env.TEST_HOUSEHOLD_ID;
      return this.currentHouseholdId;
    }

    // Try to get existing household from API
    try {
      const authHeader = await this.getAuthHeader();
      const response = await this.page.request.get('/api/v2/households', {
        headers: { 'Authorization': authHeader },
      });
      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
        const id = result.data[0].id as string;
        this.currentHouseholdId = id;
        return id;
      }
    } catch (error) {
      // If we can't get households, try to create one
    }

    // Create a new household if none exists
    const household = await this.createTestHousehold({
      name: `TestHousehold_${Date.now()}`,
      description: 'Auto-created for testing',
    });

    const id = household.id as string;
    this.currentHouseholdId = id;
    return id;
  }

  private async getAuthHeader(): Promise<string> {
    if (this.accessToken) {
      return `Bearer ${this.accessToken}`;
    }

    const response = await this.page.request.post('/api/auth/mobile', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        email: process.env.TEST_USER_EMAIL || 'test_1761761083178@example.com',
        password: process.env.TEST_USER_PASSWORD || 'Test@123456',
      }),
    });

    const result = await response.json();
    if (result.access_token) {
      this.accessToken = result.access_token;
      return `Bearer ${result.access_token}`;
    }
    throw new Error('Failed to authenticate');
  }

  async createTestCat(data: {
    name: string;
    birthDate?: string;
    weight?: string;
    portionSize?: string;
    portionUnit?: string;
    feedingInterval?: number;
    notes?: string;
    gender?: 'male' | 'female';
  }) {
    const householdId = await this.ensureHousehold();

    const response = await this.page.request.post('/api/v2/cats', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await this.getAuthHeader(),
      },
      data: JSON.stringify({
        name: data.name,
        birth_date: data.birthDate,
        weight: data.weight,
        portion_size: data.portionSize,
        portion_unit: data.portionUnit,
        feeding_interval: data.feedingInterval,
        notes: data.notes,
        gender: data.gender ?? undefined,
        householdId,
      }),
    });

    const result = await response.json();
    if (result.success && result.data?.id) {
      this.createdCats.push(result.data.id);
      return result.data;
    }
    throw new Error(`Failed to create test cat: ${JSON.stringify(result)}`);
  }

  async createTestFeeding(data: {
    catId: string;
    amount: number;
    unit: string;
    mealType?: string;
    foodType?: string;
    notes?: string;
    fedAt?: string;
  }) {
    const response = await this.page.request.post('/api/v2/feedings', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await this.getAuthHeader(),
      },
      data: JSON.stringify({
        cat_id: data.catId,
        amount: data.amount,
        unit: data.unit,
        meal_type: data.mealType || 'Refeição',
        food_type: data.foodType || 'Ração seca',
        notes: data.notes,
        fed_at: data.fedAt || new Date().toISOString(),
      }),
    });

    const result = await response.json();
    if (result.success && result.data?.id) {
      this.createdFeedings.push(result.data.id);
      return result.data;
    }
    throw new Error(`Failed to create test feeding: ${JSON.stringify(result)}`);
  }

  async createTestHousehold(data: { name: string; description?: string }) {
    const response = await this.page.request.post('/api/v2/households', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await this.getAuthHeader(),
      },
      data: JSON.stringify({
        name: data.name,
        description: data.description,
      }),
    });

    const result = await response.json();
    if (result.success && result.data?.id) {
      this.createdHouseholds.push(result.data.id);
      return result.data;
    }
    throw new Error(`Failed to create test household: ${JSON.stringify(result)}`);
  }

  async cleanupTestData() {
    console.log('Starting test data cleanup...');
    
    // Clean up feedings first (cats might depend on household)
    for (const feedingId of this.createdFeedings) {
      try {
        await this.page.request.delete(`/api/v2/feedings/${feedingId}`, {
          headers: { 'Authorization': await this.getAuthHeader() },
        });
        console.log(`Deleted feeding: ${feedingId}`);
      } catch (e) {
        console.error(`Failed to cleanup feeding ${feedingId}:`, e);
      }
    }
    this.createdFeedings = [];

    // Clean up cats
    for (const catId of this.createdCats) {
      try {
        await this.page.request.delete(`/api/v2/cats/${catId}`, {
          headers: { 'Authorization': await this.getAuthHeader() },
        });
        console.log(`Deleted cat: ${catId}`);
      } catch (e) {
        console.error(`Failed to cleanup cat ${catId}:`, e);
      }
    }
    this.createdCats = [];

    // Clean up households
    for (const householdId of this.createdHouseholds) {
      try {
        await this.page.request.delete(`/api/v2/households/${householdId}`, {
          headers: { 'Authorization': await this.getAuthHeader() },
        });
        console.log(`Deleted household: ${householdId}`);
      } catch (e) {
        console.error(`Failed to cleanup household ${householdId}:`, e);
      }
    }
    this.createdHouseholds = [];
    this.currentHouseholdId = null;
    
    console.log('Test data cleanup completed!');
  }

  async cleanupAllTestUserData() {
    console.log('Starting full cleanup of all test user data...');
    
    try {
      const authHeader = await this.getAuthHeader();
      
      // Get all households
      const householdsResponse = await this.page.request.get('/api/v2/households', {
        headers: { 'Authorization': authHeader },
      });
      const householdsResult = await householdsResponse.json();
      
      if (householdsResult.success && householdsResult.data) {
        const households = householdsResult.data as Array<{ id: string; name: string }>;
        const testHouseholds = households.filter((h: { name: string }) => 
          h.name.includes('TestHousehold') || 
          h.name.includes('API_Household') ||
          h.name.includes('Casa_') ||
          h.name.startsWith('Miau_')
        );
        
        console.log(`Found ${testHouseholds.length} test households to delete`);
        
        for (const household of testHouseholds) {
          try {
            await this.page.request.delete(`/api/v2/households/${household.id}`, {
              headers: { 'Authorization': authHeader },
            });
            console.log(`Deleted household: ${household.name} (${household.id})`);
          } catch (e) {
            console.error(`Failed to delete household ${household.id}:`, e);
          }
        }
      }
      
      // Get all cats
      const catsResponse = await this.page.request.get('/api/v2/cats', {
        headers: { 'Authorization': authHeader },
      });
      const catsResult = await catsResponse.json();
      
      if (catsResult.success && catsResult.data) {
        const cats = catsResult.data as Array<{ id: string; name: string }>;
        const testCats = cats.filter((c: { name: string }) => 
          c.name.includes('TestHousehold') || 
          c.name.includes('API_') ||
          c.name.includes('Miau_') ||
          c.name.includes('Updated_')
        );
        
        console.log(`Found ${testCats.length} test cats to delete`);
        
        for (const cat of testCats) {
          try {
            await this.page.request.delete(`/api/v2/cats/${cat.id}`, {
              headers: { 'Authorization': authHeader },
            });
            console.log(`Deleted cat: ${cat.name} (${cat.id})`);
          } catch (e) {
            console.error(`Failed to delete cat ${cat.id}:`, e);
          }
        }
      }
      
      console.log('Full cleanup completed!');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  generateUniqueName(prefix: string): string {
    const timestamp = Date.now();
    return `${prefix}_${timestamp}`;
  }

  generateUniqueEmail(): string {
    const timestamp = Date.now();
    return `test_${timestamp}@example.com`;
  }
}
