import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { BaseFeedingLog } from '@/lib/types/common';
import { requireHouseholdMember } from '@/lib/authz/household-access';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';

// Explicitly set runtime to Node.js
export const runtime = 'nodejs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Zod schema for route parameters
const RouteParamsSchema = z.object({
  id: z.string().uuid({ message: "ID do domicílio inválido" }),
});

// Helper function to safely parse and validate numeric query parameters
function parsePositiveInteger(
  value: string | null, 
  defaultValue: number, 
  maxValue?: number
): number {
  // Se não tem valor, retorna o padrão
  if (!value) {
    return defaultValue;
  }

  // Tenta converter para número
  const parsed = parseInt(value, 10);

  // Verifica se é um número válido (não NaN e é finito)
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return defaultValue;
  }

  // Garante que não é negativo
  if (parsed < 0) {
    return defaultValue;
  }

  // Se tem limite máximo, aplica ele
  if (maxValue !== undefined && parsed > maxValue) {
    return maxValue;
  }

  return parsed;
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
    return v2Err("Internal routing error: missing route parameters", 500);
  }

  try {
    const params = await context.params;
    
    // Validate route parameters
    const paramsValidation = RouteParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return v2Err('ID do domicílio inválido', 400, paramsValidation.error.issues);
    }
    const householdId = paramsValidation.data.id;

    logger.info("[GET /api/v2/households/[id]/feeding-logs] Starting request", {
      requestId,
      userId: user.id,
      householdId
    });

    const access = await requireHouseholdMember(user.id, householdId);
    if (!access.ok) return access.response;

    // Parse query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    
    // Sanitize and validate numeric parameters with safe defaults and max limits
    const limit = parsePositiveInteger(searchParams.get('limit'), 100, 500);
    const offset = parsePositiveInteger(searchParams.get('offset'), 0);
    
    // Handle catId as string or null
    const catId = searchParams.get('catId') || null;

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

    return v2Ok(formattedLogs);

  } catch (error) {
    logger.error('[GET /api/v2/households/[id]/feeding-logs] Error fetching logs:', {
      requestId,
      error
    });
    
    // Check for Prisma connection errors
    if ((error as any)?.code?.startsWith('P1')) {
      return v2Err("Database connection error", 503);
    }
    
    return v2Err('Erro ao buscar logs de alimentação', 500);
  }
});

