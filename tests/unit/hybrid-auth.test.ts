import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    profiles: { findUnique: vi.fn() },
    household_members: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/middleware/mobile-auth', () => ({
  validateMobileAuth: vi.fn(),
}));

describe('withHybridAuth', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 when no auth header and no session', async () => {
    const { createClient } = await import('@/utils/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'no session' } }),
      },
    } as never);

    const { validateMobileAuth } = await import('@/lib/middleware/mobile-auth');
    vi.mocked(validateMobileAuth).mockResolvedValue({
      success: false,
      error: 'Unauthorized',
      statusCode: 401,
    });

    const { withHybridAuth } = await import('@/lib/middleware/hybrid-auth');
    const handler = withHybridAuth(async () => {
      return NextResponse.json({ ok: true });
    });

    const req = new NextRequest('http://localhost/api/v2/cats');
    const res = await handler(req, {} as { params: Promise<Record<string, string>> });
    expect(res.status).toBe(401);
  });
});
