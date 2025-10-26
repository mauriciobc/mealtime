/**
 * Script para criar uma notificação de teste
 * Uso: npx tsx scripts/create-test-notification.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestNotification() {
  try {
    console.log('🔍 Buscando um usuário para criar a notificação de teste...');
    
    // Buscar o primeiro usuário disponível
    const user = await prisma.profiles.findFirst({
      select: { id: true, username: true, email: true }
    });

    if (!user) {
      console.error('❌ Nenhum usuário encontrado no banco de dados.');
      console.log('💡 Dica: Faça login no app primeiro para criar um usuário.');
      process.exit(1);
    }

    console.log(`✅ Usuário encontrado: ${user.username || user.email || user.id}`);

    // Criar notificação de teste
    const notification = await prisma.notifications.create({
      data: {
        user_id: user.id,
        title: '🎉 Notificação de Teste',
        message: 'Esta é uma notificação de teste criada via script. Se você está vendo isso, o sistema de notificações está funcionando corretamente!',
        type: 'info',
        is_read: false,
        metadata: {
          source: 'test-script',
          timestamp: new Date().toISOString(),
          testMode: true
        }
      }
    });

    console.log('✅ Notificação criada com sucesso!');
    console.log('📋 Detalhes:');
    console.log(`   ID: ${notification.id}`);
    console.log(`   Título: ${notification.title}`);
    console.log(`   Mensagem: ${notification.message}`);
    console.log(`   Tipo: ${notification.type}`);
    console.log(`   Criado em: ${notification.created_at}`);
    console.log('');
    console.log('🔔 Agora abra o app e verifique se a notificação aparece na UI!');

  } catch (error) {
    console.error('❌ Erro ao criar notificação:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotification();

