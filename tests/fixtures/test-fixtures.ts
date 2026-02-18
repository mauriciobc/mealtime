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
import { HouseholdNewPage, HouseholdEditPage, HouseholdInvitePage } from '../pages/household-pages';
import { WeightPage, WeightRegisterDialog, WeightGoalDialog } from '../pages/weight-page';
import { SettingsPage } from '../pages/settings-page';
import { SignupPage } from '../pages/signup-page';
import { SchedulesPage } from '../pages/schedules-page';
import { ScheduleNewPage } from '../pages/schedule-new-page';
import { StatisticsPage } from '../pages/statistics-page';
import { HistoryPage } from '../pages/history-page';
import { ProfilePage } from '../pages/profile-page';
import { NotificationsPage } from '../pages/notifications-page';
import { JoinPage } from '../pages/join-page';
import { ErrorPage } from '../pages/error-page';
import { OfflinePage } from '../pages/offline-page';
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
  householdInvitePage: HouseholdInvitePage;
  weightPage: WeightPage;
  weightRegisterDialog: WeightRegisterDialog;
  weightGoalDialog: WeightGoalDialog;
  settingsPage: SettingsPage;
  signupPage: SignupPage;
  schedulesPage: SchedulesPage;
  scheduleNewPage: ScheduleNewPage;
  statisticsPage: StatisticsPage;
  historyPage: HistoryPage;
  profilePage: ProfilePage;
  notificationsPage: NotificationsPage;
  joinPage: JoinPage;
  errorPage: ErrorPage;
  offlinePage: OfflinePage;
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

  householdInvitePage: async ({ page }, use) => {
    await use(new HouseholdInvitePage(page));
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

  schedulesPage: async ({ page }, use) => {
    await use(new SchedulesPage(page));
  },

  scheduleNewPage: async ({ page }, use) => {
    await use(new ScheduleNewPage(page));
  },

  statisticsPage: async ({ page }, use) => {
    await use(new StatisticsPage(page));
  },

  historyPage: async ({ page }, use) => {
    await use(new HistoryPage(page));
  },

  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },

  notificationsPage: async ({ page }, use) => {
    await use(new NotificationsPage(page));
  },

  joinPage: async ({ page }, use) => {
    await use(new JoinPage(page));
  },

  errorPage: async ({ page }, use) => {
    await use(new ErrorPage(page));
  },

  offlinePage: async ({ page }, use) => {
    await use(new OfflinePage(page));
  },

  testDataManager: async ({ page }, use) => {
    const manager = new TestDataManager(page);
    try {
      await use(manager);
    } finally {
      // Automatic cleanup after test completes (even if it fails)
      await manager.cleanupTestData();
    }
  },

  apiHelper: async ({ page }, use) => {
    await use(new APIHelper(page));
  },

  testUser: async ({}, use) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'test_e2e@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'Test@123456';
    const testUserId = process.env.TEST_USER_ID || '';
    const testHouseholdId = process.env.TEST_HOUSEHOLD_ID || '';

    // Warn if critical env vars are missing (but don't fail - allow defaults for local dev)
    if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
      console.warn('⚠️  TEST_USER_EMAIL or TEST_USER_PASSWORD not set. Using defaults. Tests may fail if defaults are invalid.');
    }

    await use({
      email: testEmail,
      password: testPassword,
      userId: testUserId,
      householdId: testHouseholdId,
    });
  },
});

export { expect } from '@playwright/test';
