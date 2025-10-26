import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ID do usuário que está logado no navegador
const currentUserId = '2e94b809-cc45-4dfb-80e1-a67365d2e714';

async function createAllNotificationTypes() {
  try {
    console.log('🔍 Criando notificações para todos os casos de uso...');
    console.log(`👤 User ID: ${currentUserId}\n`);

    const notifications = [
      // 1. FEEDING - Notificações de alimentação
      {
        user_id: currentUserId,
        title: '🍽️ Novo Registro de Alimentação',
        message: 'Ziggy foi alimentado com 8g de ração por Mauricio Castro.',
        type: 'feeding',
        is_read: false,
        metadata: {
          source: 'feeding-registration',
          catId: '0fc3ce4b-04ee-4ec0-878d-1ddd8a8f7245',
          catName: 'Ziggy',
          feederName: 'Mauricio Castro',
          quantity: 8,
          unit: 'g',
          timestamp: new Date().toISOString()
        }
      },
      {
        user_id: currentUserId,
        title: '⏰ Alimentação Atrasada',
        message: 'Ziggy não foi alimentado nos últimos 4 horas. Verifique se está tudo bem.',
        type: 'feeding',
        is_read: false,
        metadata: {
          source: 'feeding-check',
          catId: '0fc3ce4b-04ee-4ec0-878d-1ddd8a8f7245',
          catName: 'Ziggy',
          lastFeedingHours: 4.5,
          timestamp: new Date().toISOString()
        }
      },

      // 2. REMINDER - Lembretes de alimentação
      {
        user_id: currentUserId,
        title: '🔔 Lembrete: Hora da Alimentação',
        message: 'É hora de alimentar Ziggy! Última refeição foi há 3 horas.',
        type: 'reminder',
        is_read: false,
        metadata: {
          source: 'scheduled-reminder',
          catId: '0fc3ce4b-04ee-4ec0-878d-1ddd8a8f7245',
          catName: 'Ziggy',
          scheduledTime: new Date(Date.now() + 3600000).toISOString(),
          timestamp: new Date().toISOString()
        }
      },
      {
        user_id: currentUserId,
        title: '📅 Alimentação Programada em 15 minutos',
        message: 'Ziggy está marcado para alimentação em 15 minutos.',
        type: 'reminder',
        is_read: false,
        metadata: {
          source: 'upcoming-feeding',
          catId: '0fc3ce4b-04ee-4ec0-878d-1ddd8a8f7245',
          catName: 'Ziggy',
          dueIn: 15,
          unit: 'minutes',
          timestamp: new Date().toISOString()
        }
      },

      // 3. WARNING - Avisos
      {
        user_id: currentUserId,
        title: '⚠️ Possível Alimentação Duplicada',
        message: 'Ziggy foi alimentado 2 vezes nos últimos 30 minutos. Verifique se isso é correto.',
        type: 'warning',
        is_read: false,
        metadata: {
          source: 'duplicate-feeding-check',
          catId: '0fc3ce4b-04ee-4ec0-878d-1ddd8a8f7245',
          catName: 'Ziggy',
          feedingCount: 2,
          timeWindow: 30,
          unit: 'minutes',
          timestamp: new Date().toISOString()
        }
      },
      {
        user_id: currentUserId,
        title: '⚠️ Gato não Alimentado',
        message: 'Ziggy não recebeu nenhuma alimentação hoje. Verifique se ele está bem.',
        type: 'warning',
        is_read: false,
        metadata: {
          source: 'missed-feeding',
          catId: '0fc3ce4b-04ee-4ec0-878d-1ddd8a8f7245',
          catName: 'Ziggy',
          missedDays: 1,
          timestamp: new Date().toISOString()
        }
      },

      // 4. INFO - Informações gerais
      {
        user_id: currentUserId,
        title: 'ℹ️ Relatório Semanal',
        message: 'Ziggy foi alimentado 42 vezes esta semana com uma média de 9.3g por refeição.',
        type: 'info',
        is_read: false,
        metadata: {
          source: 'weekly-report',
          catId: '0fc3ce4b-04ee-4ec0-878d-1ddd8a8f7245',
          catName: 'Ziggy',
          weekStart: new Date().toISOString(),
          feedingCount: 42,
          averageQuantity: 9.3,
          unit: 'g',
          timestamp: new Date().toISOString()
        }
      },
      {
        user_id: currentUserId,
        title: '✨ Bem-vindo ao MealTime!',
        message: 'Configure seus gatos e horários de alimentação para começar a usar o sistema.',
        type: 'info',
        is_read: false,
        metadata: {
          source: 'onboarding',
          step: 1,
          timestamp: new Date().toISOString()
        }
      },

      // 5. HOUSEHOLD - Notificações de domicílio
      {
        user_id: currentUserId,
        title: '🏠 Novo Membro Adicionado',
        message: 'Maria Silva foi adicionada ao seu domicílio e agora pode registrar alimentações.',
        type: 'household',
        is_read: false,
        metadata: {
          source: 'household-update',
          householdId: '786f7655-b100-45d6-b75e-c2a85add5e5b',
          action: 'member-added',
          memberName: 'Maria Silva',
          memberId: 'new-member-id',
          timestamp: new Date().toISOString()
        }
      },
      {
        user_id: currentUserId,
        title: '👋 Membro Saiu do Domicílio',
        message: 'João Santos deixou seu domicílio.',
        type: 'household',
        is_read: false,
        metadata: {
          source: 'household-update',
          householdId: '786f7655-b100-45d6-b75e-c2a85add5e5b',
          action: 'member-left',
          memberName: 'João Santos',
          memberId: 'old-member-id',
          timestamp: new Date().toISOString()
        }
      },

      // 6. SYSTEM - Notificações do sistema
      {
        user_id: currentUserId,
        title: '🔧 Atualização do Sistema',
        message: 'Uma nova versão do MealTime está disponível. Recarregue a página para atualizar.',
        type: 'system',
        is_read: false,
        metadata: {
          source: 'system-update',
          version: '1.2.0',
          releaseDate: new Date().toISOString(),
          features: ['Novos ícones', 'Melhor performance'],
          timestamp: new Date().toISOString()
        }
      },
      {
        user_id: currentUserId,
        title: '⚙️ Configurações Atualizadas',
        message: 'Suas configurações de notificações foram atualizadas com sucesso.',
        type: 'system',
        is_read: false,
        metadata: {
          source: 'settings-update',
          updatedFields: ['feedReminder', 'emailNotifications'],
          timestamp: new Date().toISOString()
        }
      },

      // 7. ERROR - Erros
      {
        user_id: currentUserId,
        title: '❌ Erro ao Registrar Alimentação',
        message: 'Não foi possível registrar a alimentação de Ziggy. Tente novamente.',
        type: 'error',
        is_read: false,
        metadata: {
          source: 'feeding-error',
          catId: '0fc3ce4b-04ee-4ec0-878d-1ddd8a8f7245',
          catName: 'Ziggy',
          errorCode: 'REGISTRATION_FAILED',
          errorMessage: 'Network timeout',
          timestamp: new Date().toISOString()
        }
      },
      {
        user_id: currentUserId,
        title: '⚠️ Erro de Sincronização',
        message: 'Não foi possível sincronizar as notificações. Verifique sua conexão.',
        type: 'error',
        is_read: false,
        metadata: {
          source: 'sync-error',
          errorCode: 'SYNC_FAILED',
          errorMessage: 'Connection lost',
          retryCount: 3,
          timestamp: new Date().toISOString()
        }
      },
    ];

    let createdCount = 0;
    let errorCount = 0;

    console.log('📝 Criando notificações...\n');

    for (const notification of notifications) {
      try {
        const created = await prisma.notifications.create({
          data: notification
        });

        createdCount++;
        console.log(`✅ [${createdCount}/${notifications.length}] ${notification.title}`);
        console.log(`   Tipo: ${notification.type} | Lida: ${notification.is_read ? 'Sim' : 'Não'}`);
        
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Erro ao criar: ${notification.title}`);
        console.error(`   Erro: ${error.message}\n`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Resumo da Criação de Notificações');
    console.log('='.repeat(60));
    console.log(`✅ Criadas com sucesso: ${createdCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📈 Taxa de sucesso: ${((createdCount / notifications.length) * 100).toFixed(1)}%`);
    console.log('\n🎯 Notificações criadas por tipo:');
    
    const byType = notifications.reduce((acc, notif) => {
      acc[notif.type] = (acc[notif.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    console.log('\n🔔 Agora volte ao navegador e veja todas as notificações!');

  } catch (error) {
    console.error('❌ Erro fatal ao criar notificações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função de forma assíncrona e tratar erros
(async () => {
  try {
    await createAllNotificationTypes();
    process.exit(0); // Sucesso
  } catch (error) {
    console.error('❌ Erro fatal ao executar o script:', error);
    process.exit(1); // Falha
  }
})();

