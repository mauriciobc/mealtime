import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { withHybridAuth } from '@/lib/middleware/hybrid-auth';
import { MobileAuthUser } from '@/lib/middleware/mobile-auth';
import { getFeedingStatistics } from '@/lib/services/api/statistics-service';
import { v2Err, v2Ok } from '@/lib/responses/v2-json';

// GET /api/v2/statistics - Obter estatísticas de alimentação
export const GET = withHybridAuth(async (request: NextRequest, user: MobileAuthUser) => {
  logger.debug('[GET /api/v2/statistics] Authenticated user:', { userId: user.id });

  try {
    const userHouseholdIds = user.household_ids ?? [];
    if (userHouseholdIds.length === 0) {
      logger.warn(`[GET /api/v2/statistics] User ${user.id} has no households`);
      return v2Err("Usuário não associado a nenhum domicílio", 403);
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7dias";
    const catIdParam = searchParams.get("catId");
    
    // Use the first household (or could accept householdId as param)
    // Safe to use ! because we already checked the array is not empty above
    const householdId = userHouseholdIds[0]!;

    // Fetch user's cats for validation
    const userCats = await prisma.cats.findMany({
      where: {
        household_id: { in: userHouseholdIds }
      },
      select: { id: true }
    });
    const validCatIds = ["todos", ...userCats.map(cat => cat.id)];

    // Validate period
    const validPeriods = ["7dias", "30dias", "3meses"];
    if (!validPeriods.includes(period)) {
      logger.warn(`[GET /api/v2/statistics] Invalid period: ${period}`);
      return v2Err('Período inválido. Use: 7dias, 30dias ou 3meses', 400);
    }

    // Validate catId
    const catId = catIdParam || "todos";
    if (!validCatIds.includes(catId)) {
      logger.warn(`[GET /api/v2/statistics] Invalid catId: ${catId}`, {
        userId: user.id,
        householdIds: userHouseholdIds,
        validCatIds: validCatIds
      });
      return v2Err('ID do gato inválido ou não autorizado', 400);
    }

    logger.debug("Parâmetros recebidos:", { period, catId, householdId });

    const stats = await getFeedingStatistics(
      period,
      catId,
      householdId
    );

    logger.debug("Estatísticas calculadas:", { 
      totalFeedings: stats.totalFeedings,
      averagePortionSize: stats.averagePortionSize
    });

    return v2Ok(stats);
  } catch (error: any) {
    logger.logError(error, {
      message: 'Erro ao buscar estatísticas',
      requestUrl: request.nextUrl.toString()
    });
    return v2Err("Erro ao buscar estatísticas", 500);
  }
});

