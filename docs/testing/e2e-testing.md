# E2E Testing Guide

This document describes the end-to-end (E2E) testing setup for the MealTime application using Playwright.

## Overview

The E2E tests verify that the application works correctly from the user's perspective by simulating real user interactions in a browser. Tests cover authentication flows, dashboard functionality, cat management, feeding logs, and household management.

## Tech Stack

- **Test Framework**: [Playwright](https://playwright.dev/)
- **Language**: TypeScript
- **Browser Support**: Chromium, Firefox, WebKit (mobile testing via mobile Chrome and Safari)
- **Test Location**: `tests/` directory

## Prerequisites

1. Node.js >= 20.19.0
2. Dependencies installed (`npm install`)
3. Development server running (`npm run dev`)
4. Test database with test data

## Installation

```bash
# Install dependencies and Playwright browsers
npm install
npm run test:e2e:install

# Or install only Chromium
npx playwright install chromium
```

## Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Test user credentials (must exist in the database)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Test@123456
TEST_USER_ID=user-uuid
TEST_HOUSEHOLD_ID=household-uuid

# Base URL for tests (default: http://localhost:3000)
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### Playwright Configuration

The main configuration is in `playwright.config.ts`. Key settings:

- **Base URL**: `http://localhost:3000` (configurable via `PLAYWRIGHT_BASE_URL`)
- **Projects**: Chromium (desktop), mobile Chrome, mobile Safari
- **Retries**: 2 retries in CI, 0 locally
- **Trace**: `on-first-retry` for debugging failed tests
- **Screenshots**: `only-on-failure`
- **Video**: `retain-on-failure`

## Running Tests

### All Tests

```bash
npm run test:e2e
```

### UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

### Headed Mode (Visible Browser)

```bash
npm run test:e2e:headed
```

### Specific Test Files

```bash
# Authentication tests
npm run test:e2e:auth

# Dashboard tests
npm run test:e2e:dashboard

# Cats management tests
npm run test:e2e:cats

# Feedings tests
npm run test:e2e:feedings
```

### Mobile Tests

```bash
npm run test:e2e:mobile
```

### View Test Report

```bash
npm run test:e2e:report
```

## Test Structure

```
tests/
├── fixtures/
│   └── test-fixtures.ts       # Shared test fixtures and hooks
├── pages/
│   ├── login-page.ts          # Login page interactions
│   ├── dashboard-page.ts      # Dashboard page interactions
│   ├── cats-page.ts           # Cats list page
│   ├── cat-detail-page.ts     # Cat detail page
│   ├── cat-new-page.ts        # Create new cat page
│   ├── feedings-page.ts       # Feeding history page
│   ├── feeding-new-page.ts    # Create new feeding page
│   ├── households-page.ts     # Households page
│   ├── settings-page.ts       # Settings page
│   └── signup-page.ts         # Signup page
├── helpers/
│   ├── api-helper.ts          # API testing utilities
│   └── test-data-manager.ts   # Test data creation/cleanup
├── auth.spec.ts               # Authentication tests
├── dashboard.spec.ts          # Dashboard tests
├── cats.spec.ts               # Cats management tests
├── feedings.spec.ts           # Feeding logs tests
├── households.spec.ts         # Households tests
└── settings.spec.ts           # Settings tests
```

## Writing Tests

### Basic Test Example

```typescript
import { test, expect } from '../fixtures/test-fixtures';

test('should display login page', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.expectOnLoginPage();
});
```

### Using Fixtures

```typescript
test('should login successfully', async ({ loginPage, testUser }) => {
  await loginPage.goto();
  await loginPage.login(testUser.email, testUser.password);
  await expect(page).toHaveURL('/');
});
```

### Testing API Endpoints

```typescript
test('should create cat via API', async ({ apiHelper, testUser }) => {
  await apiHelper.authenticate(testUser.email, testUser.password);
  
  const result = await apiHelper.createCat({
    name: 'Test Cat',
    weight: '4.5',
    portionSize: '50',
  });
  
  expect(result).toHaveProperty('success', true);
});
```

## Best Practices

1. **Use Page Objects**: Use the page classes in `tests/pages/` for reusable interactions
2. **Cleanup Test Data**: Use `testDataManager.cleanupTestData()` in `test.afterEach`
3. **Handle Auth State**: Use storage state for authenticated tests
4. **Wait for Load States**: Use `waitForLoadState('networkidle')` for stability
5. **Avoid Hard-Coded Selectors**: Use meaningful selectors and page object methods

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run E2E Tests
  run: |
    npm run test:e2e
  env:
    PLAYWRIGHT_BASE_URL: http://localhost:3000
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

## Troubleshooting

### Tests Failing Due to Timeout

Increase the timeout in `playwright.config.ts`:

```typescript
timeout: 60000, // 60 seconds
```

### Browser Not Found

Install browsers:

```bash
npm run test:e2e:install
```

### Authentication Issues

1. Verify test user credentials
2. Ensure user has a household associated
3. Check `.env.local` configuration

### Tests Passing Locally but Failing in CI

1. Check environment variables in CI
2. Increase timeouts for slower CI environments
3. Verify the development server is running before tests

## Debugging Failed Tests

1. **View Trace**: Open the Playwright trace viewer
2. **Check Screenshots**: Screenshots are saved on failure
3. **Check Console**: Console logs are captured for debugging
4. **Run Single Test**: Use `test.only()` to isolate failing tests

## Mobile Testing

The test suite includes mobile device testing:

- **Mobile Chrome**: Pixel 5 emulation
- **Mobile Safari**: iPhone 12 emulation

Run mobile tests:

```bash
npm run test:e2e:mobile
```

## Coverage

Current test coverage includes:

- Authentication (login, logout, validation)
- Dashboard (navigation, welcome message)
- Cats Management (list, create)
- Feedings Management (list, create)
- Households Management (list, create)
- Settings (navigation)
- API endpoints (authentication, CRUD operations)
