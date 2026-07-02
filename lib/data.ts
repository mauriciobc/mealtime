import prisma from "./prisma";
import { logger } from '@/lib/monitoring/logger';
import { v2Get } from '@/lib/api/v2-client';

export { getNextFeedingTime } from './services/api-feeding-service';

export async function getCats(householdId?: number | string) {
  try {
    const path = householdId
      ? `/api/v2/households/${householdId}/cats`
      : '/api/v2/cats';
    return await v2Get(path);
  } catch (_error) {
    logger.error("Erro ao buscar gatos", { error: _error, context: 'getCats' });
    throw _error;
  }
}

export async function getCatById(id: string) {
  try {
    if (!id) return null;

    const cat = await prisma.cats.findUnique({
      where: { id },
      include: {
        household: {
          select: {
            id: true,
            name: true
          }
        },
        feeding_logs: {
          take: 10,
          orderBy: {
            fed_at: 'desc'
          },
          include: {
            feeder: {
              select: {
                id: true,
                full_name: true
              }
            }
          }
        },
        schedules: {
          orderBy: {
            created_at: 'desc'
          }
        }
      }
    });
    
    return cat;
  } catch (_error) {
    logger.error("Erro ao buscar gato por ID", { error: _error, catId: id, context: 'getCatById' });
    return null;
  }
}

export async function getFeedingLogs(catId?: number | string, limit = 20, householdId?: string) {
  try {
    let hhId = householdId;
    if (!hhId && catId) {
      const cat = await v2Get<{ household_id?: string }>(`/api/v2/cats/${catId}`);
      hhId = cat.household_id;
    }
    if (!hhId) {
      throw new Error('householdId é obrigatório para buscar registros de alimentação');
    }

    const params = new URLSearchParams({ limit: String(limit) });
    if (catId) params.set('catId', String(catId));

    return await v2Get(`/api/v2/households/${hhId}/feeding-logs?${params.toString()}`);
  } catch (_error) {
    logger.error("Erro ao buscar registros de alimentação", { error: _error, context: 'getFeedingLogs' });
    throw _error;
  }
}

export async function getSchedules(catId?: number | string, householdId?: string) {
  try {
    if (!householdId) {
      throw new Error('householdId é obrigatório para buscar agendamentos');
    }

    const schedules = await v2Get<any[]>(`/api/v2/schedules?householdId=${householdId}`);
    if (!catId) return schedules;

    const catIdStr = String(catId);
    return schedules.filter(
      (s) => String(s.cat_id ?? s.catId) === catIdStr
    );
  } catch (_error) {
    logger.error("Erro ao buscar agendamentos", { error: _error, context: 'getSchedules' });
    throw _error;
  }
}
