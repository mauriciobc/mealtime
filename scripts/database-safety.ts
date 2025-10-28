#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';

// Função utilitária para parsing seguro de números inteiros positivos
function parsePositiveInteger(value: string | undefined, defaultValue: number, minValue: number = 1): number {
  if (!value) {
    return defaultValue;
  }

  // Parse com radix 10 explícito
  const parsed = parseInt(value, 10);
  
  // Validar se é um número válido, finito e inteiro positivo
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < minValue) {
    console.warn(`⚠️  Valor inválido para TEST_MAX_DELETIONS: "${value}". Usando valor padrão: ${defaultValue}`);
    return defaultValue;
  }

  return parsed;
}

// Configurações de segurança para banco de dados
export interface DatabaseSafetyConfig {
  allowedEnvironments: string[];
  productionProtection: boolean;
  requireConfirmation: boolean;
  maxDeletionsPerRun: number;
  backupBeforeDeletion: boolean;
}

export const DEFAULT_SAFETY_CONFIG: DatabaseSafetyConfig = {
  allowedEnvironments: ['test', 'development'],
  productionProtection: true,
  requireConfirmation: process.env.TEST_SAFETY_CONFIRMATION !== 'false',
  maxDeletionsPerRun: parsePositiveInteger(process.env.TEST_MAX_DELETIONS, 1000, 1),
  backupBeforeDeletion: process.env.TEST_SAFETY_BACKUP !== 'false',
};

// Classe para validação de segurança do banco
export class DatabaseSafetyGuard {
  private config: DatabaseSafetyConfig;
  private prisma: PrismaClient;
  private deletionCount: number = 0;

  constructor(prisma: PrismaClient, config: Partial<DatabaseSafetyConfig> = {}) {
    this.prisma = prisma;
    this.config = { ...DEFAULT_SAFETY_CONFIG, ...config };
  }

  // Verificar se o ambiente é seguro para operações destrutivas
  async validateEnvironment(): Promise<{ safe: boolean; reason?: string }> {
    const currentEnv = process.env.NODE_ENV || 'development';
    const databaseUrl = process.env.DATABASE_URL || '';

    // Verificar ambiente
    if (!this.config.allowedEnvironments.includes(currentEnv)) {
      return {
        safe: false,
        reason: `Ambiente '${currentEnv}' não é permitido para operações destrutivas. Ambientes permitidos: ${this.config.allowedEnvironments.join(', ')}`
      };
    }

    // Verificar se é banco de produção
    if (this.config.productionProtection) {
      const isProduction = await this.isProductionDatabase(databaseUrl);
      if (isProduction) {
        return {
          safe: false,
          reason: 'Operação bloqueada: Banco de dados de produção detectado'
        };
      }
    }

    // Verificar URL do banco
    if (this.containsProductionKeywords(databaseUrl)) {
      return {
        safe: false,
        reason: 'Operação bloqueada: URL do banco contém palavras-chave de produção'
      };
    }

    return { safe: true };
  }

  // Verificar se é banco de produção
  private async isProductionDatabase(databaseUrl: string): Promise<boolean> {
    // Verificar keywords na URL primeiro
    if (this.containsProductionKeywords(databaseUrl)) {
      return true;
    }

    // Verificar se o banco tem muitos dados (indicativo de produção)
    try {
      const userCount = await this.prisma.profiles.count();
      const catCount = await this.prisma.cats.count();
      
      // Se tem mais de 100 usuários ou 50 gatos, provavelmente é produção
      if (userCount > 100 || catCount > 50) {
        return true;
      }
    } catch (error) {
      // Se não conseguir contar, assumir que é produção por segurança
      return true;
    }

    return false;
  }

  // Verificar se URL contém palavras-chave de produção
  private containsProductionKeywords(databaseUrl: string): boolean {
    const productionKeywords = [
      'prod', 'production', 'live', 'main', 'master',
      'supabase.co', 'heroku.com', 'aws.amazon.com',
      'database.ondigitalocean.com', 'clever-cloud.com'
    ];

    const urlLower = databaseUrl.toLowerCase();
    return productionKeywords.some(keyword => urlLower.includes(keyword));
  }

  // Validar operação de deleção
  async validateDeletion(operation: string, count?: number): Promise<{ safe: boolean; reason?: string }> {
    // Verificar ambiente
    const envValidation = await this.validateEnvironment();
    if (!envValidation.safe) {
      return envValidation;
    }

    // Verificar limite de deleções
    const estimatedCount = count || 1;
    if (this.deletionCount + estimatedCount > this.config.maxDeletionsPerRun) {
      return {
        safe: false,
        reason: `Limite de deleções excedido: ${this.deletionCount + estimatedCount}/${this.config.maxDeletionsPerRun}`
      };
    }

    // Verificar se precisa de confirmação
    if (this.config.requireConfirmation) {
      const confirmed = await this.requestConfirmation(operation, estimatedCount);
      if (!confirmed) {
        return {
          safe: false,
          reason: 'Operação cancelada pelo usuário'
        };
      }
    }

    this.deletionCount += estimatedCount;
    return { safe: true };
  }

  // Solicitar confirmação do usuário
  private async requestConfirmation(operation: string, count: number): Promise<boolean> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`\n⚠️  ATENÇÃO: Operação destrutiva detectada!`);
    console.log(`   Operação: ${operation}`);
    console.log(`   Registros afetados: ~${count}`);
    console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database URL: ${this.maskDatabaseUrl(process.env.DATABASE_URL || '')}`);
    
    return new Promise((resolve) => {
      rl.question('\n🤔 Confirma esta operação? (digite "SIM" para confirmar): ', (answer: string) => {
        rl.close();
        resolve(answer.toUpperCase() === 'SIM');
      });
    });
  }

  // Mascarar URL do banco para segurança
  private maskDatabaseUrl(url: string): string {
    if (!url) return 'não definida';
    
    try {
      const urlObj = new URL(url);
      
      // Mascarar username - usar '***' ou versão truncada mascarada
      const maskedUsername = urlObj.username ? '***' : '';
      
      // Mascarar hostname - manter apenas TLD ou usar máscara genérica
      const hostnameParts = urlObj.hostname.split('.');
      const maskedHostname = hostnameParts.length > 1 
        ? `***.${hostnameParts[hostnameParts.length - 1]}` 
        : '***';
      
      // Mascarar senha apenas se não estiver vazia
      const maskedPassword = urlObj.password ? '*'.repeat(urlObj.password.length) : '';
      
      // Reconstruir URL com componentes mascarados
      const maskedUrl = new URL(urlObj.href);
      maskedUrl.username = maskedUsername;
      maskedUrl.password = maskedPassword;
      maskedUrl.hostname = maskedHostname;
      
      return maskedUrl.toString();
    } catch {
      return 'URL inválida';
    }
  }

  // Fazer backup antes de deleção
  async backupIfRequired(): Promise<Record<string, any[]> | null> {
    if (!this.config.backupBeforeDeletion) {
      return null;
    }

    try {
      console.log('💾 Fazendo backup antes da operação...');
      
      const backup: Record<string, any[]> = {};
      backup.profiles = await this.prisma.profiles.findMany();
      backup.households = await this.prisma.households.findMany();
      backup.cats = await this.prisma.cats.findMany();
      backup.feeding_logs = await this.prisma.feeding_logs.findMany();
      backup.cat_weight_logs = await this.prisma.cat_weight_logs.findMany();
      
      console.log(`   ✅ Backup criado: ${Object.values(backup).reduce((sum, arr) => sum + arr.length, 0)} registros`);
      return backup;
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error);
      return null;
    }
  }

  // Restaurar backup
  async restoreBackup(backup: Record<string, any[]>): Promise<void> {
    if (!backup) return;

    try {
      console.log('🔄 Restaurando backup...');
      
      // Usar transação Prisma para garantir atomicidade e rollback automático
      await this.prisma.$transaction(async (tx) => {
        // Limpar dados atuais em ordem child-first para respeitar foreign keys
        await tx.cat_weight_logs.deleteMany();
        await tx.feeding_logs.deleteMany();
        await tx.cats.deleteMany();
        await tx.households.deleteMany();
        await tx.profiles.deleteMany();
        
        // Restaurar dados em ordem parent-first para respeitar foreign keys
        if (backup.households && backup.households.length > 0) {
          await tx.households.createMany({ data: backup.households });
        }
        if (backup.profiles && backup.profiles.length > 0) {
          await tx.profiles.createMany({ data: backup.profiles });
        }
        if (backup.cats && backup.cats.length > 0) {
          await tx.cats.createMany({ data: backup.cats });
        }
        if (backup.feeding_logs && backup.feeding_logs.length > 0) {
          await tx.feeding_logs.createMany({ data: backup.feeding_logs });
        }
        if (backup.cat_weight_logs && backup.cat_weight_logs.length > 0) {
          await tx.cat_weight_logs.createMany({ data: backup.cat_weight_logs });
        }
      });
      
      console.log('✅ Backup restaurado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      // A transação já fez rollback automaticamente, apenas rethrow o erro
      throw new Error(String(error));
    }
  }

  // Obter estatísticas de segurança
  getSafetyStats(): { deletionCount: number; maxDeletions: number; environment: string } {
    return {
      deletionCount: this.deletionCount,
      maxDeletions: this.config.maxDeletionsPerRun,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  // Resetar contador de deleções
  resetDeletionCount(): void {
    this.deletionCount = 0;
  }
}

// Função utilitária para criar guarda de segurança
export function createDatabaseSafetyGuard(
  prisma: PrismaClient, 
  config: Partial<DatabaseSafetyConfig> = {}
): DatabaseSafetyGuard {
  return new DatabaseSafetyGuard(prisma, config);
}

// Função para validar ambiente antes de qualquer operação destrutiva
export async function validateDestructiveOperation(
  prisma: PrismaClient,
  operation: string,
  config: Partial<DatabaseSafetyConfig> = {}
): Promise<{ safe: boolean; guard: DatabaseSafetyGuard; reason?: string }> {
  const guard = createDatabaseSafetyGuard(prisma, config);
  
  // validateDeletion() já chama validateEnvironment() internamente, evitando validação duplicada
  const deletionValidation = await guard.validateDeletion(operation);
  return { safe: deletionValidation.safe, guard, reason: deletionValidation.reason };
}

// Exportar configurações padrão
export default {
  DatabaseSafetyGuard,
  createDatabaseSafetyGuard,
  validateDestructiveOperation,
  DEFAULT_SAFETY_CONFIG
}; 