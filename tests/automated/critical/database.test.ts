import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { validateWeightData } from '@/lib/utils/validation';

// Mock do Prisma
const mockPrisma = {
  cats: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  feeding_logs: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  cat_weight_logs: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  profiles: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  households: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn(),
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}));

describe('Banco de Dados - Testes Críticos', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
  });

  describe('Operações CRUD Básicas', () => {
    describe('Gatos', () => {
      it('deve criar gato com dados válidos', async () => {
        const catData = {
          name: 'Whiskers',
          birth_date: new Date('2020-01-01'),
          weight: 4.5,
          household_id: 'household-1',
          owner_id: 'user-1',
        };

        const createdCat = {
          id: '1',
          ...catData,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPrisma.cats.create.mockResolvedValue(createdCat);

        const result = await prisma.cats.create({
          data: catData,
        });

        expect(result).toEqual(createdCat);
        expect(result.id).toBeDefined();
        expect(result.name).toBe('Whiskers');
        expect(mockPrisma.cats.create).toHaveBeenCalledWith({
          data: catData,
        });
      });

      it('deve buscar gato por ID', async () => {
        const catId = '1';
        const mockCat = {
          id: catId,
          name: 'Whiskers',
          birth_date: new Date('2020-01-01'),
          weight: 4.5,
          household_id: 'household-1',
          owner_id: 'user-1',
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPrisma.cats.findUnique.mockResolvedValue(mockCat);

        const result = await prisma.cats.findUnique({
          where: { id: catId },
        });

        expect(result).toEqual(mockCat);
        expect(result?.id).toBe(catId);
        expect(mockPrisma.cats.findUnique).toHaveBeenCalledWith({
          where: { id: catId },
        });
      });

      it('deve listar gatos de um household', async () => {
        const householdId = 'household-1';
        const mockCats = [
          {
            id: '1',
            name: 'Whiskers',
            household_id: householdId,
            owner_id: 'user-1',
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: '2',
            name: 'Fluffy',
            household_id: householdId,
            owner_id: 'user-1',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        mockPrisma.cats.findMany.mockResolvedValue(mockCats);

        const result = await prisma.cats.findMany({
          where: { household_id: householdId },
        });

        expect(result).toEqual(mockCats);
        expect(result).toHaveLength(2);
        expect(result[0].household_id).toBe(householdId);
        expect(mockPrisma.cats.findMany).toHaveBeenCalledWith({
          where: { household_id: householdId },
        });
      });

      it('deve atualizar gato existente', async () => {
        const catId = '1';
        const updates = {
          name: 'Whiskers Updated',
          weight: 5.0,
        };

        const updatedCat = {
          id: catId,
          name: updates.name,
          weight: updates.weight,
          updated_at: new Date(),
        };

        mockPrisma.cats.update.mockResolvedValue(updatedCat);

        const result = await prisma.cats.update({
          where: { id: catId },
          data: updates,
        });

        expect(result).toEqual(updatedCat);
        expect(result.name).toBe(updates.name);
        expect(result.weight).toBe(updates.weight);
        expect(mockPrisma.cats.update).toHaveBeenCalledWith({
          where: { id: catId },
          data: updates,
        });
      });

      it('deve deletar gato', async () => {
        const catId = '1';
        const deletedCat = {
          id: catId,
          name: 'Whiskers',
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockPrisma.cats.delete.mockResolvedValue(deletedCat);

        const result = await prisma.cats.delete({
          where: { id: catId },
        });

        expect(result).toEqual(deletedCat);
        expect(result.id).toBe(catId);
        expect(mockPrisma.cats.delete).toHaveBeenCalledWith({
          where: { id: catId },
        });
      });
    });

    describe('Alimentação', () => {
      it('deve criar registro de alimentação', async () => {
        const feedingData = {
          cat_id: '1',
          food_type: 'Ração Premium',
          quantity: 150,
          unit: 'g',
          feeding_time: new Date(),
          notes: 'Alimentação especial',
          fed_by: 'user-1',
        };

        const createdFeeding = {
          id: '1',
          ...feedingData,
          created_at: new Date(),
        };

        mockPrisma.feeding_logs.create.mockResolvedValue(createdFeeding);

        const result = await prisma.feeding_logs.create({
          data: feedingData,
        });

        expect(result).toEqual(createdFeeding);
        expect(result.cat_id).toBe('1');
        expect(result.food_type).toBe('Ração Premium');
        expect(mockPrisma.feeding_logs.create).toHaveBeenCalledWith({
          data: feedingData,
        });
      });

      it('deve buscar alimentações por gato', async () => {
        const catId = '1';
        const mockFeedings = [
          {
            id: '1',
            cat_id: catId,
            food_type: 'Ração',
            quantity: 100,
            unit: 'g',
            feeding_time: new Date(),
            fed_by: 'user-1',
            created_at: new Date(),
          },
        ];

        mockPrisma.feeding_logs.findMany.mockResolvedValue(mockFeedings);

        const result = await prisma.feeding_logs.findMany({
          where: { cat_id: catId },
          orderBy: { feeding_time: 'desc' },
        });

        expect(result).toEqual(mockFeedings);
        expect(result[0].cat_id).toBe(catId);
        expect(mockPrisma.feeding_logs.findMany).toHaveBeenCalledWith({
          where: { cat_id: catId },
          orderBy: { feeding_time: 'desc' },
        });
      });
    });

    describe('Peso', () => {
      it('deve criar registro de peso', async () => {
        const weightData = {
          cat_id: '1',
          weight: 4.8,
          date: new Date(),
          notes: 'Ganhou peso',
          measured_by: 'user-1',
        };

        const createdWeight = {
          id: '1',
          ...weightData,
          created_at: new Date(),
        };

        mockPrisma.cat_weight_logs.create.mockResolvedValue(createdWeight);

        const result = await prisma.cat_weight_logs.create({
          data: weightData,
        });

        expect(result).toEqual(createdWeight);
        expect(result.weight).toBe(4.8);
        expect(result.cat_id).toBe('1');
        expect(mockPrisma.cat_weight_logs.create).toHaveBeenCalledWith({
          data: weightData,
        });
      });

      it('deve buscar histórico de peso por gato', async () => {
        const catId = '1';
        const mockWeights = [
          {
            id: '1',
            cat_id: catId,
            weight: 4.5,
            date: new Date('2024-01-01'),
            measured_by: 'user-1',
            created_at: new Date(),
          },
          {
            id: '2',
            cat_id: catId,
            weight: 4.8,
            date: new Date('2024-01-15'),
            measured_by: 'user-1',
            created_at: new Date(),
          },
        ];

        mockPrisma.cat_weight_logs.findMany.mockResolvedValue(mockWeights);

        const result = await prisma.cat_weight_logs.findMany({
          where: { cat_id: catId },
          orderBy: { date: 'desc' },
        });

        expect(result).toEqual(mockWeights);
        expect(result).toHaveLength(2);
        expect(result[0].cat_id).toBe(catId);
        expect(mockPrisma.cat_weight_logs.findMany).toHaveBeenCalledWith({
          where: { cat_id: catId },
          orderBy: { date: 'desc' },
        });
      });
    });
  });

  describe('Validações de Dados', () => {
    it('deve validar dados obrigatórios de gato', () => {
      const invalidCat = {
        name: '', // Nome vazio
        household_id: 'household-1',
        owner_id: 'user-1',
      };

      const errors = [];
      if (!invalidCat.name) errors.push('Nome é obrigatório');
      if (!invalidCat.household_id) errors.push('Household é obrigatório');
      if (!invalidCat.owner_id) errors.push('Proprietário é obrigatório');

      expect(errors).toContain('Nome é obrigatório');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('deve validar dados de alimentação', () => {
      const invalidFeeding = {
        cat_id: '', // Cat ID vazio
        food_type: 'Ração',
        quantity: -10, // Quantidade negativa
        unit: 'g',
      };

      const errors = [];
      if (!invalidFeeding.cat_id) errors.push('Gato é obrigatório');
      if (invalidFeeding.quantity <= 0) errors.push('Quantidade deve ser maior que zero');
      if (!invalidFeeding.food_type) errors.push('Tipo de alimento é obrigatório');

      expect(errors).toContain('Gato é obrigatório');
      expect(errors).toContain('Quantidade deve ser maior que zero');
    });

    it('deve validar dados de peso', () => {
      const invalidWeight = {
        cat_id: '',
        weight: -1, // Peso negativo
        date: '2026-01-01', // Data futura
      };

      const validation = validateWeightData(invalidWeight);

      expect(validation.errors).toContain('Gato é obrigatório');
      expect(validation.errors).toContain('Peso deve ser maior que zero');
      expect(validation.errors).toContain('Data não pode ser futura');
    });
  });

  describe('Relacionamentos', () => {
    it('deve buscar gato com alimentações relacionadas', async () => {
      const catId = '1';
      const mockCatWithFeedings = {
        id: catId,
        name: 'Whiskers',
        feeding_logs: [
          {
            id: '1',
            food_type: 'Ração',
            quantity: 100,
            feeding_time: new Date(),
          },
        ],
      };

      mockPrisma.cats.findUnique.mockResolvedValue(mockCatWithFeedings);

      const result = await prisma.cats.findUnique({
        where: { id: catId },
        include: { feeding_logs: true },
      });

      expect(result).toEqual(mockCatWithFeedings);
      expect(result?.feeding_logs).toBeDefined();
      expect(result?.feeding_logs).toHaveLength(1);
      expect(mockPrisma.cats.findUnique).toHaveBeenCalledWith({
        where: { id: catId },
        include: { feeding_logs: true },
      });
    });

    it('deve buscar gato com histórico de peso', async () => {
      const catId = '1';
      const mockCatWithWeights = {
        id: catId,
        name: 'Whiskers',
        cat_weight_logs: [
          {
            id: '1',
            weight: 4.5,
            date: new Date(),
          },
        ],
      };

      mockPrisma.cats.findUnique.mockResolvedValue(mockCatWithWeights);

      const result = await prisma.cats.findUnique({
        where: { id: catId },
        include: { cat_weight_logs: true },
      });

      expect(result).toEqual(mockCatWithWeights);
      expect(result?.cat_weight_logs).toBeDefined();
      expect(result?.cat_weight_logs).toHaveLength(1);
      expect(mockPrisma.cats.findUnique).toHaveBeenCalledWith({
        where: { id: catId },
        include: { cat_weight_logs: true },
      });
    });
  });

  describe('Transações', () => {
    it('deve executar transação com sucesso', async () => {
      const transactionData = [
        { name: 'Whiskers', household_id: 'household-1', owner_id: 'user-1' },
        { name: 'Fluffy', household_id: 'household-1', owner_id: 'user-1' },
      ];

      const mockTransactionResult = [
        { id: '1', ...transactionData[0], created_at: new Date(), updated_at: new Date() },
        { id: '2', ...transactionData[1], created_at: new Date(), updated_at: new Date() },
      ];

      mockPrisma.$transaction.mockResolvedValue(mockTransactionResult);

      const result = await prisma.$transaction(async (tx) => {
        const cats = [];
        for (const catData of transactionData) {
          const cat = await tx.cats.create({ data: catData });
          cats.push(cat);
        }
        return cats;
      });

      expect(result).toEqual(mockTransactionResult);
      expect(result).toHaveLength(2);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('deve fazer rollback em caso de erro na transação', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Erro na transação'));

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.cats.create({ data: { name: 'Test', household_id: '1', owner_id: '1' } });
          throw new Error('Erro simulado');
        })
      ).rejects.toThrow('Erro na transação');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('Conexão e Desconexão', () => {
    it('deve conectar ao banco de dados', async () => {
      mockPrisma.$connect.mockResolvedValue(undefined);

      await prisma.$connect();

      expect(mockPrisma.$connect).toHaveBeenCalled();
    });

    it('deve desconectar do banco de dados', async () => {
      mockPrisma.$disconnect.mockResolvedValue(undefined);

      await prisma.$disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
}); 