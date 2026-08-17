import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    household_members: { findFirst: vi.fn() },
    households: { findUnique: vi.fn() },
    cats: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/monitoring/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import prisma from '@/lib/prisma';
import {
  isAdminRole,
  requireCatAccess,
  requireHouseholdAdmin,
  requireHouseholdMember,
} from '@/lib/authz/household-access';

const prismaMock = prisma as unknown as {
  household_members: { findFirst: ReturnType<typeof vi.fn> };
  households: { findUnique: ReturnType<typeof vi.fn> };
  cats: { findUnique: ReturnType<typeof vi.fn> };
};

const member = {
  id: 'mem-1',
  user_id: 'user-1',
  household_id: 'hh-1',
  role: 'member',
};

const admin = { ...member, role: 'admin', id: 'mem-admin' };

describe('isAdminRole', () => {
  it('accepts admin ignoring case and space', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole(' Admin ')).toBe(true);
    expect(isAdminRole('member')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});

describe('requireHouseholdMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns membership when the user belongs to the household', async () => {
    prismaMock.household_members.findFirst.mockResolvedValue(member);
    const result = await requireHouseholdMember('user-1', 'hh-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.role).toBe('member');
    }
  });

  it('returns 403 when the user is not a member', async () => {
    prismaMock.household_members.findFirst.mockResolvedValue(null);
    const result = await requireHouseholdMember('user-1', 'hh-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });
});

describe('requireHouseholdAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows household owner even without admin role', async () => {
    prismaMock.households.findUnique.mockResolvedValue({ owner_id: 'user-1' });
    prismaMock.household_members.findFirst.mockResolvedValue(member);
    const result = await requireHouseholdAdmin('user-1', 'hh-1');
    expect(result.ok).toBe(true);
  });

  it('allows membership admin', async () => {
    prismaMock.households.findUnique.mockResolvedValue({ owner_id: 'other' });
    prismaMock.household_members.findFirst.mockResolvedValue(admin);
    const result = await requireHouseholdAdmin('user-1', 'hh-1');
    expect(result.ok).toBe(true);
  });

  it('rejects a non-admin member', async () => {
    prismaMock.households.findUnique.mockResolvedValue({ owner_id: 'other' });
    prismaMock.household_members.findFirst.mockResolvedValue(member);
    const result = await requireHouseholdAdmin('user-1', 'hh-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it('returns 404 when household is missing', async () => {
    prismaMock.households.findUnique.mockResolvedValue(null);
    const result = await requireHouseholdAdmin('user-1', 'hh-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
    }
  });
});

describe('requireCatAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when the cat does not exist', async () => {
    prismaMock.cats.findUnique.mockResolvedValue(null);
    const result = await requireCatAccess('user-1', 'cat-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
    }
  });

  it('returns cat and membership when the user can access the cat', async () => {
    prismaMock.cats.findUnique.mockResolvedValue({
      id: 'cat-1',
      name: 'Mimi',
      household_id: 'hh-1',
    });
    prismaMock.household_members.findFirst.mockResolvedValue(member);
    const result = await requireCatAccess('user-1', 'cat-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cat.id).toBe('cat-1');
      expect(result.data.membership.household_id).toBe('hh-1');
    }
  });

  it('returns 403 when the user cannot access the cat household', async () => {
    prismaMock.cats.findUnique.mockResolvedValue({
      id: 'cat-1',
      name: 'Mimi',
      household_id: 'hh-1',
    });
    prismaMock.household_members.findFirst.mockResolvedValue(null);
    const result = await requireCatAccess('user-1', 'cat-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });
});
