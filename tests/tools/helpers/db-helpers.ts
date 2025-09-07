import { PrismaClient } from '@prisma/client';
import { vi } from 'vitest';
import { validateDestructiveOperation } from '../../../scripts/database-safety';

// Interface para configuração de teste de banco
export interface DbTestConfig {
  cleanBeforeTest: boolean;
  cleanAfterTest: boolean;
  useTransactions: boolean;
  isolationLevel: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}

// Configuração padrão para testes
export const defaultDbConfig: DbTestConfig = {
  cleanBeforeTest: true,
  cleanAfterTest: true,
  useTransactions: true,
  isolationLevel: 'ReadCommitted'
};

// Classe helper para gerenciar banco de dados em testes
export class DbTestHelper {
  private prisma: PrismaClient;
  private config: DbTestConfig;
  private transactionId?: string;

  constructor(prisma: PrismaClient, config: Partial<DbTestConfig> = {}) {
    this.prisma = prisma;
    this.config = { ...defaultDbConfig, ...config };
  }

  // Inicializar ambiente de teste
  async setup(): Promise<void> {
    if (this.config.cleanBeforeTest) {
      await this.cleanDatabase();
    }

    if (this.config.useTransactions) {
      await this.beginTransaction();
    }
  }

  // Limpar ambiente de teste
  async teardown(): Promise<void> {
    if (this.config.useTransactions && this.transactionId) {
      await this.rollbackTransaction();
    }

    if (this.config.cleanAfterTest) {
      await this.cleanDatabase();
    }
  }

  // Limpar todos os dados do banco
  async cleanDatabase(): Promise<void> {
    try {
      // Validar operação destrutiva
      const validation = await validateDestructiveOperation(
        this.prisma,
        'Limpeza de banco de dados para testes',
        {
          allowedEnvironments: ['test', 'development'],
          requireConfirmation: false, // Não pedir confirmação em testes automatizados
          maxDeletionsPerRun: 10000,
          backupBeforeDeletion: false // Não fazer backup em testes automatizados
        }
      );

      if (!validation.safe) {
        throw new Error(`Operação de limpeza bloqueada: ${validation.reason}`);
      }

      // Ordem específica para evitar problemas de foreign key
      await this.prisma.cat_weight_logs.deleteMany();
      await this.prisma.feeding_logs.deleteMany();
      await this.prisma.cats.deleteMany();
      await this.prisma.households.deleteMany();
      await this.prisma.profiles.deleteMany();
    } catch (error) {
      console.error('Erro ao limpar banco de dados:', error);
      throw error;
    }
  }

  // Iniciar transação
  async beginTransaction(): Promise<void> {
    if (!this.config.useTransactions) return;

    try {
      this.transactionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.prisma.$executeRaw`BEGIN TRANSACTION ISOLATION LEVEL ${this.config.isolationLevel}`;
    } catch (error) {
      console.error('Erro ao iniciar transação:', error);
      throw error;
    }
  }

  // Fazer commit da transação
  async commitTransaction(): Promise<void> {
    if (!this.transactionId) return;

    try {
      await this.prisma.$executeRaw`COMMIT`;
      this.transactionId = undefined;
    } catch (error) {
      console.error('Erro ao fazer commit da transação:', error);
      throw error;
    }
  }

  // Fazer rollback da transação
  async rollbackTransaction(): Promise<void> {
    if (!this.transactionId) return;

    try {
      await this.prisma.$executeRaw`ROLLBACK`;
      this.transactionId = undefined;
    } catch (error) {
      console.error('Erro ao fazer rollback da transação:', error);
      throw error;
    }
  }

  // Executar função dentro de transação
  async executeInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.useTransactions) {
      return await fn();
    }

    try {
      await this.beginTransaction();
      const result = await fn();
      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  // Verificar se tabela está vazia
  async isTableEmpty(tableName: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw`SELECT COUNT(*) as count FROM ${tableName}`;
    return (result as any)[0].count === 0;
  }

  // Contar registros em tabela
  async countRecords(tableName: string): Promise<number> {
    const result = await this.prisma.$queryRaw`SELECT COUNT(*) as count FROM ${tableName}`;
    return (result as any)[0].count;
  }

  // Verificar se registro existe
  async recordExists(tableName: string, conditions: Record<string, any>): Promise<boolean> {
    const whereClause = Object.entries(conditions)
      .map(([key, value]) => `${key} = '${value}'`)
      .join(' AND ');
    
    const result = await this.prisma.$queryRaw`SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`;
    return (result as any)[0].count > 0;
  }

  // Obter último ID inserido
  async getLastInsertId(): Promise<number> {
    const result = await this.prisma.$queryRaw`SELECT LAST_INSERT_ID() as id`;
    return (result as any)[0].id;
  }

  // Verificar integridade referencial
  async checkReferentialIntegrity(): Promise<boolean> {
    try {
      // Verificar se há registros órfãos
      const orphanedFeedings = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM feeding_logs fl 
        LEFT JOIN cats c ON fl.cat_id = c.id 
        WHERE c.id IS NULL
      `;
      
      const orphanedWeightLogs = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM cat_weight_logs cwl 
        LEFT JOIN cats c ON cwl.cat_id = c.id 
        WHERE c.id IS NULL
      `;

      const orphanedCats = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM cats cat 
        LEFT JOIN households h ON cat.household_id = h.id 
        WHERE h.id IS NULL
      `;

      return (orphanedFeedings as any)[0].count === 0 && 
             (orphanedWeightLogs as any)[0].count === 0 && 
             (orphanedCats as any)[0].count === 0;
    } catch (error) {
      console.error('Erro ao verificar integridade referencial:', error);
      return false;
    }
  }

  // Backup de dados
  async backupData(): Promise<Record<string, any[]>> {
    const backup: Record<string, any[]> = {};
    
    backup.profiles = await this.prisma.profiles.findMany();
    backup.households = await this.prisma.households.findMany();
    backup.cats = await this.prisma.cats.findMany();
    backup.feeding_logs = await this.prisma.feeding_logs.findMany();
    backup.cat_weight_logs = await this.prisma.cat_weight_logs.findMany();
    
    return backup;
  }

  // Restaurar dados
  async restoreData(backup: Record<string, any[]>): Promise<void> {
    await this.cleanDatabase();
    
    if (backup.households.length > 0) {
      await this.prisma.households.createMany({ data: backup.households });
    }
    
    if (backup.profiles.length > 0) {
      await this.prisma.profiles.createMany({ data: backup.profiles });
    }
    
    if (backup.cats.length > 0) {
      await this.prisma.cats.createMany({ data: backup.cats });
    }
    
    if (backup.feeding_logs.length > 0) {
      await this.prisma.feeding_logs.createMany({ data: backup.feeding_logs });
    }
    
    if (backup.cat_weight_logs.length > 0) {
      await this.prisma.cat_weight_logs.createMany({ data: backup.cat_weight_logs });
    }
  }

  // Verificar performance de consulta
  async measureQueryPerformance<T>(queryFn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await queryFn();
    const end = performance.now();
    
    return {
      result,
      duration: end - start
    };
  }

  // Verificar se índice existe
  async indexExists(tableName: string, indexName: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_name = ${tableName} AND index_name = ${indexName}
      `;
      return (result as any)[0].count > 0;
    } catch (error) {
      return false;
    }
  }

  // Obter estatísticas de tabela
  async getTableStats(tableName: string): Promise<{ rowCount: number; size: string }> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 
          TABLE_ROWS as rowCount,
          ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS size
        FROM information_schema.tables 
        WHERE table_name = ${tableName}
      `;
      
      const stats = (result as any)[0];
      return {
        rowCount: stats.rowCount || 0,
        size: `${stats.size || 0} MB`
      };
    } catch (error) {
      return { rowCount: 0, size: '0 MB' };
    }
  }
}

// Funções utilitárias para testes
export function createMockDbHelper(): DbTestHelper {
  const mockPrisma = {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    cat_weight_logs: { deleteMany: vi.fn() },
    feeding_logs: { deleteMany: vi.fn() },
    cats: { deleteMany: vi.fn() },
    households: { deleteMany: vi.fn() },
    profiles: { deleteMany: vi.fn() },
    $transaction: vi.fn()
  } as any;

  return new DbTestHelper(mockPrisma);
}

// Hook para Vitest
export function setupDbTest(config: Partial<DbTestConfig> = {}) {
  const dbHelper = new DbTestHelper(new PrismaClient(), config);
  
  return {
    beforeAll: async () => {
      await dbHelper.setup();
    },
    afterAll: async () => {
      await dbHelper.teardown();
    },
    beforeEach: async () => {
      if (config.cleanBeforeTest) {
        await dbHelper.cleanDatabase();
      }
    },
    afterEach: async () => {
      if (config.cleanAfterTest) {
        await dbHelper.cleanDatabase();
      }
    },
    dbHelper
  };
}

// Exportar tudo como default
export default {
  DbTestHelper,
  createMockDbHelper,
  setupDbTest,
  defaultDbConfig
}; 