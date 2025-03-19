import prisma from '../prisma';

export const CatRepository = {
  // Buscar todos os gatos
  getAll: async () => {
    return prisma.cat.findMany({
      include: {
        household: true,
        schedules: true,
      },
    });
  },

  // Buscar todos os gatos de um domicílio
  getAllByHousehold: async (householdId: number) => {
    return prisma.cat.findMany({
      where: { householdId },
      include: {
        schedules: true,
        feedingLogs: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    });
  },

  // Buscar um gato pelo ID
  getById: async (id: number) => {
    return prisma.cat.findUnique({
      where: { id },
      include: {
        household: true,
        schedules: true,
        feedingLogs: {
          orderBy: { timestamp: 'desc' },
          take: 10,
          include: {
            user: true,
          },
        },
        groups: true,
      },
    });
  },

  // Criar um novo gato
  create: async (data: {
    name: string;
    photoUrl?: string;
    birthdate?: Date;
    weight?: number;
    restrictions?: string;
    notes?: string;
    householdId: number;
  }) => {
    return prisma.cat.create({
      data,
    });
  },

  // Atualizar um gato
  update: async (
    id: number,
    data: {
      name?: string;
      photoUrl?: string;
      birthdate?: Date;
      weight?: number;
      restrictions?: string;
      notes?: string;
    }
  ) => {
    return prisma.cat.update({
      where: { id },
      data,
    });
  },

  // Excluir um gato
  delete: async (id: number) => {
    // Primeiro exclui os registros relacionados
    await prisma.feedingLog.deleteMany({
      where: { catId: id },
    });
    
    await prisma.schedule.deleteMany({
      where: { catId: id },
    });
    
    // Depois exclui o gato
    return prisma.cat.delete({
      where: { id },
    });
  },

  // Adicionar um gato a um grupo
  addToGroup: async (catId: number, groupId: number) => {
    return prisma.catGroup.update({
      where: { id: groupId },
      data: {
        cats: {
          connect: { id: catId },
        },
      },
    });
  },

  // Remover um gato de um grupo
  removeFromGroup: async (catId: number, groupId: number) => {
    return prisma.catGroup.update({
      where: { id: groupId },
      data: {
        cats: {
          disconnect: { id: catId },
        },
      },
    });
  },
}; 