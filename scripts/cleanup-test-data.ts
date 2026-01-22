import { chromium } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.test.local', '.env.local'] });

async function cleanupAllTestData() {
  const testEmail = process.env.TEST_USER_EMAIL || 'test_1761761083178@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'Test@123456';
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  console.log('Starting full cleanup of test data...');
  console.log(`Using user: ${testEmail}`);
  console.log(`Base URL: ${baseURL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Authenticate
    console.log('Authenticating...');
    const authResponse = await page.request.post(`${baseURL}/api/auth/mobile`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    
    const authResult = await authResponse.json();
    
    if (!authResult.success || !authResult.access_token) {
      throw new Error('Authentication failed');
    }
    
    const accessToken = authResult.access_token;
    const authHeader = `Bearer ${accessToken}`;
    console.log('Authenticated successfully!');

    // Get and delete test households
    console.log('\n--- Cleaning up households ---');
    const householdsResponse = await page.request.get(`${baseURL}/api/v2/households`, {
      headers: { 'Authorization': authHeader },
    });
    
    const householdsResult = await householdsResponse.json();
    
    if (householdsResult.success && householdsResult.data) {
      const households = householdsResult.data as Array<{ id: string; name: string }>;
      
      // Match test households by patterns - comprehensive list
      const testHouseholds = households.filter((h: { id: string; name: string }) => {
        const name = h.name;
        const isTestHousehold = (
          name.includes('TestHousehold') || 
          name.includes('API_Household') ||
          name.includes('Casa_') ||
          name.startsWith('UpdatedHousehold') ||
          /_\d{10,}/.test(name) ||  // Matches timestamps like _1768414xxxxx
          name.startsWith('Test_Household') ||
          name.startsWith('API_Household')
        );
        return isTestHousehold;
      });
      
      console.log(`Found ${testHouseholds.length} test households to delete`);
      
      for (const household of testHouseholds) {
        try {
          await page.request.delete(`${baseURL}/api/v2/households/${household.id}`, {
            headers: { 'Authorization': authHeader },
          });
          console.log(`✓ Deleted: ${household.name} (${household.id})`);
        } catch (e) {
          console.error(`✗ Failed to delete household ${household.id}:`, e);
        }
      }
    }

    // Get and delete test cats
    console.log('\n--- Cleaning up cats ---');
    const catsResponse = await page.request.get(`${baseURL}/api/v2/cats`, {
      headers: { 'Authorization': authHeader },
    });
    
    const catsResult = await catsResponse.json();
    
    if (catsResult.success && catsResult.data) {
      const cats = catsResult.data as Array<{ id: string; name: string }>;
      
      // Match test cats by patterns
      const testCats = cats.filter((c: { id: string; name: string }) => {
        const name = c.name;
        const isTestCat = (
          name.includes('Miau_') ||
          name.includes('Updated_') ||
          name.includes('Test_Cat') ||
          name.includes('API_Cat') ||
          /_\d{10,}/.test(name) ||  // Matches timestamps
          name.startsWith('Test_Miau') ||
          name.startsWith('API_Miau')
        );
        return isTestCat;
      });
      
      console.log(`Found ${testCats.length} test cats`);
      
      for (const cat of testCats) {
        try {
          await page.request.delete(`${baseURL}/api/v2/cats/${cat.id}`, {
            headers: { 'Authorization': authHeader },
          });
          console.log(`✓ Deleted: ${cat.name} (${cat.id})`);
        } catch (e) {
          console.error(`✗ Failed to delete cat ${cat.id}:`, e);
        }
      }
    }

    // Get and delete test feedings
    console.log('\n--- Cleaning up feedings ---');
    const feedingsResponse = await page.request.get(`${baseURL}/api/v2/feedings`, {
      headers: { 'Authorization': authHeader },
    });
    
    const feedingsResult = await feedingsResponse.json();
    
    if (feedingsResult.success && feedingsResult.data) {
      const feedings = feedingsResult.data as Array<{ id: string }>;
      
      console.log(`Found ${feedings.length} feedings to check`);
      
      for (const feeding of feedings) {
        try {
          await page.request.delete(`${baseURL}/api/v2/feedings/${feeding.id}`, {
            headers: { 'Authorization': authHeader },
          });
          console.log(`✓ Deleted feeding: ${feeding.id}`);
        } catch (e) {
          console.error(`✗ Failed to delete feeding ${feeding.id}:`, e);
        }
      }
    }

    console.log('\n=== Cleanup completed! ===');
    console.log('\nTip: You can run this script anytime with: npm run test:e2e:cleanup');
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

cleanupAllTestData();
