import { TextEncoder, TextDecoder } from 'util';
import { Blob, File } from 'buffer';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Setup globals needed for Next.js tests
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
global.Blob = Blob as any;
global.File = File as any;

// Mock fetch
global.fetch = vi.fn();

// Setup Request/Response/Headers for Next.js
if (typeof Request === 'undefined') {
  Object.defineProperty(global, 'Request', {
    value: class Request {
      constructor(input: string | Request, init?: RequestInit) {}
    },
    writable: true
  });
}

if (typeof Response === 'undefined') {
  Object.defineProperty(global, 'Response', {
    value: class Response {
      constructor(body?: BodyInit | null, init?: ResponseInit) {}
    },
    writable: true
  });
}

if (typeof Headers === 'undefined') {
  Object.defineProperty(global, 'Headers', {
    value: class Headers {
      constructor(init?: HeadersInit) {}
    },
    writable: true
  });
}

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  }),
  headers: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  }),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_URL = 'postgresql://test:test@localhost:5432/test'; 