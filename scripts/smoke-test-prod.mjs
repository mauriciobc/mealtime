#!/usr/bin/env node
/**
 * Post-deploy smoke tests for R1–R2 alignment (FOUNDATIONAL-AUDIT-2026).
 * Usage: node scripts/smoke-test-prod.mjs [baseUrl]
 */
const base = process.argv[2]?.replace(/\/$/, '') || 'https://mealtime.app.br';

const checks = [
  { path: '/api/feedings', method: 'GET', expect: 410, label: 'v1 feedings deprecated' },
  { path: '/api/test-prisma', method: 'GET', expect: [404, 410], label: 'test-prisma removed' },
  { path: '/api/v2/cats', method: 'GET', expect: 401, label: 'v2 cats requires auth' },
  { path: '/api/feedings/cats?householdId=00000000-0000-0000-0000-000000000001', method: 'GET', expect: [401, 410], label: 'feedings/cats protected or deprecated' },
];

let failed = 0;

for (const { path, method, expect, label } of checks) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { method, redirect: 'manual' });
    const expected = Array.isArray(expect) ? expect : [expect];
    const ok = expected.includes(res.status);
    const status = ok ? 'OK' : 'FAIL';
    console.log(`${status} ${label}: ${res.status} (expected ${expected.join('|')}) — ${url}`);
    if (!ok) failed++;
  } catch (err) {
    console.log(`FAIL ${label}: ${err.message}`);
    failed++;
  }
}

process.exit(failed > 0 ? 1 : 0);
