import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { logger } from '@/lib/monitoring/logger';
import { BaseCats, parseGender } from "@/lib/types/common";
import { requireHouseholdMember } from '@/lib/authz/household-access';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';

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
      return v2Err('householdId é obrigatório', 400);
    }

    const access = await requireHouseholdMember(user.id, householdId);
    if (!access.ok) return access.response;

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
      gender: parseGender(cat.gender)
    }));

    logger.info(`[GET /api/v2/feedings/cats] Found ${formattedCats.length} cats for household ${householdId}`);
    
    return v2Ok(formattedCats);
  } catch (error) {
    logger.error('[GET /api/v2/feedings/cats] Error fetching cats', { error });
    return v2Err('Ocorreu um erro ao buscar os gatos', 500);
  }
});

