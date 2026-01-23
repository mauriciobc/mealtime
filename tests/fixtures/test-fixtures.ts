import { test as base, type Page, type BrowserContext } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { DashboardPage } from '../pages/dashboard-page';
import { CatsPage } from '../pages/cats-page';
import { CatDetailPage } from '../pages/cat-detail-page';
import { CatNewPage } from '../pages/cat-new-page';
import { CatEditPage } from '../pages/cat-edit-page';
import { FeedingsPage } from '../pages/feedings-page';
import { FeedingNewPage } from '../pages/feeding-new-page';
import { HouseholdsPage } from '../pages/households-page';
import { HouseholdNewPage, HouseholdEditPage } from '../pages/household-pages';
import { WeightPage, WeightRegisterDialog, WeightGoalDialog } from '../pages/weight-page';
import { SettingsPage } from '../pages/settings-page';
import { SignupPage } from '../pages/signup-page';
import { TestDataManager } from '../helpers/test-data-manager';
import { APIHelper } from '../helpers/api-helper';

interface TestFixtures {
  page: Page;
  context: BrowserContext;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  catsPage: CatsPage;
  catDetailPage: CatDetailPage;
  catNewPage: CatNewPage;
  catEditPage: CatEditPage;
  feedingsPage: FeedingsPage;
  feedingNewPage: FeedingNewPage;
  householdsPage: HouseholdsPage;
  householdNewPage: HouseholdNewPage;
  householdEditPage: HouseholdEditPage;
  weightPage: WeightPage;
  weightRegisterDialog: WeightRegisterDialog;
  weightGoalDialog: WeightGoalDialog;
  settingsPage: SettingsPage;
  signupPage: SignupPage;
  testDataManager: TestDataManager;
  apiHelper: APIHelper;
  testUser: {
    email: string;
    password: string;
    userId: string;
    householdId: string;
  };
}

export const test = base.extend<TestFixtures>({
  page: async ({ page }, use) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });
    await use(page);
  },

  context: async ({ context }, use) => {
    await use(context);
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  catsPage: async ({ page }, use) => {
    await use(new CatsPage(page));
  },

  catDetailPage: async ({ page }, use) => {
    await use(new CatDetailPage(page));
  },

  catNewPage: async ({ page }, use) => {
    await use(new CatNewPage(page));
  },

  catEditPage: async ({ page }, use) => {
    await use(new CatEditPage(page));
  },

  feedingsPage: async ({ page }, use) => {
    await use(new FeedingsPage(page));
  },

  feedingNewPage: async ({ page }, use) => {
    await use(new FeedingNewPage(page));
  },

  householdsPage: async ({ page }, use) => {
    await use(new HouseholdsPage(page));
  },

  householdNewPage: async ({ page }, use) => {
    await use(new HouseholdNewPage(page));
  },

  householdEditPage: async ({ page }, use) => {
    await use(new HouseholdEditPage(page));
  },

  weightPage: async ({ page }, use) => {
    await use(new WeightPage(page));
  },

  weightRegisterDialog: async ({ page }, use) => {
    await use(new WeightRegisterDialog(page));
  },

  weightGoalDialog: async ({ page }, use) => {
    await use(new WeightGoalDialog(page));
  },

  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },

  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },

  testDataManager: async ({ page }, use) => {
    await use(new TestDataManager(page));
  },

  apiHelper: async ({ page }, use) => {
    await use(new APIHelper(page));
  },

  testUser: async ({}, use) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'test_e2e@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'Test@123456';
    const testUserId = process.env.TEST_USER_ID || '';
    const testHouseholdId = process.env.TEST_HOUSEHOLD_ID || '';

    await use({
      email: testEmail,
      password: testPassword,
      userId: testUserId,
      householdId: testHouseholdId,
    });
  },
});

export { expect } from '@playwright/test';
