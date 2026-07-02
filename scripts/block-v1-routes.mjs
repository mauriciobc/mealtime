#!/usr/bin/env node
/**
 * Replace legacy v1 API route handlers with 410 Gone responses.
 * Excludes: /api/auth/*, /api/swagger, /api/monitoring/*
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API_ROOT = path.join(ROOT, 'app', 'api');

const KEEP_PREFIXES = [
  'auth/',
  'swagger',
  'monitoring/',
  'v2/',
];

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function shouldBlock(relativePath) {
  if (relativePath.endsWith('.bak')) return false;
  if (!relativePath.endsWith('route.ts')) return false;
  return !KEEP_PREFIXES.some((p) => relativePath.startsWith(p) || relativePath.includes(`/${p}`));
}

function generateRoute(methods = METHODS) {
  const exports = methods
    .map(
      (m) => `export async function ${m}(_request: NextRequest) {
  return v1DeprecatedResponse();
}`
    )
    .join('\n\n');

  return `import { NextRequest } from 'next/server';
import { v1DeprecatedResponse } from '@/lib/middleware/block-v1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

${exports}
`;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name === 'route.ts') files.push(full);
  }
  return files;
}

const routes = walk(API_ROOT);
let blocked = 0;

for (const file of routes) {
  const rel = path.relative(API_ROOT, file).replace(/\\/g, '/');
  if (!shouldBlock(rel)) continue;

  const content = generateRoute();
  fs.writeFileSync(file, content, 'utf8');
  blocked++;
  console.log('blocked:', rel);
}

console.log(`\nBlocked ${blocked} v1 route files.`);
