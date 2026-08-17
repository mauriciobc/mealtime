import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';
import { parseGender } from '@/lib/types/common';
import { requireCatAccess } from '@/lib/authz/household-access';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';

// Explicitly set runtime to Node.js
export const runtime = 'nodejs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/v2/feedings/last/[catId] - Buscar última alimentação de um gato
export const GET = withHybridAuth(async (
  request: NextRequest,
  user: MobileAuthUser,
  context?: { params: Promise<{ catId: string }> }
) => {
  // UUID pattern for validation
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Extract and validate catId
  let catId: string | null = null;
  
  if (context?.params) {
    const params = await context.params;
    catId = params.catId;
    
    // Validate UUID format
    if (!uuidPattern.test(catId)) {
      catId = null;
    }
  } else {
    // Fallback: extract from URL path
    const pathname = request.nextUrl.pathname.replace(/\/+$/, '');
    const segments = pathname.split('/').filter(s => s.length > 0);
    const lastSegment = segments[segments.length - 1];
    
    if (lastSegment && uuidPattern.test(lastSegment)) {
      catId = lastSegment;
    }
  }

  if (!catId) {
    logger.warn('[GET /api/v2/feedings/last/[catId]] Invalid or missing catId');
    return v2Err('ID do gato inválido', 400);
  }

  logger.debug(`[GET /api/v2/feedings/last/${catId}] Request from user ${user.id}`);

  try {
    const catAccess = await requireCatAccess(user.id, catId);
    if (!catAccess.ok) return catAccess.response;

    // Find the last feeding log for this cat
    logger.debug(`[GET /api/v2/feedings/last/${catId}] Fetching last feeding log`);
    const lastFeeding = await prisma.feeding_logs.findFirst({
      where: {
        cat_id: catId,
      },
      include: {
        feeder: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true
          }
        },
        cat: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            gender: true
          }
        }
      },
      orderBy: {
        fed_at: 'desc',
      },
    });

    if (!lastFeeding) {
      logger.info(`[GET /api/v2/feedings/last/${catId}] No feeding log found for this cat`);
      return v2Ok(null);
    }

    // Transform the data to match expected format
    const transformedLog = {
      id: lastFeeding.id,
      catId: lastFeeding.cat_id,
      userId: lastFeeding.fed_by,
      timestamp: lastFeeding.fed_at,
      portionSize: lastFeeding.amount,
      notes: lastFeeding.notes,
      mealType: lastFeeding.meal_type,
      unit: lastFeeding.unit,
      householdId: lastFeeding.household_id,
      cat: lastFeeding.cat ? {
        id: lastFeeding.cat.id,
        name: lastFeeding.cat.name,
        photoUrl: lastFeeding.cat.photo_url,
        gender: parseGender(lastFeeding.cat.gender)
      } : undefined,
      user: lastFeeding.feeder ? {
        id: lastFeeding.feeder.id,
        name: lastFeeding.feeder.full_name,
        avatar: lastFeeding.feeder.avatar_url
      } : undefined
    };

    logger.info(`[GET /api/v2/feedings/last/${catId}] Last feeding found: ${lastFeeding.id}`);

    return v2Ok(transformedLog);
  } catch (error) {
    logger.error(`[GET /api/v2/feedings/last/${catId}] Error fetching last feeding`, { error });
    return v2Err('Erro interno do servidor', 500);
  }
});

