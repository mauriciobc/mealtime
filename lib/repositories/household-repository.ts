import prisma from '../prisma';
import { v4 as uuidv4 } from 'uuid';

export const HouseholdRepository = {
  // Buscar todos os domicílios
  getAll: async () => {
    return prisma.household.findMany();
  },

  // Buscar um domicílio pelo ID
  getById: async (id: number) => {
    return prisma.household.findUnique({
      where: { id },
      include: {
        users: true,
        cats: true,
      },
    });
  },

  // Buscar um domicílio pelo código de convite
  getByInviteCode: async (inviteCode: string) => {
    return prisma.household.findUnique({
      where: { inviteCode },
      include: {
        users: true,
        cats: true,
      },
    });
  },

  // Criar um novo domicílio
  create: async (name: string) => {
    const inviteCode = uuidv4().substring(0, 8).toUpperCase();
    return prisma.household.create({
      data: {
        name,
        inviteCode,
      },
    });
  },

  // Atualizar um domicílio
  update: async (id: number, data: { name?: string }) => {
    return prisma.household.update({
      where: { id },
      data,
    });
  },

  // Gerar um novo código de convite
  refreshInviteCode: async (id: number) => {
    const inviteCode = uuidv4().substring(0, 8).toUpperCase();
    return prisma.household.update({
      where: { id },
      data: { inviteCode },
    });
  },

  // Adicionar um usuário ao domicílio
  addUser: async (householdId: number, userId: number, role: string) => {
    return prisma.user.update({
      where: { id: userId },
      data: {
        householdId,
        role,
      },
    });
  },

  // Remover um usuário do domicílio
  removeUser: async (userId: number) => {
    return prisma.user.update({
      where: { id: userId },
      data: {
        householdId: null,
      },
    });
  },

  // Atualizar o papel de um usuário no domicílio
  updateUserRole: async (userId: number, role: string) => {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  },
}; 