#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { generateTestData } from './generate-test-data';
import { validateDestructiveOperation, DatabaseSafetyGuard } from './database-safety';

const prisma = new PrismaClient();

async function resetTestDatabase() {
  console.log('🔄 Iniciando reset do banco de dados de teste...');

  try {
    // Validar operação destrutiva com sistema de segurança
    const validation = await validateDestructiveOperation(
      prisma,
      'Reset completo do banco de dados de teste',
      {
        allowedEnvironments: ['test'],
        requireConfirmation: true,
        maxDeletionsPerRun: 10000,
        backupBeforeDeletion: true
      }
    );

    if (!validation.safe) {
      console.error(`❌ Operação bloqueada: ${validation.reason}`);
      process.exit(1);
    }

    const guard = validation.guard;
    console.log('✅ Validação de segurança aprovada');

    console.log('📊 Conectando ao banco de dados...');
    await prisma.$connect();

    // Fazer backup se necessário
    const backup = await guard.backupIfRequired();

    console.log('🗑️  Limpando dados existentes...');
    
    // Limpar dados em ordem para evitar problemas de foreign key
    await prisma.cat_weight_logs.deleteMany();
    console.log('   ✅ Logs de peso limpos');
    
    await prisma.feeding_logs.deleteMany();
    console.log('   ✅ Logs de alimentação limpos');
    
    await prisma.cats.deleteMany();
    console.log('   ✅ Gatos limpos');
    
    await prisma.households.deleteMany();
    console.log('   ✅ Households limpos');
    
    await prisma.profiles.deleteMany();
    console.log('   ✅ Perfis limpos');

    console.log('🌱 Aplicando migrações...');
    
    // Executar migrações
    const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
    if (existsSync(migrationsPath)) {
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      console.log('   ✅ Migrações aplicadas');
    }

    console.log('📝 Gerando dados de teste...');
    
    // Gerar dados de teste básicos
    await generateTestData();

    console.log('✅ Reset do banco de dados concluído com sucesso!');
    console.log('📊 Banco de dados limpo e pronto para testes');

  } catch (error) {
    console.error('❌ Erro durante reset do banco de dados:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function generateTestData() {
  try {
    // Criar household de teste
    const testHousehold = await prisma.households.create({
      data: {
        id: 'test-household-1',
        name: 'Casa de Teste',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Criar perfil de teste
    const testProfile = await prisma.profiles.create({
      data: {
        id: 'test-user-1',
        username: 'testuser',
        full_name: 'Usuário de Teste',
        email: 'test@example.com',
        avatar_url: null,
        timezone: 'America/Sao_Paulo',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Criar gatos de teste
    const testCats = await Promise.all([
      prisma.cats.create({
        data: {
          id: 'test-cat-1',
          name: 'Whiskers',
          birth_date: new Date('2020-01-01'),
          weight: 4.5,
          household_id: testHousehold.id,
          owner_id: testProfile.id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      }),
      prisma.cats.create({
        data: {
          id: 'test-cat-2',
          name: 'Fluffy',
          birth_date: new Date('2021-03-15'),
          weight: 3.2,
          household_id: testHousehold.id,
          owner_id: testProfile.id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      }),
    ]);

    // Criar logs de alimentação de teste
    await Promise.all([
      prisma.feeding_logs.create({
        data: {
          id: 'test-feeding-1',
          cat_id: testCats[0].id,
          food_type: 'Ração Premium',
          quantity: 100,
          unit: 'g',
          feeding_time: new Date(),
          notes: 'Alimentação de teste',
          fed_by: testProfile.id,
          created_at: new Date(),
        },
      }),
      prisma.feeding_logs.create({
        data: {
          id: 'test-feeding-2',
          cat_id: testCats[1].id,
          food_type: 'Ração Comum',
          quantity: 80,
          unit: 'g',
          feeding_time: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia atrás
          notes: 'Alimentação anterior',
          fed_by: testProfile.id,
          created_at: new Date(),
        },
      }),
    ]);

    // Criar logs de peso de teste
    await Promise.all([
      prisma.cat_weight_logs.create({
        data: {
          id: 'test-weight-1',
          cat_id: testCats[0].id,
          weight: 4.5,
          date: new Date(),
          notes: 'Peso atual',
          measured_by: testProfile.id,
          created_at: new Date(),
        },
      }),
      prisma.cat_weight_logs.create({
        data: {
          id: 'test-weight-2',
          cat_id: testCats[0].id,
          weight: 4.3,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 semana atrás
          notes: 'Peso anterior',
          measured_by: testProfile.id,
          created_at: new Date(),
        },
      }),
    ]);

    console.log('   ✅ Dados de teste gerados:');
    console.log(`      - 1 household: ${testHousehold.name}`);
    console.log(`      - 1 usuário: ${testProfile.username}`);
    console.log(`      - ${testCats.length} gatos`);
    console.log('      - 2 logs de alimentação');
    console.log('      - 2 logs de peso');

  } catch (error) {
    console.error('❌ Erro ao gerar dados de teste:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  resetTestDatabase()
    .then(() => {
      console.log('🎉 Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

export { resetTestDatabase, generateTestData }; 