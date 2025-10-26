import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.profiles.findMany({
      select: { id: true, username: true, email: true }
    });
    
    console.log('Usuários encontrados:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}`);
      console.log(`  Username: ${user.username || 'N/A'}`);
      console.log(`  Email: ${user.email || 'N/A'}`);
      console.log('');
    });
    
    // Buscar notificações existentes
    const notifications = await prisma.notifications.findMany({
      select: { id: true, user_id: true, title: true, created_at: true }
    });
    
    console.log('Notificações existentes:');
    notifications.forEach(notif => {
      console.log(`- ID: ${notif.id}`);
      console.log(`  User ID: ${notif.user_id}`);
      console.log(`  Title: ${notif.title}`);
      console.log(`  Created: ${notif.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
