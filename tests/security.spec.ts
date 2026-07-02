import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Security — API hardening', () => {
  test('v1 feedings returns 410 Gone', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/feedings`);
    expect(res.status()).toBe(410);
    const body = await res.json();
    expect(body.error).toContain('deprecated');
  });

  test('v1 deliver returns 410 Gone', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/scheduled-notifications/deliver`);
    expect(res.status()).toBe(410);
  });

  test('v2 deliver rejects missing cron secret', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/v2/scheduled-notifications/deliver`);
    expect(res.status()).toBe(401);
  });

  test('test-prisma route removed', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/test-prisma`);
    expect(res.status()).toBe(404);
  });

  test('v2 cats requires auth', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/v2/cats`);
    expect(res.status()).toBe(401);
  });
});
