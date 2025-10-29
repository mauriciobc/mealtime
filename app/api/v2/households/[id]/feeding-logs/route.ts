import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { BaseFeedingLog } from '@/lib/types/common';

// Explicitly set runtime to Node.js
export const runtime = 'nodejs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Zod schema for route parameters
const RouteParamsSchema = z.object({
  id: z.string().uuid({ message: "ID do domicílio inválido" }),
});

// Helper function for authorization
async function authorizeMember(userId: string, householdId: string): Promise<{ 
  authorized: boolean; 
  error?: NextResponse 
}> {
  try {
    // Check if user is a member of the household
    const householdMember = await prisma.household_members.findFirst({
      where: { 
        user_id: userId,
        household_id: householdId
      },
    });

    if (!householdMember) {
      return { 
        authorized: false, 
        error: NextResponse.json({
          success: false,
          error: 'Você não tem permissão para acessar este domicílio'
        }, { status: 403 })
      };
    }

    return { authorized: true };
  } catch (error) {
    logger.error('Authorization error:', { error });
    return { 
      authorized: false, 
      error: NextResponse.json({
        success: false,
        error: 'Erro interno do servidor durante autorização'
      }, { status: 500 })
    };
  }
}

// GET /api/v2/households/[id]/feeding-logs - Get feeding logs for a household
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ id: string }> }
) => {
  const requestId = request.headers.get("x-request-id") || "unknown";

  // Fail fast if framework doesn't provide route parameters
  if (!context?.params) {
    logger.error("[GET /api/v2/households/[id]/feeding-logs] Missing context.params from framework", {
      requestId,
      userId: user.id,
      url: request.url
    });
    return NextResponse.json({
      success: false,
      error: "Internal routing error: missing route parameters"
    }, { status: 500 });
  }

  try {
    const params = await context.params;
    
    // Validate route parameters
    const paramsValidation = RouteParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'ID do domicílio inválido',
        details: paramsValidation.error.issues
      }, { status: 400 });
    }
    const householdId = paramsValidation.data.id;

    logger.info("[GET /api/v2/households/[id]/feeding-logs] Starting request", {
      requestId,
      userId: user.id,
      householdId
    });

    // Authorize user
    const authResult = await authorizeMember(user.id, householdId);
    if (!authResult.authorized) {
      return authResult.error!;
    }

    // Parse query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const catId = searchParams.get('catId');

    // Build where clause
    const whereClause: any = {
      cat: {
        household_id: householdId
      }
    };

    // Add optional cat filter
    if (catId) {
      whereClause.cat_id = catId;
    }

    // Fetch feeding logs for the authorized household
    const logs = await prisma.feeding_logs.findMany({
      where: whereClause,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            household_id: true
          }
        },
        feeder: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        }
      },
      orderBy: {
        fed_at: 'desc'
      },
      take: Math.min(limit, 500), // Max 500 records
      skip: offset
    });

    // Get total count for pagination
    const totalCount = await prisma.feeding_logs.count({
      where: whereClause
    });

    // Convert to BaseFeedingLog format
    const formattedLogs: BaseFeedingLog[] = logs.map(log => {
      const mapped: any = {
        id: log.id,
        catId: log.cat_id,
        userId: log.fed_by || '',
        timestamp: log.fed_at,
        createdAt: log.created_at,
      };
      
      // Only add optional fields if they have values
      if (log.amount) {
        mapped.portionSize = parseFloat(log.amount.toString());
      }
      if (log.notes) {
        mapped.notes = log.notes;
      }
      
      return mapped as BaseFeedingLog;
    });

    logger.info("[GET /api/v2/households/[id]/feeding-logs] Successfully fetched logs", {
      requestId,
      count: formattedLogs.length,
      totalCount
    });

    return NextResponse.json({
      success: true,
      data: formattedLogs,
      count: formattedLogs.length,
      totalCount,
      pagination: {
        limit,
        offset,
        hasMore: (offset + formattedLogs.length) < totalCount
      }
    });

  } catch (error) {
    logger.error('[GET /api/v2/households/[id]/feeding-logs] Error fetching logs:', {
      requestId,
      error
    });
    
    // Check for Prisma connection errors
    if ((error as any)?.code?.startsWith('P1')) {
      return NextResponse.json({
        success: false,
        error: "Database connection error"
      }, { status: 503 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar logs de alimentação'
    }, { status: 500 });
  }
});

