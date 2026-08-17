import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { v2Err } from '@/lib/responses/v2-json';
import type { NextResponse } from 'next/server';

export type HouseholdMembership = {
  id: string;
  user_id: string;
  household_id: string;
  role: string;
};

export type AuthzOk<T> = { ok: true; data: T };
export type AuthzFail = { ok: false; response: NextResponse };
export type AuthzResult<T> = AuthzOk<T> | AuthzFail;

export function isAdminRole(role: string | null | undefined): boolean {
  return (role ?? '').trim().toLowerCase() === 'admin';
}

export function householdIdsFromMembers(
  members: Array<{ household_id: string }>
): string[] {
  return members.map((m) => m.household_id).filter(Boolean);
}

function fail(error: string, status: number): AuthzFail {
  return { ok: false, response: v2Err(error, status) };
}

export async function requireHouseholdMember(
  userId: string,
  householdId: string
): Promise<AuthzResult<HouseholdMembership>> {
  try {
    const membership = await prisma.household_members.findFirst({
      where: { user_id: userId, household_id: householdId },
      select: { id: true, user_id: true, household_id: true, role: true },
    });

    if (!membership) {
      logger.warn('[authz] User is not a household member', { userId, householdId });
      return fail('Access denied to this household', 403);
    }

    return { ok: true, data: membership };
  } catch (error) {
    logger.error('[authz] requireHouseholdMember failed', { error, userId, householdId });
    return fail('Erro ao validar acesso ao household', 500);
  }
}

export async function requireHouseholdAdmin(
  userId: string,
  householdId: string
): Promise<AuthzResult<HouseholdMembership>> {
  try {
    const household = await prisma.households.findUnique({
      where: { id: householdId },
      select: { owner_id: true },
    });

    if (!household) {
      return fail('Household not found', 404);
    }

    const membershipResult = await requireHouseholdMember(userId, householdId);

    if (household.owner_id === userId) {
      if (membershipResult.ok) {
        return membershipResult;
      }
      return {
        ok: true,
        data: {
          id: '',
          user_id: userId,
          household_id: householdId,
          role: 'admin',
        },
      };
    }

    if (!membershipResult.ok) {
      return membershipResult;
    }

    if (!isAdminRole(membershipResult.data.role)) {
      logger.warn('[authz] User is not a household admin', { userId, householdId });
      return fail('Apenas administradores podem executar esta ação.', 403);
    }

    return membershipResult;
  } catch (error) {
    logger.error('[authz] requireHouseholdAdmin failed', { error, userId, householdId });
    return fail('Erro ao validar acesso ao household', 500);
  }
}

export async function requireCatAccess(userId: string, catId: string) {
  try {
    const cat = await prisma.cats.findUnique({ where: { id: catId } });

    if (!cat) {
      logger.warn('[authz] Cat not found', { userId, catId });
      return fail('Cat not found', 404);
    }

    const membership = await requireHouseholdMember(userId, cat.household_id);
    if (!membership.ok) {
      logger.warn('[authz] User cannot access cat', {
        userId,
        catId,
        householdId: cat.household_id,
      });
      return fail('Access denied to this cat', 403);
    }

    return { ok: true, data: { cat, membership: membership.data } };
  } catch (error) {
    logger.error('[authz] requireCatAccess failed', { error, userId, catId });
    return fail('Erro ao validar acesso ao gato', 500);
  }
}
