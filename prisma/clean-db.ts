// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean() {
  console.log('🧹 Starting database cleanup...');

  try {
    // Delete in order to respect foreign key constraints
    console.log('📝 Removing feeding logs...');
    await prisma.feedingLog.deleteMany();
    
    console.log('🔔 Removing notifications...');
    await prisma.notification.deleteMany();
    
    console.log('📅 Removing schedules...');
    await prisma.schedule.deleteMany();
    
    console.log('👥 Removing cat group associations...');
    // This will remove the associations in the many-to-many relationship table
    const cats = await prisma.cat.findMany();
    for (const cat of cats) {
      await prisma.cat.update({
        where: { id: cat.id },
        data: { groups: { set: [] } }
      });
    }
    
    console.log('🐱 Removing cats...');
    await prisma.cat.deleteMany();
    
    console.log('👥 Removing cat groups...');
    await prisma.catGroup.deleteMany();
    
    // First remove user associations with households (except ownership)
    console.log('🏠 Removing user-household associations...');
    await prisma.user.updateMany({
      where: { householdId: { not: null } },
      data: { householdId: null }
    });

    // Now remove households first since they depend on users as owners
    console.log('🏠 Removing households...');
    await prisma.household.deleteMany();
    
    console.log('👤 Removing users...');
    await prisma.user.deleteMany();

    console.log('✅ Database cleaned successfully!');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clean()
  .catch((error) => {
    console.error('Failed to clean database:', error);
    process.exit(1);
  }); 