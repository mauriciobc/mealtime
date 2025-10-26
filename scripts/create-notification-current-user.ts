import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createNotificationForCurrentUser() {
  try {
    // ID do usuário que está logado no navegador
    const currentUserId = '2e94b809-cc45-4dfb-80e1-a67365d2e714';
    
    console.log(`🔍 Criando notificação para o usuário: ${currentUserId}`);
    
    // Criar notificação de teste
    const notification = await prisma.notifications.create({
      data: {
        user_id: currentUserId,
        title: '🎉 Notificação de Teste - Usuário Correto',
        message: 'Esta notificação foi criada especificamente para o usuário logado no navegador. O sistema de notificações está funcionando perfeitamente!',
        type: 'info',
        is_read: false,
        metadata: {
          source: 'test-script-browser',
          timestamp: new Date().toISOString(),
          testMode: true,
          targetUser: currentUserId
        }
      }
    });

    console.log('✅ Notificação criada com sucesso!');
    console.log('📋 Detalhes:');
    console.log(`   ID: ${notification.id}`);
    console.log(`   User ID: ${notification.user_id}`);
    console.log(`   Título: ${notification.title}`);
    console.log(`   Mensagem: ${notification.message}`);
    console.log(`   Tipo: ${notification.type}`);
    console.log(`   Criado em: ${notification.created_at}`);
    console.log('');
    console.log('🔔 Agora volte ao navegador e clique no ícone de notificações!');

  } catch (error) {
    console.error('❌ Erro ao criar notificação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createNotificationForCurrentUser();
