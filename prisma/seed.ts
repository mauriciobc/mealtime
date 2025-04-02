import { PrismaClient, Prisma } from '@prisma/client';
import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  // Clear existing records
  await prisma.feedingLog.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.cat.deleteMany();
  await prisma.user.deleteMany();
  await prisma.household.deleteMany();
  await prisma.catGroup.deleteMany();

  console.log('Creating admin user...');
  const hashedPassword = await hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('Creating household...');
  const household = await prisma.household.create({
    data: {
      name: 'Casa Principal',
      inviteCode: uuidv4().substring(0, 8).toUpperCase(),
      ownerId: adminUser.id,
      users: {
        connect: {
          id: adminUser.id
        }
      }
    } as Prisma.HouseholdUncheckedCreateInput,
  });

  console.log('Updating admin user with householdId...');
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { householdId: household.id },
  });

  console.log('Creating member user...');
  const memberUser = await prisma.user.create({
    data: {
      name: 'Member',
      email: 'member@example.com',
      password: await hash('member123', 10),
      role: 'user',
      householdId: household.id,
    },
  });

  console.log('Creating cats...');
  await prisma.cat.create({
    data: {
      name: 'Milo',
      householdId: household.id,
      userId: adminUser.id,
      feedingInterval: 8,
      portion_size: 100,
    },
  });

  await prisma.cat.create({
    data: {
      name: 'Luna',
      householdId: household.id,
      userId: memberUser.id,
      feedingInterval: 12,
      portion_size: 150,
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 