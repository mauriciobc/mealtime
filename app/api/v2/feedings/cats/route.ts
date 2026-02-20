import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';
import { BaseCats } from "@/lib/types/common";

// Explicitly set runtime to Node.js
export const runtime = 'nodejs';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/v2/feedings/cats - Listar gatos para o formulário de alimentação
export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      logger.warn('[GET /api/v2/feedings/cats] Missing householdId parameter');
      return NextResponse.json({
        success: false,
        error: 'householdId é obrigatório'
      }, { status: 400 });
    }

    // Verify user access to the household
    logger.debug(`[GET /api/v2/feedings/cats] Verifying user ${user.id} access to household ${householdId}`);
    const userAccess = await prisma.household_members.findFirst({
      where: {
        household_id: householdId,
        user_id: user.id
      },
      select: { user_id: true }
    });

    if (!userAccess) {
      logger.warn(`[GET /api/v2/feedings/cats] User ${user.id} not authorized for household ${householdId}`);
      return NextResponse.json({
        success: false,
        error: 'Access denied to this household'
      }, { status: 403 });
    }

    // Consulta para obter gatos com informações necessárias para alimentação
    logger.debug(`[GET /api/v2/feedings/cats] Fetching cats for household ${householdId}`);
    const cats = await prisma.cats.findMany({
      where: {
        household_id: householdId
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Converter para o formato BaseCats
    const formattedCats: BaseCats[] = cats.map(cat => ({
      id: cat.id,
      created_at: cat.created_at,
      updated_at: cat.updated_at,
      name: cat.name,
      birth_date: cat.birth_date,
      weight: cat.weight ? parseFloat(cat.weight.toString()) : null,
      household_id: cat.household_id,
      owner_id: cat.owner_id,
      gender: cat.gender ?? null
    }));

    logger.info(`[GET /api/v2/feedings/cats] Found ${formattedCats.length} cats for household ${householdId}`);
    
    return NextResponse.json({
      success: true,
      data: formattedCats,
      count: formattedCats.length
    });
  } catch (error) {
    logger.error('[GET /api/v2/feedings/cats] Error fetching cats', { error });
    return NextResponse.json({
      success: false,
      error: 'Ocorreu um erro ao buscar os gatos',
      ...(process.env.NODE_ENV !== 'production' && {
        details: (error instanceof Error) ? error.message : 'Unknown error'
      })
    }, { status: 500 });
  }
});

