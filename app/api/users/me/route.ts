import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/responses/api-responses';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/users/me
 * Get current authenticated user profile
 */
export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.success) {
    return ApiResponse.error(
      authResult.error || 'Not authenticated',
      authResult.statusCode || 401,
      'AUTH_ERROR',
      undefined,
      request
    );
  }

  const user = authResult.user!;

  try {
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      include: {
        household_members: {
          include: {
            household: {
              select: {
                id: true,
                name: true,
                inviteCode: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return ApiResponse.notFound('Profile not found', request);
    }

    const response = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      timezone: profile.timezone,
      households: profile.household_members.map((member) => ({
        id: member.household.id,
        name: member.household.name,
        role: member.role,
        invite_code: member.household.inviteCode,
      })),
    };

    return ApiResponse.success(response, 200, request);
  } catch (error) {
    logger.error('[GET /api/users/me] Error fetching profile', { error, userId: user.id });
    return ApiResponse.error('Failed to fetch profile', 500, 'INTERNAL_ERROR', error, request);
  }
}
