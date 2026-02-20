import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';

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
    return NextResponse.json({
      success: false,
      error: 'ID do gato inválido'
    }, { status: 400 });
  }

  logger.debug(`[GET /api/v2/feedings/last/${catId}] Request from user ${user.id}`);

  try {
    // Find the user's household via household_members
    const householdMember = await prisma.household_members.findFirst({
      where: { user_id: user.id },
      select: { household_id: true }
    });

    if (!householdMember?.household_id) {
      logger.warn(`[GET /api/v2/feedings/last/${catId}] User ${user.id} not associated with any household`);
      return NextResponse.json({
        success: false,
        error: 'Usuário não associado a uma residência'
      }, { status: 403 });
    }

    // Verify the cat belongs to the user's household
    const cat = await prisma.cats.findUnique({
      where: {
        id: catId,
        household_id: householdMember.household_id
      },
      select: { 
        id: true,
        name: true,
        household_id: true
      }
    });

    if (!cat) {
      logger.warn(`[GET /api/v2/feedings/last/${catId}] Cat not found or user ${user.id} not authorized`);
      return NextResponse.json({
        success: false,
        error: 'Gato não encontrado ou acesso não autorizado'
      }, { status: 404 });
    }

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
      return NextResponse.json({
        success: true,
        data: null,
        count: 0
      });
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
        gender: lastFeeding.cat.gender ?? null
      } : undefined,
      user: lastFeeding.feeder ? {
        id: lastFeeding.feeder.id,
        name: lastFeeding.feeder.full_name,
        avatar: lastFeeding.feeder.avatar_url
      } : undefined
    };

    logger.info(`[GET /api/v2/feedings/last/${catId}] Last feeding found: ${lastFeeding.id}`);

    return NextResponse.json({
      success: true,
      data: transformedLog,
      count: 1
    });
  } catch (error) {
    logger.error(`[GET /api/v2/feedings/last/${catId}] Error fetching last feeding`, { error });
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      ...(process.env.NODE_ENV !== 'production' && {
        details: (error instanceof Error) ? error.message : 'Unknown error'
      })
    }, { status: 500 });
  }
});

