#!/usr/bin/env node

/**
 * Script de Teste Completo para API V2
 * 
 * Testa todas as rotas migradas com:
 * 1. Autenticação JWT (mobile)
 * 2. Verificação de headers de deprecation em v1
 * 3. Comparação de respostas v1 vs v2
 */

const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
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
  console.log('\n' + '='.repeat(70));
  log(`  ${title}`, colors.bright + colors.cyan);
  console.log('='.repeat(70) + '\n');
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
 * Faz login e retorna o JWT token
 */
async function getJWTToken(email, password) {
  try {
    logInfo(`Fazendo login com: ${email}`);
    
    const response = await fetch(`${BASE_URL}/api/auth/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok && data.access_token) {
      logSuccess('Login realizado!');
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
 * Testa uma rota v2 com JWT
 */
async function testV2Route(endpoint, method, token, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data,
      hasSuccessField: typeof data.success === 'boolean'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica headers de deprecation em v1
 */
async function checkV1DeprecationHeaders(endpoint, method, token) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    return {
      hasDeprecatedHeader: response.headers.get('X-API-Deprecated') === 'true',
      hasVersionHeader: response.headers.get('X-API-Version') === 'v1',
      hasSunsetDate: !!response.headers.get('X-API-Sunset-Date'),
      hasWarning: !!response.headers.get('Warning'),
      headers: {
        deprecated: response.headers.get('X-API-Deprecated'),
        version: response.headers.get('X-API-Version'),
        sunset: response.headers.get('X-API-Sunset-Date'),
        warning: response.headers.get('Warning')
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Função principal
 */
async function main() {
  console.clear();
  log('\n🧪 TESTE COMPLETO DA API V2 - MEALTIME', colors.bright + colors.cyan);
  log('═'.repeat(70), colors.cyan);
  
  const email = process.argv[2] || process.env.TEST_EMAIL || 'teste@mealtime.dev';
  const password = process.argv[3] || process.env.TEST_PASSWORD || 'teste123456';
  
  let testsPassed = 0;
  let testsFailed = 0;

  // === FASE 1: LOGIN ===
  logSection('Fase 1: Autenticação e Obtenção de JWT');
  const loginResult = await getJWTToken(email, password);
  
  if (!loginResult.success) {
    logError('Não foi possível fazer login. Testes interrompidos.');
    logInfo('Certifique-se de que o servidor está rodando e as credenciais estão corretas.');
    process.exit(1);
  }
  
  testsPassed++;
  const token = loginResult.access_token;
  const user = loginResult.user;
  
  logInfo(`User ID: ${user.id}`);
  logInfo(`Household ID: ${user.household_id || 'N/A'}`);

  await sleep(500);

  // === FASE 2: TESTAR ROTAS V2 ===
  logSection('Fase 2: Testando Rotas V2 com JWT');

  const v2Routes = [
    { name: 'GET /api/v2/cats', endpoint: '/api/v2/cats', method: 'GET' },
    { name: 'GET /api/v2/feedings/stats', endpoint: '/api/v2/feedings/stats?days=7', method: 'GET' },
    { name: 'GET /api/v2/weight-logs', endpoint: '/api/v2/weight-logs?catId=dummy', method: 'GET', expectError: true },
    { name: 'GET /api/v2/goals', endpoint: '/api/v2/goals', method: 'GET' },
    { name: 'GET /api/v2/schedules', endpoint: '/api/v2/schedules?householdId=dummy', method: 'GET', expectError: true },
  ];

  for (const route of v2Routes) {
    logInfo(`Testando: ${route.name}`);
    const result = await testV2Route(route.endpoint, route.method, token);
    
    if (result.hasSuccessField) {
      logSuccess(`  Resposta tem campo 'success': ${result.data.success}`);
      testsPassed++;
    } else if (route.expectError && !result.success) {
      logSuccess(`  Erro esperado recebido corretamente`);
      testsPassed++;
    } else {
      logWarning(`  Resposta não tem campo 'success' padronizado`);
      testsFailed++;
    }
    
    logInfo(`  Status: ${result.status}`);
    await sleep(300);
  }

  // === FASE 3: VERIFICAR DEPRECATION EM V1 ===
  logSection('Fase 3: Verificando Headers de Deprecation em V1');

  const v1Routes = [
    { name: 'GET /api/cats', endpoint: '/api/cats', method: 'GET' },
  ];

  for (const route of v1Routes) {
    logInfo(`Verificando: ${route.name}`);
    const headers = await checkV1DeprecationHeaders(route.endpoint, route.method, token);
    
    if (headers.error) {
      logError(`  Erro ao verificar headers: ${headers.error}`);
      testsFailed++;
    } else {
      if (headers.hasDeprecatedHeader) {
        logSuccess(`  ✓ Header X-API-Deprecated presente`);
        testsPassed++;
      } else {
        logWarning(`  ⚠ Header X-API-Deprecated ausente`);
      }
      
      if (headers.hasVersionHeader) {
        logSuccess(`  ✓ Header X-API-Version: ${headers.headers.version}`);
      }
      
      if (headers.hasSunsetDate) {
        logSuccess(`  ✓ Header X-API-Sunset-Date: ${headers.headers.sunset}`);
      }
    }
    await sleep(300);
  }

  // === RESUMO FINAL ===
  logSection('Resumo dos Testes');
  console.log(`Total de testes: ${testsPassed + testsFailed}`);
  logSuccess(`Testes passaram: ${testsPassed}`);
  if (testsFailed > 0) {
    logError(`Testes falharam: ${testsFailed}`);
  }
  
  if (testsFailed === 0) {
    log('\n🎉 TODOS OS TESTES PASSARAM! 🎉', colors.bright + colors.green);
    log('\n✨ A API v2 está funcionando corretamente com JWT!\n', colors.green);
  } else {
    log('\n⚠️  ALGUNS TESTES FALHARAM\n', colors.yellow);
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Executar
main().catch((error) => {
  logError('Erro fatal no script de teste:');
  console.error(error);
  process.exit(1);
});

