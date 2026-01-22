import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getAuthenticatedUser, AuthenticatedUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/responses/api-responses';

const CatIdQuerySchema = z.object({
  catId: z.string().uuid(),
});

export async function OPTIONS(request: NextRequest) {
  return ApiResponse.json(null, 204, request);
}

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

  const user: AuthenticatedUser = authResult.user!;

  try {
    const { searchParams } = new URL(request.url);
    const parseResult = CatIdQuerySchema.safeParse(Object.fromEntries(searchParams));
    
    if (!parseResult.success) {
      return ApiResponse.validationError(parseResult.error.flatten(), request);
    }
    
    const { catId } = parseResult.data;

    const cat = await prisma.cats.findUnique({
      where: { id: catId },
      select: {
        id: true,
        owner_id: true,
        household_id: true,
        household: {
          select: {
            id: true,
            household_members: {
              select: { user_id: true }
            }
          }
        }
      }
    });
    
    if (!cat) {
      return ApiResponse.notFound('Cat not found', request);
    }

    const isOwner = cat.owner_id === user.id;
    const isHouseholdMember = cat.household.household_members.some(
      (member) => member.user_id === user.id
    );
    
    if (!isOwner && !isHouseholdMember) {
      return ApiResponse.error('Forbidden: You do not have access to this cat', 403, 'FORBIDDEN', undefined, request);
    }

    const feedingLogs = await prisma.feeding_logs.findMany({
      where: { cat_id: catId },
      orderBy: { fed_at: 'desc' },
    });

    const formattedLogs = feedingLogs.map(log => ({
      id: log.id,
      catId: log.cat_id,
      userId: log.fed_by,
      date: log.fed_at ? log.fed_at.toISOString().slice(0, 10) : null,
      meal_type: log.meal_type,
      amount: log.amount,
      unit: log.unit,
      notes: log.notes,
      createdAt: log.created_at,
    }));

    return ApiResponse.success(formattedLogs, 200, request);
  } catch (error) {
    return ApiResponse.error('Internal Server Error', 500, 'INTERNAL_ERROR', error, request);
  }
}
