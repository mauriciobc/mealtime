import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Parâmetros de paginação (configuráveis)
const PAGE_SIZE = 10; // Número de itens por página
const MAX_PAGES = 5; // Número máximo de páginas a buscar

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
    
    // Buscar notificações com paginação
    console.log('Notificações existentes (paginadas):');
    console.log(`Página size: ${PAGE_SIZE}, Max páginas: ${MAX_PAGES}\n`);
    
    let page = 0;
    let hasMore = true;
    let totalFetched = 0;
    
    while (hasMore && page < MAX_PAGES) {
      const skip = page * PAGE_SIZE;
      
      const notifications = await prisma.notifications.findMany({
        take: PAGE_SIZE,
        skip: skip,
        select: { id: true, user_id: true, title: true, created_at: true },
        orderBy: { created_at: 'desc' } // Ordena por data para consistência
      });
      
      if (notifications.length === 0) {
        hasMore = false;
      } else {
        console.log(`--- Página ${page + 1} ---`);
        notifications.forEach(notif => {
          console.log(`- ID: ${notif.id}`);
          console.log(`  User ID: ${notif.user_id}`);
          console.log(`  Title: ${notif.title}`);
          console.log(`  Created: ${notif.created_at}`);
          console.log('');
        });
        
        totalFetched += notifications.length;
        hasMore = notifications.length === PAGE_SIZE; // Mais dados se retornou quantidade completa
        page++;
      }
    }
    
    console.log(`\nTotal de notificações retornadas: ${totalFetched}`);
    if (!hasMore) {
      console.log('Todas as notificações foram processadas.');
    } else if (page >= MAX_PAGES) {
      console.log(`Limite de ${MAX_PAGES} páginas atingido.`);
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
