import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // Limpar o banco de dados existente
  await prisma.feedingLog.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.cat.deleteMany();
  await prisma.user.deleteMany();
  await prisma.household.deleteMany();
  await prisma.catGroup.deleteMany();

  console.log('Banco de dados limpo. Criando dados iniciais...');

  // Criar domicílio
  const household = await prisma.household.create({
    data: {
      name: 'Casa Principal',
      inviteCode: uuidv4().substring(0, 8).toUpperCase(),
    },
  });

  console.log(`Domicílio criado: ${household.name} com código ${household.inviteCode}`);

  // Hash senha para usuários
  const hashedPassword = await bcrypt.hash('senha123', 10);

  // Criar usuários
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'Admin',
      householdId: household.id,
    },
  });

  const member = await prisma.user.create({
    data: {
      name: 'Membro',
      email: 'membro@example.com',
      password: hashedPassword,
      role: 'Member',
      householdId: household.id,
    },
  });

  console.log(`Usuários criados: ${admin.name}, ${member.name}`);

  // Criar gatos
  const cat1 = await prisma.cat.create({
    data: {
      name: 'Mingau',
      photoUrl: '/cats/cat1.jpg',
      birthdate: new Date('2020-05-15'),
      weight: 4.2,
      restrictions: 'Alérgico a ração com corantes',
      notes: 'Prefere comida úmida',
      householdId: household.id,
    },
  });

  const cat2 = await prisma.cat.create({
    data: {
      name: 'Frajola',
      photoUrl: '/cats/cat2.jpg',
      birthdate: new Date('2021-03-10'),
      weight: 3.8,
      notes: 'Toma medicamento para tireoide',
      householdId: household.id,
    },
  });

  console.log(`Gatos criados: ${cat1.name}, ${cat2.name}`);

  // Criar grupo de gatos
  const group = await prisma.catGroup.create({
    data: {
      name: 'Adultos',
      cats: {
        connect: [{ id: cat1.id }, { id: cat2.id }],
      },
    },
  });

  console.log(`Grupo criado: ${group.name} com ${group.id}`);

  // Criar agendamentos
  const schedule1 = await prisma.schedule.create({
    data: {
      catId: cat1.id,
      type: 'interval',
      interval: 6,
      times: '08:00,14:00,20:00',
    },
  });

  const schedule2 = await prisma.schedule.create({
    data: {
      catId: cat2.id,
      type: 'fixedTime',
      interval: 12,
      times: '08:00,20:00',
    },
  });

  console.log(`Agendamentos criados para: ${cat1.name}, ${cat2.name}`);

  // Criar registros de alimentação
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const feeding1 = await prisma.feedingLog.create({
    data: {
      catId: cat1.id,
      userId: admin.id,
      timestamp: yesterday,
      portionSize: 100,
      notes: 'Comeu tudo',
    },
  });

  const feeding2 = await prisma.feedingLog.create({
    data: {
      catId: cat1.id,
      userId: member.id,
      timestamp: now,
      portionSize: 100,
    },
  });

  const feeding3 = await prisma.feedingLog.create({
    data: {
      catId: cat2.id,
      userId: admin.id,
      timestamp: yesterday,
      portionSize: 80,
      notes: 'Deixou um pouco',
    },
  });

  console.log(`Registros de alimentação criados: ${feeding1.id}, ${feeding2.id}, ${feeding3.id}`);
  console.log('Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 