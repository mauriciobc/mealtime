import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { headers } from 'next/headers';

// Zod schema for query validation
const CatIdQuerySchema = z.object({
  catId: z.string().uuid(),
});

// Função auxiliar para criar respostas JSON padronizadas
function createJSONResponse(data: any, status: number) {
  return new NextResponse(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID'
      }
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const headersList = await headers();
    const authUserId = headersList.get('X-User-ID');
    if (!authUserId) {
      return createJSONResponse({ error: 'Not authenticated' }, 401);
    }

    const { searchParams } = new URL(request.url);
    const parseResult = CatIdQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parseResult.success) {
      return createJSONResponse({ error: 'Valid catId query parameter is required' }, 400);
    }
    const { catId } = parseResult.data;

    // Fetch the cat and its household
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
      return createJSONResponse({ error: 'Cat not found' }, 404);
    }

    // Check if user is owner or household member
    const isOwner = cat.owner_id === authUserId;
    const isHouseholdMember = cat.household.household_members.some(
      (member) => member.user_id === authUserId
    );
    if (!isOwner && !isHouseholdMember) {
      return createJSONResponse({ error: 'Forbidden: You do not have access to this cat' }, 403);
    }

    const feedingLogs = await prisma.feeding_logs.findMany({
      where: { cat_id: catId },
      orderBy: { fed_at: 'desc' },
    });

    // Format logs for the chart (adjust fields as needed)
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

    return createJSONResponse(formattedLogs, 200);
  } catch (error) {
    console.error('[API GET /api/feeding-logs] Error:', error);
    return createJSONResponse({ error: 'Internal Server Error' }, 500);
  }
} 