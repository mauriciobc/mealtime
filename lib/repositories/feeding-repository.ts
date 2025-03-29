import prisma from '../prisma';

export const FeedingRepository = {
  // Buscar todos os registros de alimentação
  getAll: async () => {
    return prisma.feedingLog.findMany({
      include: {
        cat: true,
        user: true,
      },
      orderBy: { timestamp: 'desc' as const },
    });
  },

  // Buscar registros de alimentação de um gato
  getByCat: async (catId: number, limit = 20, offset = 0) => {
    return prisma.feedingLog.findMany({
      where: { catId },
      include: {
        user: true,
      },
      orderBy: { timestamp: 'desc' as const },
      skip: offset,
      take: limit,
    });
  },

  // Buscar registros de alimentação de um domicílio
  getByHousehold: async (householdId: number, limit?: number, offset?: number) => {
    console.log("Buscando logs de alimentação para household:", householdId);
    
    const query = {
      where: {
        cat: {
          householdId,
        },
      },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            householdId: true
          }
        },
        user: true,
      },
      orderBy: { timestamp: 'desc' as const },
    };

    // Se limit e offset forem fornecidos, adiciona paginação
    if (typeof limit === 'number' && typeof offset === 'number') {
      const result = await prisma.feedingLog.findMany({
        ...query,
        skip: offset,
        take: limit,
      });
      console.log(`Encontrados ${result.length} logs com paginação`);
      return result;
    }

    // Caso contrário, retorna todos os registros
    const result = await prisma.feedingLog.findMany(query);
    console.log(`Encontrados ${result.length} logs sem paginação`);
    return result;
  },

  // Buscar registros de alimentação de um usuário
  getByUser: async (userId: number, limit = 20, offset = 0) => {
    return prisma.feedingLog.findMany({
      where: { userId },
      include: {
        cat: true,
      },
      orderBy: { timestamp: 'desc' as const },
      skip: offset,
      take: limit,
    });
  },

  // Criar um novo registro de alimentação
  create: async (data: {
    catId: number;
    userId: number;
    timestamp: Date;
    portionSize?: number;
    notes?: string;
  }) => {
    return prisma.feedingLog.create({
      data,
      include: {
        cat: true,
        user: true,
      },
    });
  },

  // Atualizar um registro de alimentação
  update: async (
    id: number,
    data: {
      timestamp?: Date;
      portionSize?: number;
      notes?: string;
    }
  ) => {
    return prisma.feedingLog.update({
      where: { id },
      data,
      include: {
        cat: true,
        user: true,
      },
    });
  },

  // Excluir um registro de alimentação
  delete: async (id: number) => {
    return prisma.feedingLog.delete({
      where: { id },
    });
  },

  // Buscar estatísticas de alimentação para um gato
  getStatsByCat: async (catId: number, days = 30) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await prisma.feedingLog.findMany({
      where: {
        catId,
        timestamp: {
          gte: startDate,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    return logs;
  },

  // Buscar a última alimentação de um gato
  getLastFeeding: async (catId: number) => {
    return prisma.feedingLog.findFirst({
      where: { catId },
      orderBy: { timestamp: 'desc' },
      include: {
        user: true,
      },
    });
  },
}; 