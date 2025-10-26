import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ID do usuário que está logado no navegador
const currentUserId = '2e94b809-cc45-4dfb-80e1-a67365d2e714';

async function createNotificationForCurrentUser(options: {
  type?: 'feeding' | 'reminder' | 'household' | 'system' | 'info' | 'warning' | 'error';
  isRead?: boolean;
  title?: string;
  message?: string;
  metadata?: Record<string, any>;
} = {}) {
  const {
    type = 'info',
    isRead = false,
    title = '🎉 Notificação de Teste',
    message = 'Esta é uma notificação de teste criada para o usuário logado.',
    metadata = {}
  } = options;

  try {
    console.log(`🔍 Criando notificação para o usuário: ${currentUserId}`);
    console.log(`   Tipo: ${type}`);
    console.log(`   Lida: ${isRead ? 'Sim' : 'Não'}\n`);
    
    // Criar notificação de teste
    const notification = await prisma.notifications.create({
      data: {
        user_id: currentUserId,
        title,
        message,
        type,
        is_read: isRead,
        metadata: {
          source: 'test-script-browser',
          timestamp: new Date().toISOString(),
          testMode: true,
          targetUser: currentUserId,
          ...metadata
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
    console.log(`   Status: ${notification.is_read ? 'Lida' : 'Não lida'}`);
    console.log(`   Criado em: ${notification.created_at}`);
    console.log('');
    console.log('🔔 Agora volte ao navegador e clique no ícone de notificações!');

  } catch (error: any) {
    console.error('❌ Erro ao criar notificação:', error.message);
    throw error;
  }
}

async function main() {
  // Verificar argumentos da linha de comando
  const args = process.argv.slice(2);
  
  const command = args[0];
  
  switch (command) {
    case 'all':
      // Criar notificações de todos os tipos
      console.log('📝 Criando notificações de todos os tipos...\n');
      await createNotificationForCurrentUser({
        type: 'feeding',
        title: '🍽️ Nova Alimentação',
        message: 'Ziggy foi alimentado com 8g de ração.',
        metadata: { catId: 'test-cat-id', quantity: 8 }
      });
      
      await createNotificationForCurrentUser({
        type: 'reminder',
        title: '🔔 Lembrete de Alimentação',
        message: 'É hora de alimentar Ziggy!',
        metadata: { catId: 'test-cat-id' }
      });
      
      await createNotificationForCurrentUser({
        type: 'warning',
        title: '⚠️ Alimentação Atrasada',
        message: 'Ziggy não foi alimentado nas últimas 4 horas.',
        metadata: { catId: 'test-cat-id' }
      });
      
      await createNotificationForCurrentUser({
        type: 'info',
        title: 'ℹ️ Relatório Semanal',
        message: 'Ziggy foi alimentado 42 vezes esta semana.',
        metadata: { period: 'week' }
      });
      
      await createNotificationForCurrentUser({
        type: 'household',
        title: '🏠 Novo Membro Adicionado',
        message: 'Maria Silva foi adicionada ao seu domicílio.',
        metadata: { householdId: 'test-household-id' }
      });
      
      await createNotificationForCurrentUser({
        type: 'system',
        title: '🔧 Atualização do Sistema',
        message: 'Uma nova versão está disponível.',
        metadata: { version: '1.2.0' }
      });
      
      await createNotificationForCurrentUser({
        type: 'error',
        title: '❌ Erro ao Registrar',
        message: 'Não foi possível registrar a alimentação.',
        metadata: { errorCode: 'REGISTRATION_FAILED' }
      });
      
      console.log('\n✅ Todas as notificações criadas com sucesso!');
      break;
      
    case 'read':
      // Criar notificação já lida
      await createNotificationForCurrentUser({
        type: 'info',
        title: '📬 Notificação Lida de Teste',
        message: 'Esta notificação já está marcada como lida.',
        isRead: true
      });
      break;
      
    default:
      // Criar notificação padrão
      await createNotificationForCurrentUser({
        type: args[0] as any || 'info',
        title: args[1] || '🎉 Notificação de Teste',
        message: args[2] || 'Esta é uma notificação de teste.',
        isRead: args.includes('--read')
      });
  }
}

// Executar a função de forma assíncrona e tratar erros
(async () => {
  try {
    await main();
    process.exit(0); // Sucesso
  } catch (error: any) {
    console.error('❌ Erro fatal ao executar o script:', error.message || error);
    process.exit(1); // Falha
  } finally {
    await prisma.$disconnect();
  }
})();
