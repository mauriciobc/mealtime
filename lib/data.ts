import prisma from "./prisma";
import { logger } from '@/lib/monitoring/logger';

export { getNextFeedingTime } from './services/api-feeding-service';

export async function getCats(householdId?: number) {
  try {
    const response = await fetch('/api/cats');
    if (!response.ok) {
      let errorMsg = `Falha ao buscar gatos (${response.status} ${response.statusText})`;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } else {
          const textError = await response.text();
          logger.error("Server returned non-JSON error", { textError, context: 'getCats' });
        }
      } catch (parseOrReadError) {
        logger.error("Failed to parse error response body", { parseOrReadError, context: 'getCats' });
      }
      throw new Error(errorMsg);
    }

    const contentType = response.headers.get("content-type");
    if (!(contentType && contentType.includes("application/json"))) {
      const textResponse = await response.text();
      logger.error("Server returned non-JSON success response", { textResponse, context: 'getCats' });
      throw new Error("Resposta inesperada do servidor ao buscar gatos.");
    }

    try {
      return await response.json();
    } catch (parseError) {
      logger.error("Failed to parse JSON response", { parseError, context: 'getCats' });
      throw new Error("Falha ao processar a resposta do servidor ao buscar gatos.");
    }

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

export async function getFeedingLogs(catId?: number, limit = 20) {
  try {
    const queryParams = new URLSearchParams();
    if (catId) queryParams.append('catId', catId.toString());
    if (limit) queryParams.append('limit', limit.toString());
    
    const url = `/api/feedings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      let errorMsg = `Falha ao buscar registros de alimentação (${response.status} ${response.statusText})`;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } else {
          const textError = await response.text();
          logger.error("Server returned non-JSON error", { textError, context: 'getFeedingLogs' });
        }
      } catch (parseOrReadError) {
        logger.error("Failed to parse error response body", { parseOrReadError, context: 'getFeedingLogs' });
      }
      throw new Error(errorMsg);
    }
    
    const contentType = response.headers.get("content-type");
    if (!(contentType && contentType.includes("application/json"))) {
      const textResponse = await response.text();
      logger.error("Server returned non-JSON success response", { textResponse, context: 'getFeedingLogs' });
      throw new Error("Resposta inesperada do servidor ao buscar registros de alimentação.");
    }
    
    try {
      return await response.json();
    } catch (parseError) {
      logger.error("Failed to parse JSON response", { parseError, context: 'getFeedingLogs' });
      throw new Error("Falha ao processar a resposta do servidor ao buscar registros de alimentação.");
    }
  } catch (_error) {
    logger.error("Erro ao buscar registros de alimentação", { error: _error, context: 'getFeedingLogs' });
    throw _error;
  }
}

export async function getSchedules(catId?: number) {
  try {
    const response = await fetch(`/api/schedules${catId ? `?catId=${catId}` : ''}`);
    if (!response.ok) {
      let errorMsg = `Falha ao buscar agendamentos (${response.status} ${response.statusText})`;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } else {
          const textError = await response.text();
          logger.error("Server returned non-JSON error", { textError, context: 'getSchedules' });
        }
      } catch (parseOrReadError) {
        logger.error("Failed to parse error response body", { parseOrReadError, context: 'getSchedules' });
      }
      throw new Error(errorMsg);
    }

    const contentType = response.headers.get("content-type");
    if (!(contentType && contentType.includes("application/json"))) {
      const textResponse = await response.text();
      logger.error("Server returned non-JSON success response", { textResponse, context: 'getSchedules' });
      throw new Error("Resposta inesperada do servidor ao buscar agendamentos.");
    }

    try {
      return await response.json();
    } catch (parseError) {
      logger.error("Failed to parse JSON response", { parseError, context: 'getSchedules' });
      throw new Error("Falha ao processar a resposta do servidor ao buscar agendamentos.");
    }

  } catch (_error) {
    logger.error("Erro ao buscar agendamentos", { error: _error, context: 'getSchedules' });
    throw _error;
  }
}
