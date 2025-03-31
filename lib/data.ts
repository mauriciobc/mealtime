import prisma from "./prisma";

// Re-export from apiService
export { getNextFeedingTime } from './services/api-feeding-service';

// Buscar gatos
export async function getCats(householdId?: number) {
  try {
    const response = await fetch('/api/cats');
    if (!response.ok) {
      throw new Error('Falha ao buscar gatos');
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar gatos:", error);
    return [];
  }
}

// Buscar um gato pelo ID
export async function getCatById(id: number) {
  try {
    if (!id) return null;

    const cat = await prisma.cat.findUnique({
      where: { id },
      include: {
        household: {
          select: {
            id: true,
            name: true
          }
        },
        feedingLogs: {
          take: 10,
          orderBy: {
            timestamp: 'desc'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        schedules: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    return cat;
  } catch (error) {
    console.error("Erro ao buscar gato por ID:", error);
    return null;
  }
}

// Buscar registros de alimentação
export async function getFeedingLogs(catId?: number, limit = 20) {
  try {
    const where = catId 
      ? { catId } 
      : {};
    
    const feedingLogs = await prisma.feedingLog.findMany({
      where,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
    return feedingLogs;
  } catch (error) {
    console.error("Erro ao buscar registros de alimentação:", error);
    return [];
  }
}

// Buscar agendamentos
export async function getSchedules(catId?: number) {
  try {
    const response = await fetch(`/api/schedules${catId ? `?catId=${catId}` : ''}`);
    if (!response.ok) {
      throw new Error('Falha ao buscar agendamentos');
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    return [];
  }
}
