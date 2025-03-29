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
      include: {
        household: true,
      },
    });

    if (!user || !user.password) {
      return null;
    }

    // Tenta a verificação padrão
    let isPasswordValid = await bcrypt.compare(password, user.password);

    // Se falhar, tenta verificar se a senha foi hasheada duas vezes (para compatibilidade com contas antigas)
    if (!isPasswordValid) {
      const tempHash = await bcrypt.hash(password, 10);
      isPasswordValid = await bcrypt.compare(tempHash, user.password);
      
      // Se a senha for válida com o método antigo, atualize-a para o novo formato
      if (isPasswordValid) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: await bcrypt.hash(password, 10),
          },
        });
      }
    }

    if (!isPasswordValid) {
      return null;
    }

    // Retorna o usuário com o householdId
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      householdId: user.householdId,
      timezone: user.timezone,
      language: user.language,
    };
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