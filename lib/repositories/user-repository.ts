import prisma from '@/lib/prisma';
import type { PrismaClient, User } from '@prisma/client';

export const UserRepository = {
  // Buscar todos os usuários
  getAll: async () => {
    return prisma.user.findMany();
  },

  // Buscar um usuário pelo ID
  getById: async (id: number) => {
    return prisma.user.findUnique({
      where: { id },
      include: {
        household: true,
      },
    });
  },

  // Buscar um usuário pelo email
  getByEmail: async (email: string) => {
    return prisma.user.findUnique({
      where: { email },
      include: {
        household: true,
      },
    });
  },

  // Buscar um usuário pelo Supabase auth ID
  getByAuthId: async (authId: string) => {
    return prisma.user.findUnique({
      where: { authId },
      include: {
        household: true,
      },
    });
  },

  // Buscar usuários de um domicílio
  getByHousehold: async (householdId: number) => {
    return prisma.user.findMany({
      where: { householdId },
    });
  },

  // Criar um novo usuário
  create: async (data: {
    name: string;
    email: string;
    authId: string;
    role: string;
    householdId?: number;
    timezone?: string;
    language?: string;
  }) => {
    return prisma.user.create({
      data,
    });
  },

  // Atualizar um usuário
  update: async (
    id: number,
    data: {
      name?: string;
      email?: string;
      role?: string;
      householdId?: number | null;
      timezone?: string;
      language?: string;
    }
  ) => {
    return prisma.user.update({
      where: { id },
      data,
    });
  },

  // Atualizar preferências do usuário
  updatePreferences: async (
    id: number,
    data: {
      timezone?: string;
      language?: string;
    }
  ) => {
    return prisma.user.update({
      where: { id },
      data,
    });
  },

  // Excluir um usuário
  delete: async (id: number) => {
    await prisma.feedingLog.deleteMany({
      where: { userId: id },
    });
    return prisma.user.delete({
      where: { id },
    });
  },
}; 