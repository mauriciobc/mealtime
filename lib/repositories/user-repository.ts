import prisma from '../prisma';
import * as bcrypt from 'bcrypt';

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

  // Verificar credenciais de um usuário
  verifyCredentials: async (email: string, password: string) => {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
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
    password: string;
    role: string;
    householdId?: number;
    timezone?: string;
    language?: string;
  }) => {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  },

  // Atualizar um usuário
  update: async (
    id: number,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      householdId?: number | null;
      timezone?: string;
      language?: string;
    }
  ) => {
    // Se estiver atualizando a senha, hash ela
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    
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

  // Trocar senha do usuário
  changePassword: async (id: number, newPassword: string) => {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    return prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });
  },

  // Excluir um usuário
  delete: async (id: number) => {
    // Primeiro, atualiza os registros de alimentação para remover a referência ao usuário
    // Na prática, você pode querer preservar esses dados de outra forma
    await prisma.feedingLog.deleteMany({
      where: { userId: id },
    });

    // Depois exclui o usuário
    return prisma.user.delete({
      where: { id },
    });
  },
}; 