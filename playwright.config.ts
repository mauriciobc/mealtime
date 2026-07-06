import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.test.local', '.env.local'] });

const isLocalBaseUrl =
  !process.env.PLAYWRIGHT_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL.includes('localhost') ||
  process.env.PLAYWRIGHT_BASE_URL.includes('127.0.0.1');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: 'tests/fixtures/auth.json',
  },
  projects: [
    // Setup project - runs authentication before all other tests
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Unauthenticated security tests (no auth.setup dependency)
    {
      name: 'chromium-unauthenticated',
      testMatch: /.*(auth|security)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
    // Authenticated tests (all other tests except auth/security)
    {
      name: 'chromium',
      testIgnore: /.*(auth|security)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      testIgnore: /.*(auth|security)\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      testIgnore: /.*(auth|security)\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup'],
    },
  ],
  ...(isLocalBaseUrl
    ? {
        webServer: {
          command: 'npm run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      }
    : {}),
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
    },
  },
  timeout: 60000, // Increased timeout for auth setup and slower environments
});
