#!/usr/bin/env node

/**
 * Script de Teste para Autenticação JWT nas Rotas da API
 * 
 * Este script testa o fluxo completo:
 * 1. Login via API mobile (obtém JWT)
 * 2. Usa o JWT para acessar rotas protegidas
 * 3. Verifica se a autenticação está funcionando corretamente
 */

const BASE_URL = 'http://localhost:3000';

// Cores para output bonito no terminal
const colors = {
  reset: '\x1b[0m',
  statutes: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, colors.bright + colors.cyan);
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

/**
 * Testa o login e retorna o JWT token
 */
async function getJWTToken(email, password) {
  try {
    logInfo(`Fazendo login com email: ${email}`);
    
    const response = await fetch(`${BASE_URL}/api/auth/mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok && data.access_token) {
      logSuccess('Login realizado com sucesso!');
      logInfo(`Access Token: ${data.access_token.substring(0, 40)}...`);
      logInfo(`Refresh Token: ${data.refresh_token.substring(0, 40)}...`);
      
      return {
        success: true,
        access_token: data.access_token,
        user: data.user
      };
    } else {
      logError('Login falhou!');
      console.log('Resposta:', JSON.stringify(data, null, 2));
      return { success: false };
    }
  } catch (error) {
    logError(`Erro ao fazer login: ${error.message}`);
    return { success: false };
  }
}

/**
 * Testa acesso a rota protegida sem JWT
 */
async function testUnauthorizedAccess(endpoint, method = 'GET') {
  logInfo(`Testando ${method} ${endpoint} sem JWT...`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    if (response.status === 401 && !data.success) {
      logSuccess('API corretamente negou acesso sem autenticação (401)');
      return true;
    } else {
      logError(`API não retornou 401. Status: ${response.status}`);
      console.log('Resposta:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    logError(`Erro ao testar acesso não autorizado: ${error.message}`);
    return false;
  }
}

/**
 * Testa acesso a rota protegida com JWT válido
 */
async function testAuthorizedAccess(endpoint, accessToken, method = 'GET', body = null) {
  logInfo(`Testando ${method} ${endpoint} com JWT...`);
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };

    const options = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);

    const data = await response.json();
    
    if (response.ok) {
      logSuccess(`Acesso autorizado (${response.status})`);
      console.log('\n📦 Resposta:');
      console.log(JSON.stringify(data, null, 2));
      return true;
    } else {
      logError(`Acesso negado (${response.status})`);
      console.log('Resposta:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    logError(`Erro ao testar acesso autorizado: ${error.message}`);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  console.clear();
  log('\n🔐 TESTE DE AUTENTICAÇÃO JWT - MEALTIME API', colors.bright + colors.cyan);
  log('═'.repeat(60), colors.cyan);
  
  // Pegar credenciais dos argumentos ou usar variáveis de ambiente
  const email = process.argv[2] || process.env.TEST_EMAIL;
  const password = process.argv[3] || process.env.TEST_PASSWORD;
  
  if (!email || !password) {
    logWarning('\n📝 Uso do script:');
    console.log('  node scripts/test-jwt-auth.js <email> <password>');
    console.log('\nOu defina variáveis de ambiente:');
    console.log('  TEST_EMAIL=seu@email.com TEST_PASSWORD=senha node scripts/test-jwt-auth.js');
    process.exit(1);
  }

  let testsPassed = 0;
  let testsFailed = 0;

  // Teste 1: Fazer login e obter JWT
  logSection('Teste 1: Login e Obtenção de JWT');
  const loginResult = await getJWTToken(email, password);
  
  if (!loginResult.success) {
    logError('Não foi possível fazer login. Testes interrompidos.');
    process.exit(1);
  }
  
  testsPassed++;
  const accessToken = loginResult.access_token;
  const user = loginResult.user;

  await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s

  // Teste 2: Testar acesso não autorizado (sem JWT)
  logSection('Teste 2: Acesso Não Autorizado (sem JWT)');
  const unauthorizedResult = await testUnauthorizedAccess('/api/mobile/cats');
  if (unauthorizedResult) {
    testsPassed++;
  } else {
    testsFailed++;
  }

  await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s

  // Teste 3: Testar acesso autorizado com JWT válido
  logSection('Teste 3: Acesso Autorizado (com JWT) - Listar Gatos');
  const authorizedGetResult = await testAuthorizedAccess('/api/mobile/cats', accessToken, 'GET');
  if (authorizedGetResult) {
    testsPassed++;
  } else {
    testsFailed++;
  }

  await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s

  // Teste 4: Testar criar gato com JWT válido
  logSection('Teste 4: Criar Gato (com JWT)');
  
  // Verificar se o usuário tem household
  if (!user.household_id) {
    logWarning('Usuário não está associado a um household. Pulando teste de criação de gato.');
  } else {
    const catData = {
      name: `Gato Teste ${Date.now()}`,
      weight: 4.5,
      birth_date: new Date('2020-01-15').toISOString()
    };
    
    const authorizedPostResult = await testAuthorizedAccess(
      '/api/mobile/cats',
      accessToken,
      'POST',
      catData
    );
    
    if (authorizedPostResult) {
      testsPassed++;
    } else {
      testsFailed++;
    }
  }

  await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s

  // Teste 5: Testar JWT inválido
  logSection('Teste 5: JWT Inválido');
  const invalidTokenResult = await testAuthorizedAccess('/api/mobile/cats', 'invalid_token_here', 'GET');
  
  // Esperamos que falhe
  if (!invalidTokenResult) {
    logSuccess('API corretamente rejeitou JWT inválido');
    testsPassed++;
  } else {
    logError('API aceitou JWT inválido!');
    testsFailed++;
  }

  // Resumo final
  logSection('Resumo dos Testes');
  console.log(`Total de testes: ${testsPassed + testsFailed}`);
  logSuccess(`Testes passaram: ${testsPassed}`);
  if (testsFailed > 0) {
    logError(`Testes falharam: ${testsFailed}`);
  }
  
  if (testsFailed === 0) {
    log('\n🎉 TODOS OS TESTES PASSARAM! 🎉', colors.bright + colors.green);
    log('\n✨ A autenticação JWT está funcionando corretamente!\n', colors.green);
  } else {
    log('\n⚠️  ALGUNS TESTES FALHARAM\n', colors.yellow);
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Executar
main().catch((error) => {
  logError('Erro fatal no script de teste:');
  console.error(error);
  process.exit(1);
});

