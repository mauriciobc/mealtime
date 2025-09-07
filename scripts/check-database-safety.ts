#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { createDatabaseSafetyGuard, DatabaseSafetyGuard } from './database-safety';

const prisma = new PrismaClient();

async function checkDatabaseSafety() {
  console.log('🔒 Verificando segurança do banco de dados...\n');

  try {
    await prisma.$connect();
    
    const guard = createDatabaseSafetyGuard(prisma);
    
    // Verificar ambiente
    console.log('📋 VERIFICAÇÕES DE SEGURANÇA:');
    console.log('=' .repeat(50));
    
    // 1. Verificar ambiente
    const currentEnv = process.env.NODE_ENV || 'development';
    console.log(`🌍 Ambiente atual: ${currentEnv}`);
    
    // 2. Verificar URL do banco
    const databaseUrl = process.env.DATABASE_URL || '';
    console.log(`🗄️  URL do banco: ${maskDatabaseUrl(databaseUrl)}`);
    
    // 3. Verificar se é banco de produção
    const envValidation = await guard.validateEnvironment();
    console.log(`✅ Ambiente seguro: ${envValidation.safe ? 'SIM' : 'NÃO'}`);
    
    if (!envValidation.safe) {
      console.log(`❌ Motivo: ${envValidation.reason}`);
    }
    
    // 4. Verificar dados no banco
    console.log('\n📊 DADOS NO BANCO:');
    console.log('=' .repeat(30));
    
    try {
      const userCount = await prisma.profiles.count();
      const catCount = await prisma.cats.count();
      const householdCount = await prisma.households.count();
      const feedingCount = await prisma.feeding_logs.count();
      const weightCount = await prisma.cat_weight_logs.count();
      
      console.log(`👥 Usuários: ${userCount}`);
      console.log(`🐱 Gatos: ${catCount}`);
      console.log(`🏠 Households: ${householdCount}`);
      console.log(`🍽️  Alimentações: ${feedingCount}`);
      console.log(`⚖️  Pesos: ${weightCount}`);
      
      // Verificar se parece ser banco de produção
      const isLikelyProduction = userCount > 100 || catCount > 50;
      console.log(`🚨 Parece produção: ${isLikelyProduction ? 'SIM' : 'NÃO'}`);
      
    } catch (error) {
      console.log('❌ Erro ao contar dados:', error);
    }
    
    // 5. Verificar configurações de segurança
    console.log('\n⚙️  CONFIGURAÇÕES DE SEGURANÇA:');
    console.log('=' .repeat(40));
    
    const stats = guard.getSafetyStats();
    console.log(`🔢 Deletions nesta sessão: ${stats.deletionCount}/${stats.maxDeletions}`);
    console.log(`🌍 Ambiente: ${stats.environment}`);
    console.log(`🔐 Confirmação obrigatória: ${process.env.TEST_SAFETY_CONFIRMATION !== 'false' ? 'SIM' : 'NÃO'}`);
    console.log(`💾 Backup automático: ${process.env.TEST_SAFETY_BACKUP !== 'false' ? 'SIM' : 'NÃO'}`);
    
    // 6. Recomendações
    console.log('\n💡 RECOMENDAÇÕES:');
    console.log('=' .repeat(20));
    
    if (envValidation.safe) {
      console.log('✅ Banco de dados está seguro para operações de teste');
      console.log('✅ Sistema de proteção está ativo');
      console.log('✅ Operações destrutivas serão validadas');
    } else {
      console.log('❌ ATENÇÃO: Banco de dados NÃO está seguro!');
      console.log('❌ Operações destrutivas estão BLOQUEADAS');
      console.log('💡 Para testes, use um banco de dados separado');
      console.log('💡 Configure NODE_ENV=test');
      console.log('💡 Use DATABASE_URL diferente do banco de produção');
    }
    
    // 7. Verificar variáveis de ambiente críticas
    console.log('\n🔍 VARIÁVEIS DE AMBIENTE CRÍTICAS:');
    console.log('=' .repeat(40));
    
    const criticalVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'TEST_SAFETY_CONFIRMATION',
      'TEST_SAFETY_BACKUP',
      'TEST_MAX_DELETIONS'
    ];
    
    for (const varName of criticalVars) {
      const value = process.env[varName];
      const isSet = value !== undefined && value !== '';
      const maskedValue = varName.includes('URL') || varName.includes('KEY') ? maskSensitiveValue(value) : value;
      
      console.log(`${isSet ? '✅' : '❌'} ${varName}: ${isSet ? maskedValue : 'não definida'}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar segurança:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Função para mascarar URL do banco
function maskDatabaseUrl(url: string): string {
  if (!url) return 'não definida';
  
  try {
    const urlObj = new URL(url);
    const maskedPassword = '*'.repeat(urlObj.password?.length || 0);
    const maskedUrl = url.replace(urlObj.password || '', maskedPassword);
    
    // Mascarar também o host se for produção
    if (url.toLowerCase().includes('supabase.co') || 
        url.toLowerCase().includes('heroku.com') ||
        url.toLowerCase().includes('aws.amazon.com')) {
      return maskedUrl.replace(urlObj.hostname, '***PRODUCTION***');
    }
    
    return maskedUrl;
  } catch {
    return 'URL inválida';
  }
}

// Função para mascarar valores sensíveis
function maskSensitiveValue(value: string | undefined): string {
  if (!value) return 'não definida';
  
  if (value.length > 10) {
    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
  }
  
  return '***' + value.substring(value.length - 2);
}

// Executar verificação
if (require.main === module) {
  checkDatabaseSafety()
    .then(() => {
      console.log('\n🎉 Verificação de segurança concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

export { checkDatabaseSafety }; 