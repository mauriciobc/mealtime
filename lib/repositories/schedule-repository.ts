import prisma from '../prisma';

export const ScheduleRepository = {
  // Buscar todos os agendamentos
  getAll: async () => {
    return prisma.schedule.findMany({
      include: {
        cat: true,
      },
    });
  },

  // Buscar agendamentos de um gato
  getByCat: async (catId: number) => {
    return prisma.schedule.findMany({
      where: { catId },
    });
  },

  // Buscar agendamentos de um domicílio
  getByHousehold: async (householdId: number) => {
    return prisma.schedule.findMany({
      where: {
        cat: {
          householdId,
        },
      },
      include: {
        cat: true,
      },
    });
  },

  // Buscar um agendamento pelo ID
  getById: async (id: number) => {
    return prisma.schedule.findUnique({
      where: { id },
      include: {
        cat: true,
      },
    });
  },

  // Criar um novo agendamento
  create: async (data: {
    catId: number;
    type: string;
    interval: number;
    times: string;
    overrideUntil?: Date;
  }) => {
    return prisma.schedule.create({
      data,
      include: {
        cat: true,
      },
    });
  },

  // Atualizar um agendamento
  update: async (
    id: number,
    data: {
      type?: string;
      interval?: number;
      times?: string;
      overrideUntil?: Date | null;
    }
  ) => {
    return prisma.schedule.update({
      where: { id },
      data,
      include: {
        cat: true,
      },
    });
  },

  // Excluir um agendamento
  delete: async (id: number) => {
    return prisma.schedule.delete({
      where: { id },
    });
  },

  // Criar uma substituição temporária
  createOverride: async (
    id: number,
    data: {
      type: string;
      interval: number;
      times: string;
      overrideUntil: Date;
    }
  ) => {
    return prisma.schedule.update({
      where: { id },
      data,
    });
  },

  // Remover uma substituição temporária
  removeOverride: async (id: number) => {
    return prisma.schedule.update({
      where: { id },
      data: {
        overrideUntil: null,
      },
    });
  },

  // Criar agendamentos em massa para um grupo
  createForGroup: async (
    groupId: number,
    data: {
      type: string;
      interval: number;
      times: string;
      overrideUntil?: Date;
    }
  ) => {
    // Buscar todos os gatos do grupo
    const group = await prisma.catGroup.findUnique({
      where: { id: groupId },
      include: {
        cats: true,
      },
    });

    if (!group) {
      throw new Error('Grupo não encontrado');
    }

    // Criar agendamentos para cada gato do grupo
    const schedules = await Promise.all(
      group.cats.map(async (cat) => {
        return prisma.schedule.create({
          data: {
            catId: cat.id,
            ...data,
          },
        });
      })
    );

    return schedules;
  },
}; 