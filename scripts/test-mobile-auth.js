#!/usr/bin/env node

/**
 * Script de Teste para API de Autenticação Mobile
 * 
 * Este script testa os endpoints de autenticação mobile:
 * 1. POST /api/auth/mobile - Login
 * 2. PUT /api/auth/mobile - Refresh Token
 */

const BASE_URL = 'http://localhost:3000';

// Cores para output bonito no terminal
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
 * Testa o endpoint de login mobile
 */
async function testMobileLogin(email, password) {
  logSection('Teste 1: Login Mobile (POST /api/auth/mobile)');
  
  try {
    logInfo(`Enviando requisição para: ${BASE_URL}/api/auth/mobile`);
    logInfo(`Email: ${email}`);
    logInfo(`Password: ${'*'.repeat(password.length)}`);
    
    const response = await fetch(`${BASE_URL}/api/auth/mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();
    
    log(`\nStatus Code: ${response.status}`, 
      response.status === 200 ? colors.green : colors.red);
    
    if (response.ok && data.success) {
      logSuccess('Login realizado com sucesso!');
      
      // Exibir dados do usuário de forma organizada
      console.log('\n👤 DADOS DO USUÁRIO REGISTRADO:');
      console.log('═'.repeat(60));
      console.log(`ID:          ${data.user.id}`);
      console.log(`Email:       ${data.user.email}`);
      console.log(`Nome:        ${data.user.full_name}`);
      console.log(`Auth ID:     ${data.user.auth_id}`);
      console.log(`Household:   ${data.user.household_id || 'N/A'}`);
      console.log('═'.repeat(60));
      
      // Informações do household se existir
      if (data.user?.household) {
        console.log('\n🏠 HOUSEHOLD (Casa/Família):');
        console.log('─'.repeat(60));
        console.log(`Nome:        ${data.user.household.name}`);
        console.log(`ID:          ${data.user.household.id}`);
        console.log(`Membros:     ${data.user.household.members?.length || 0}`);
        
        if (data.user.household.members && data.user.household.members.length > 0) {
          console.log('\n👥 Lista de Membros:');
          data.user.household.members.forEach((member, idx) => {
            console.log(`  ${idx + 1}. ${member.name}`);
            console.log(`     Email: ${member.email}`);
            console.log(`     Role:  ${member.role || 'N/A'}`);
            if (idx < data.user.household.members.length - 1) console.log('');
          });
        }
        console.log('─'.repeat(60));
      }
      
      // Informações dos tokens
      console.log('\n🔑 INFORMAÇÕES DE AUTENTICAÇÃO:');
      console.log('─'.repeat(60));
      console.log(`Token Type:     ${data.token_type}`);
      console.log(`Expires In:     ${data.expires_in} segundos`);
      console.log(`Access Token:   ${data.access_token.substring(0, 30)}...`);
      console.log(`Refresh Token:  ${data.refresh_token.substring(0, 30)}...`);
      console.log('─'.repeat(60));
      
      // Validar campos obrigatórios
      console.log('\n🔍 VALIDAÇÃO DE CAMPOS:');
      const validations = [
        { field: 'success', value: data.success, expected: true },
        { field: 'user', value: !!data.user, expected: true },
        { field: 'user.id', value: !!data.user?.id, expected: true },
        { field: 'user.email', value: !!data.user?.email, expected: true },
        { field: 'user.full_name', value: !!data.user?.full_name, expected: true },
        { field: 'access_token', value: !!data.access_token, expected: true },
        { field: 'refresh_token', value: !!data.refresh_token, expected: true },
        { field: 'expires_in', value: !!data.expires_in, expected: true },
        { field: 'token_type', value: data.token_type === 'Bearer', expected: true },
      ];
      
      let allValid = true;
      validations.forEach(({ field, value, expected }) => {
        if (value === expected) {
          logSuccess(`Campo "${field}" está correto`);
        } else {
          logError(`Campo "${field}" está incorreto ou ausente`);
          allValid = false;
        }
      });
      
      if (allValid) {
        logSuccess('\n✨ Todos os campos obrigatórios estão presentes!');
      } else {
        logWarning('\n⚠️  Alguns campos estão faltando ou incorretos');
      }
      
      // Exibir JSON completo formatado
      console.log('\n📋 JSON COMPLETO DA RESPOSTA:');
      console.log('─'.repeat(60));
      console.log(JSON.stringify(data, null, 2));
      console.log('─'.repeat(60));
      
      return {
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
      };
    } else {
      logError('Login falhou!');
      console.log('\n📦 Resposta do servidor:');
      console.log(JSON.stringify(data, null, 2));
      return { success: false };
    }
  } catch (error) {
    logError(`Erro ao testar login: ${error.message}`);
    console.error(error);
    return { success: false };
  }
}

/**
 * Testa o endpoint de refresh token
 */
async function testRefreshToken(refreshToken) {
  logSection('Teste 2: Refresh Token (PUT /api/auth/mobile)');
  
  try {
    logInfo(`Enviando requisição para: ${BASE_URL}/api/auth/mobile`);
    logInfo(`Refresh Token: ${refreshToken.substring(0, 20)}...`);
    
    const response = await fetch(`${BASE_URL}/api/auth/mobile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();
    
    log(`\nStatus Code: ${response.status}`, 
      response.status === 200 ? colors.green : colors.red);
    
    if (response.ok && data.success) {
      logSuccess('Token renovado com sucesso!');
      
      console.log('\n📦 Dados recebidos:');
      console.log('─'.repeat(60));
      console.log(JSON.stringify(data, null, 2));
      console.log('─'.repeat(60));
      
      // Validar campos
      console.log('\n🔍 Validando resposta:');
      const validations = [
        { field: 'success', value: data.success, expected: true },
        { field: 'access_token', value: !!data.access_token, expected: true },
        { field: 'refresh_token', value: !!data.refresh_token, expected: true },
        { field: 'expires_in', value: !!data.expires_in, expected: true },
        { field: 'token_type', value: data.token_type === 'Bearer', expected: true },
      ];
      
      let allValid = true;
      validations.forEach(({ field, value, expected }) => {
        if (value === expected) {
          logSuccess(`Campo "${field}" está correto`);
        } else {
          logError(`Campo "${field}" está incorreto ou ausente`);
          allValid = false;
        }
      });
      
      if (allValid) {
        logSuccess('\n✨ Token renovado corretamente!');
      }
      
      return { success: true };
    } else {
      logError('Refresh token falhou!');
      console.log('\n📦 Resposta do servidor:');
      console.log(JSON.stringify(data, null, 2));
      return { success: false };
    }
  } catch (error) {
    logError(`Erro ao renovar token: ${error.message}`);
    console.error(error);
    return { success: false };
  }
}

/**
 * Testa credenciais inválidas
 */
async function testInvalidCredentials() {
  logSection('Teste 3: Credenciais Inválidas');
  
  try {
    logInfo('Testando login com credenciais inválidas...');
    
    const response = await fetch(`${BASE_URL}/api/auth/mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'usuario_invalido@teste.com',
        password: 'senha_errada_123',
      }),
    });

    const data = await response.json();
    
    if (response.status === 401 && !data.success) {
      logSuccess('API retornou erro 401 corretamente para credenciais inválidas!');
      logInfo(`Mensagem de erro: "${data.error}"`);
      return { success: true };
    } else {
      logError('API não retornou erro esperado para credenciais inválidas');
      console.log('Status:', response.status);
      console.log('Resposta:', data);
      return { success: false };
    }
  } catch (error) {
    logError(`Erro ao testar credenciais inválidas: ${error.message}`);
    return { success: false };
  }
}

/**
 * Função principal
 */
async function main() {
  console.clear();
  log('\n🚀 TESTE DE API DE AUTENTICAÇÃO MOBILE - MEALTIME', colors.bright + colors.cyan);
  log('═'.repeat(60), colors.cyan);
  
  // Pegar credenciais dos argumentos ou usar padrão
  const email = process.argv[2] || process.env.TEST_EMAIL;
  const password = process.argv[3] || process.env.TEST_PASSWORD;
  
  if (!email || !password) {
    logWarning('\n📝 Uso do script:');
    console.log('  node scripts/test-mobile-auth.js <email> <password>');
    console.log('\nOu defina variáveis de ambiente:');
    console.log('  TEST_EMAIL=seu@email.com TEST_PASSWORD=senha node scripts/test-mobile-auth.js');
    console.log('\n');
    logInfo('Tentando usar credenciais padrão de teste...');
    logWarning('⚠️  Para testar com suas próprias credenciais, use uma conta válida!\n');
    
    // Credenciais de exemplo (provavelmente não vão funcionar)
    const testEmail = 'teste@exemplo.com';
    const testPassword = 'senha123';
    
    await runAllTests(testEmail, testPassword);
  } else {
    await runAllTests(email, password);
  }
}

async function runAllTests(email, password) {
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Teste 1: Login com credenciais válidas
  const loginResult = await testMobileLogin(email, password);
  if (loginResult.success) {
    testsPassed++;
    
    // Teste 2: Refresh token (só se o login funcionou)
    if (loginResult.refresh_token) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s
      const refreshResult = await testRefreshToken(loginResult.refresh_token);
      if (refreshResult.success) {
        testsPassed++;
      } else {
        testsFailed++;
      }
    }
  } else {
    testsFailed++;
  }
  
  // Teste 3: Credenciais inválidas
  await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s
  const invalidResult = await testInvalidCredentials();
  if (invalidResult.success) {
    testsPassed++;
  } else {
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
    log('\n🎉 TODOS OS TESTES PASSARAM! 🎉\n', colors.bright + colors.green);
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

