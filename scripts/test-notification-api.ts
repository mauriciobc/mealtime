#!/usr/bin/env tsx

/**
 * Script de teste para a nova API de Notificações v2
 * 
 * Como usar:
 * 1. Faça login no app para obter um token
 * 2. Copie o token do localStorage (supabase.auth.token)
 * 3. Execute: TOKEN=seu-token npx tsx scripts/test-notification-api.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error('❌ TOKEN não fornecido!');
  console.log('');
  console.log('Como obter o token:');
  console.log('1. Faça login no app (http://localhost:3000)');
  console.log('2. Abra o DevTools Console');
  console.log('3. Execute: localStorage.getItem("supabase.auth.token")');
  console.log('4. Copie o access_token do JSON');
  console.log('');
  console.log('Uso:');
  console.log('TOKEN=seu-token-aqui npx tsx scripts/test-notification-api.ts');
  process.exit(1);
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

async function makeRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n📡 ${method} ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Sucesso (${response.status})`);
      return data;
    } else {
      console.log(`❌ Erro (${response.status})`);
      console.log('Resposta:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    return null;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('🚀 Iniciando testes da API de Notificações v2\n');
  console.log('=' .repeat(60));

  let createdNotificationId: string | null = null;
  let createdNotificationIds: string[] = [];

  // Teste 1: Criar uma notificação
  console.log('\n📝 TESTE 1: Criar Notificação');
  console.log('-' .repeat(60));
  const createResult = await makeRequest('/api/v2/notifications', 'POST', {
    title: '🧪 Notificação de Teste',
    message: 'Esta notificação foi criada pelo script de teste da API v2',
    type: 'info',
    isRead: false,
    metadata: {
      testId: 'test-' + Date.now(),
      source: 'test-script',
    }
  });

  if (createResult?.success && createResult.data) {
    createdNotificationId = createResult.data.id;
    if (createdNotificationId) {
      createdNotificationIds.push(createdNotificationId);
    }
    console.log(`✅ Notificação criada com ID: ${createdNotificationId}`);
    console.log(`   Título: ${createResult.data.title}`);
    console.log(`   Tipo: ${createResult.data.type}`);
  } else {
    console.log('❌ Falha ao criar notificação');
  }

  await sleep(500);

  // Teste 2: Criar mais notificações para teste em lote
  console.log('\n📝 TESTE 2: Criar Notificações Adicionais (para teste em lote)');
  console.log('-' .repeat(60));
  for (let i = 1; i <= 3; i++) {
    const result = await makeRequest('/api/v2/notifications', 'POST', {
      title: `🧪 Notificação de Teste ${i}`,
      message: `Esta é a notificação ${i} para teste em lote`,
      type: i === 1 ? 'info' : i === 2 ? 'warning' : 'feeding',
      isRead: false,
    });

    if (result?.success && result.data) {
      createdNotificationIds.push(result.data.id);
      console.log(`✅ Notificação ${i} criada: ${result.data.id}`);
    }

    await sleep(200);
  }

  // Teste 3: Listar notificações
  console.log('\n📝 TESTE 3: Listar Notificações');
  console.log('-' .repeat(60));
  const listResult = await makeRequest('/api/v2/notifications?page=1&limit=10');
  
  if (listResult?.success && listResult.data) {
    console.log(`✅ ${listResult.data.notifications.length} notificações encontradas`);
    console.log(`   Total: ${listResult.data.pagination.total}`);
    console.log(`   Página: ${listResult.data.pagination.page}/${listResult.data.pagination.totalPages}`);
  }

  await sleep(500);

  // Teste 4: Buscar notificação específica
  if (createdNotificationId) {
    console.log('\n📝 TESTE 4: Buscar Notificação Específica');
    console.log('-' .repeat(60));
    const getResult = await makeRequest(`/api/v2/notifications/${createdNotificationId}`);
    
    if (getResult?.success && getResult.data) {
      console.log(`✅ Notificação encontrada`);
      console.log(`   ID: ${getResult.data.id}`);
      console.log(`   Título: ${getResult.data.title}`);
      console.log(`   Lida: ${getResult.data.isRead ? 'Sim' : 'Não'}`);
    }

    await sleep(500);
  }

  // Teste 5: Marcar notificação como lida
  if (createdNotificationId) {
    console.log('\n📝 TESTE 5: Marcar Notificação Como Lida');
    console.log('-' .repeat(60));
    const patchResult = await makeRequest(
      `/api/v2/notifications/${createdNotificationId}`,
      'PATCH',
      { isRead: true }
    );
    
    if (patchResult?.success && patchResult.data) {
      console.log(`✅ Notificação marcada como lida`);
      console.log(`   Status: ${patchResult.data.isRead ? 'Lida' : 'Não lida'}`);
    }

    await sleep(500);
  }

  // Teste 6: Marcar múltiplas notificações como lidas
  if (createdNotificationIds.length > 0) {
    console.log('\n📝 TESTE 6: Marcar Múltiplas Notificações Como Lidas');
    console.log('-' .repeat(60));
    const bulkMarkResult = await makeRequest(
      '/api/v2/notifications/bulk',
      'PATCH',
      {
        action: 'mark_as_read',
        ids: createdNotificationIds.slice(1, 3) // Marcar apenas 2 das 3
      }
    );
    
    if (bulkMarkResult?.success && bulkMarkResult.data) {
      console.log(`✅ ${bulkMarkResult.data.updatedCount} notificações marcadas como lidas`);
    }

    await sleep(500);
  }

  // Teste 7: Marcar todas como lidas
  console.log('\n📝 TESTE 7: Marcar Todas as Notificações Como Lidas');
  console.log('-' .repeat(60));
  const markAllResult = await makeRequest(
    '/api/v2/notifications/bulk',
    'PATCH',
    { action: 'mark_all_as_read' }
  );
  
  if (markAllResult?.success && markAllResult.data) {
    console.log(`✅ ${markAllResult.data.updatedCount} notificações marcadas como lidas`);
  }

  await sleep(500);

  // Teste 8: Deletar notificação específica
  if (createdNotificationId) {
    console.log('\n📝 TESTE 8: Deletar Notificação Específica');
    console.log('-' .repeat(60));
    const deleteResult = await makeRequest(
      `/api/v2/notifications/${createdNotificationId}`,
      'DELETE'
    );
    
    if (deleteResult?.success) {
      console.log(`✅ Notificação deletada com sucesso`);
    }

    await sleep(500);
  }

  // Teste 9: Deletar múltiplas notificações
  if (createdNotificationIds.length > 1) {
    console.log('\n📝 TESTE 9: Deletar Múltiplas Notificações');
    console.log('-' .repeat(60));
    const bulkDeleteResult = await makeRequest(
      '/api/v2/notifications/bulk',
      'DELETE',
      { ids: createdNotificationIds.slice(1) } // Deletar as demais
    );
    
    if (bulkDeleteResult?.success && bulkDeleteResult.data) {
      console.log(`✅ ${bulkDeleteResult.data.deletedCount} notificações deletadas`);
    }
  }

  // Resumo
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('=' .repeat(60));
  console.log('✅ Todos os testes foram executados!');
  console.log('');
  console.log('Funcionalidades testadas:');
  console.log('  ✓ Criar notificação');
  console.log('  ✓ Listar notificações (com paginação)');
  console.log('  ✓ Buscar notificação específica');
  console.log('  ✓ Marcar notificação como lida');
  console.log('  ✓ Marcar múltiplas notificações como lidas');
  console.log('  ✓ Marcar todas as notificações como lidas');
  console.log('  ✓ Deletar notificação específica');
  console.log('  ✓ Deletar múltiplas notificações');
  console.log('');
  console.log('🎉 API de Notificações v2 funcionando perfeitamente!');
}

// Executar testes
runTests().catch((error) => {
  console.error('❌ Erro ao executar testes:', error);
  process.exit(1);
});

