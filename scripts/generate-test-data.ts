#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/pt_BR';
import { validateDestructiveOperation } from './database-safety';

const prisma = new PrismaClient();

interface TestDataConfig {
  households: number;
  usersPerHousehold: number;
  catsPerHousehold: number;
  feedingsPerCat: number;
  weightLogsPerCat: number;
}

const defaultConfig: TestDataConfig = {
  households: 3,
  usersPerHousehold: 2,
  catsPerHousehold: 3,
  feedingsPerCat: 10,
  weightLogsPerCat: 5,
};

async function generateTestData(config: TestDataConfig = defaultConfig) {
  console.log('🎲 Iniciando geração de dados de teste...');
  console.log(`📊 Configuração: ${JSON.stringify(config, null, 2)}`);

  try {
    // Validar operação destrutiva
    const validation = await validateDestructiveOperation(
      prisma,
      'Geração de dados de teste (inclui limpeza)',
      {
        allowedEnvironments: ['test', 'development'],
        requireConfirmation: true,
        maxDeletionsPerRun: 10000,
        backupBeforeDeletion: true
      }
    );

    if (!validation.safe) {
      console.error(`❌ Operação bloqueada: ${validation.reason}`);
      throw new Error(validation.reason);
    }

    console.log('✅ Validação de segurança aprovada');
    await prisma.$connect();

    // Fazer backup se necessário
    const backup = await validation.guard.backupIfRequired();

    // Limpar dados existentes
    console.log('🗑️  Limpando dados existentes...');
    await clearExistingData();

    // Gerar dados
    const households = await generateHouseholds(config.households);
    const users = await generateUsers(households, config.usersPerHousehold);
    const cats = await generateCats(households, users, config.catsPerHousehold);
    await generateFeedings(cats, users, config.feedingsPerCat);
    await generateWeightLogs(cats, users, config.weightLogsPerCat);

    console.log('✅ Dados de teste gerados com sucesso!');
    await printSummary();

  } catch (error) {
    console.error('❌ Erro ao gerar dados de teste:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function clearExistingData() {
  await prisma.cat_weight_logs.deleteMany();
  await prisma.feeding_logs.deleteMany();
  await prisma.cats.deleteMany();
  await prisma.households.deleteMany();
  await prisma.profiles.deleteMany();
  console.log('   ✅ Dados limpos');
}

async function generateHouseholds(count: number) {
  console.log(`🏠 Gerando ${count} households...`);
  
  const households = [];
  for (let i = 0; i < count; i++) {
    const household = await prisma.households.create({
      data: {
        id: `test-household-${i + 1}`,
        name: faker.company.name(),
        created_at: faker.date.past(),
        updated_at: new Date(),
      },
    });
    households.push(household);
  }
  
  console.log(`   ✅ ${households.length} households criados`);
  return households;
}

async function generateUsers(households: any[], usersPerHousehold: number) {
  console.log(`👥 Gerando usuários (${usersPerHousehold} por household)...`);
  
  const users = [];
  for (const household of households) {
    for (let i = 0; i < usersPerHousehold; i++) {
      const user = await prisma.profiles.create({
        data: {
          id: `test-user-${household.id}-${i + 1}`,
          username: faker.internet.userName(),
          full_name: faker.person.fullName(),
          email: faker.internet.email(),
          avatar_url: faker.image.avatar(),
          timezone: faker.helpers.arrayElement([
            'America/Sao_Paulo',
            'America/New_York',
            'Europe/London',
            'Asia/Tokyo'
          ]),
          created_at: faker.date.past(),
          updated_at: new Date(),
        },
      });
      users.push(user);
    }
  }
  
  console.log(`   ✅ ${users.length} usuários criados`);
  return users;
}

async function generateCats(households: any[], users: any[], catsPerHousehold: number) {
  console.log(`🐱 Gerando gatos (${catsPerHousehold} por household)...`);
  
  const cats = [];
  const catNames = [
    'Whiskers', 'Fluffy', 'Shadow', 'Luna', 'Simba', 'Bella', 'Tiger', 'Mittens',
    'Oliver', 'Lucy', 'Leo', 'Chloe', 'Max', 'Sophie', 'Charlie', 'Daisy',
    'Jack', 'Lily', 'Milo', 'Zoe', 'Rocky', 'Nala', 'Buster', 'Mia'
  ];
  
  for (const household of households) {
    const householdUsers = users.filter(user => user.id.includes(household.id));
    
    for (let i = 0; i < catsPerHousehold; i++) {
      const owner = faker.helpers.arrayElement(householdUsers);
      const catName = faker.helpers.arrayElement(catNames);
      
      const cat = await prisma.cats.create({
        data: {
          id: `test-cat-${household.id}-${i + 1}`,
          name: catName,
          birth_date: faker.date.between({ 
            from: '2015-01-01', 
            to: '2023-12-31' 
          }),
          weight: faker.number.float({ 
            min: 2.0, 
            max: 8.0, 
            precision: 0.1 
          }),
          household_id: household.id,
          owner_id: owner.id,
          created_at: faker.date.past(),
          updated_at: new Date(),
        },
      });
      cats.push(cat);
    }
  }
  
  console.log(`   ✅ ${cats.length} gatos criados`);
  return cats;
}

async function generateFeedings(cats: any[], users: any[], feedingsPerCat: number) {
  console.log(`🍽️  Gerando logs de alimentação (${feedingsPerCat} por gato)...`);
  
  const foodTypes = [
    'Ração Premium', 'Ração Comum', 'Ração Úmida', 'Sachê', 'Petisco',
    'Ração Light', 'Ração Senior', 'Ração Kitten', 'Ração Especial'
  ];
  
  const units = ['g', 'ml', 'unidade'];
  
  let totalFeedings = 0;
  
  for (const cat of cats) {
    const catUsers = users.filter(user => user.id.includes(cat.household_id));
    
    for (let i = 0; i < feedingsPerCat; i++) {
      const fedBy = faker.helpers.arrayElement(catUsers);
      const feedingTime = faker.date.between({ 
        from: '2024-01-01', 
        to: new Date() 
      });
      
      await prisma.feeding_logs.create({
        data: {
          id: `test-feeding-${cat.id}-${i + 1}`,
          cat_id: cat.id,
          food_type: faker.helpers.arrayElement(foodTypes),
          quantity: faker.number.int({ min: 50, max: 200 }),
          unit: faker.helpers.arrayElement(units),
          feeding_time: feedingTime,
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }),
          fed_by: fedBy.id,
          created_at: feedingTime,
        },
      });
      totalFeedings++;
    }
  }
  
  console.log(`   ✅ ${totalFeedings} logs de alimentação criados`);
}

async function generateWeightLogs(cats: any[], users: any[], weightLogsPerCat: number) {
  console.log(`⚖️  Gerando logs de peso (${weightLogsPerCat} por gato)...`);
  
  let totalWeightLogs = 0;
  
  for (const cat of cats) {
    const catUsers = users.filter(user => user.id.includes(cat.household_id));
    const baseWeight = cat.weight;
    
    for (let i = 0; i < weightLogsPerCat; i++) {
      const measuredBy = faker.helpers.arrayElement(catUsers);
      const weightDate = faker.date.between({ 
        from: '2024-01-01', 
        to: new Date() 
      });
      
      // Variação de peso realista (±10% do peso base)
      const weightVariation = (faker.number.float({ min: -0.1, max: 0.1 }) * baseWeight);
      const weight = Math.max(1.0, baseWeight + weightVariation);
      
      await prisma.cat_weight_logs.create({
        data: {
          id: `test-weight-${cat.id}-${i + 1}`,
          cat_id: cat.id,
          weight: parseFloat(weight.toFixed(1)),
          date: weightDate,
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.5 }),
          measured_by: measuredBy.id,
          created_at: weightDate,
        },
      });
      totalWeightLogs++;
    }
  }
  
  console.log(`   ✅ ${totalWeightLogs} logs de peso criados`);
}

async function printSummary() {
  console.log('\n📊 RESUMO DOS DADOS GERADOS:');
  console.log('==============================');
  
  const householdCount = await prisma.households.count();
  const userCount = await prisma.profiles.count();
  const catCount = await prisma.cats.count();
  const feedingCount = await prisma.feeding_logs.count();
  const weightCount = await prisma.cat_weight_logs.count();
  
  console.log(`🏠 Households: ${householdCount}`);
  console.log(`👥 Usuários: ${userCount}`);
  console.log(`🐱 Gatos: ${catCount}`);
  console.log(`🍽️  Logs de Alimentação: ${feedingCount}`);
  console.log(`⚖️  Logs de Peso: ${weightCount}`);
  console.log(`📈 Total de registros: ${householdCount + userCount + catCount + feedingCount + weightCount}`);
  
  // Estatísticas por household
  const households = await prisma.households.findMany({
    include: {
      cats: {
        include: {
          feeding_logs: true,
          cat_weight_logs: true,
        },
      },
    },
  });
  
  console.log('\n📋 DETALHES POR HOUSEHOLD:');
  console.log('==========================');
  
  households.forEach((household, index) => {
    const totalFeedings = household.cats.reduce((sum, cat) => sum + cat.feeding_logs.length, 0);
    const totalWeights = household.cats.reduce((sum, cat) => sum + cat.cat_weight_logs.length, 0);
    
    console.log(`${index + 1}. ${household.name}:`);
    console.log(`   - Gatos: ${household.cats.length}`);
    console.log(`   - Alimentações: ${totalFeedings}`);
    console.log(`   - Pesos: ${totalWeights}`);
  });
}

// Função para gerar dados específicos para cenários de teste
async function generateScenarioData(scenario: string) {
  console.log(`🎭 Gerando dados para cenário: ${scenario}`);
  
  switch (scenario) {
    case 'minimal':
      await generateTestData({
        households: 1,
        usersPerHousehold: 1,
        catsPerHousehold: 1,
        feedingsPerCat: 2,
        weightLogsPerCat: 2,
      });
      break;
      
    case 'medium':
      await generateTestData({
        households: 2,
        usersPerHousehold: 2,
        catsPerHousehold: 2,
        feedingsPerCat: 5,
        weightLogsPerCat: 3,
      });
      break;
      
    case 'large':
      await generateTestData({
        households: 5,
        usersPerHousehold: 3,
        catsPerHousehold: 5,
        feedingsPerCat: 20,
        weightLogsPerCat: 10,
      });
      break;
      
    default:
      await generateTestData();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const scenario = process.argv[2] || 'default';
  
  generateScenarioData(scenario)
    .then(() => {
      console.log('🎉 Geração de dados concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

export { generateTestData, generateScenarioData }; 