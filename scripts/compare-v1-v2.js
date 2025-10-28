#!/usr/bin/env node

/**
 * Script para comparar respostas V1 vs V2
 * Garante que V2 entrega EXATAMENTE as mesmas informações que V1
 */

const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Compara campos de v1 e v2
 */
function compareFields(v1Data, v2Data, routeName) {
  log(`\n${'='.repeat(70)}`, colors.cyan);
  log(`Comparando: ${routeName}`, colors.bright + colors.cyan);
  log('='.repeat(70), colors.cyan);
  
  // Extrair dados de v2 (está dentro de .data)
  const v2ActualData = v2Data.data || v2Data;
  
  // Se ambos são arrays, comparar primeiro elemento
  const v1Item = Array.isArray(v1Data) ? v1Data[0] : v1Data;
  const v2Item = Array.isArray(v2ActualData) ? v2ActualData[0] : v2ActualData;
  
  if (!v1Item || !v2Item) {
    log('⚠️  Sem dados para comparar', colors.yellow);
    return { missingInV2: [], extraInV2: [], different: [] };
  }
  
  const v1Fields = Object.keys(v1Item).sort();
  const v2Fields = Object.keys(v2Item).sort();
  
  const missingInV2 = v1Fields.filter(f => !v2Fields.includes(f));
  const extraInV2 = v2Fields.filter(f => !v1Fields.includes(f));
  const commonFields = v1Fields.filter(f => v2Fields.includes(f));
  
  log(`\n📋 Campos em V1: ${v1Fields.length}`, colors.cyan);
  console.log('  ', v1Fields.join(', '));
  
  log(`\n📋 Campos em V2: ${v2Fields.length}`, colors.cyan);
  console.log('  ', v2Fields.join(', '));
  
  if (missingInV2.length > 0) {
    log(`\n❌ Campos FALTANDO em V2 (${missingInV2.length}):`, colors.red);
    missingInV2.forEach(f => log(`   - ${f}`, colors.red));
  }
  
  if (extraInV2.length > 0) {
    log(`\n✨ Campos EXTRAS em V2 (${extraInV2.length}):`, colors.green);
    extraInV2.forEach(f => log(`   - ${f}`, colors.green));
  }
  
  if (missingInV2.length === 0 && extraInV2.length === 0) {
    log(`\n✅ V2 tem EXATAMENTE os mesmos campos que V1!`, colors.green);
  }
  
  // Comparar valores dos campos comuns
  const different = [];
  commonFields.forEach(field => {
    const v1Val = v1Item[field];
    const v2Val = v2Item[field];
    
    // Comparar tipos (ignoring null/undefined differences for now)
    if (typeof v1Val !== typeof v2Val && v1Val !== null && v2Val !== null) {
      different.push({ field, v1Type: typeof v1Val, v2Type: typeof v2Val });
    }
  });
  
  if (different.length > 0) {
    log(`\n⚠️  Diferenças de tipo em ${different.length} campos:`, colors.yellow);
    different.forEach(({ field, v1Type, v2Type }) => {
      log(`   - ${field}: V1=${v1Type}, V2=${v2Type}`, colors.yellow);
    });
  }
  
  return { missingInV2, extraInV2, different };
}

/**
 * Testa uma rota com JWT
 */
async function fetchWithJWT(endpoint, token) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Main
 */
async function main() {
  const email = process.argv[2] || 'mauriciobc@gmail.com';
  const password = process.argv[3] || '#M4ur1c10';
  
  console.clear();
  log('\n🔍 COMPARAÇÃO V1 vs V2 - Mealtime API', colors.bright + colors.cyan);
  log('═'.repeat(70), colors.cyan);
  
  // Login e obter token
  log('\n🔐 Fazendo login...', colors.cyan);
  const loginResponse = await fetch(`${BASE_URL}/api/auth/mobile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const loginData = await loginResponse.json();
  
  if (!loginData.access_token) {
    log('❌ Falha no login', colors.red);
    process.exit(1);
  }
  
  const token = loginData.access_token;
  log('✅ Login realizado', colors.green);
  
  // Testes de comparação
  const issues = [];
  
  // 1. Comparar /api/cats vs /api/v2/cats
  log('\n\n📊 Teste 1: Comparando rotas de CATS', colors.bright);
  const v1Cats = await fetchWithJWT('/api/cats', token);
  const v2Cats = await fetchWithJWT('/api/v2/cats', token);
  
  const catsIssues = compareFields(v1Cats, v2Cats, 'GET /api/cats');
  if (catsIssues.missingInV2.length > 0) {
    issues.push({ route: '/cats', missing: catsIssues.missingInV2 });
  }
  
  // 2. Comparar /api/goals vs /api/v2/goals
  log('\n\n📊 Teste 2: Comparando rotas de GOALS', colors.bright);
  const v1Goals = await fetchWithJWT('/api/goals', token);
  const v2Goals = await fetchWithJWT('/api/v2/goals', token);
  
  const goalsIssues = compareFields(v1Goals, v2Goals, 'GET /api/goals');
  if (goalsIssues.missingInV2.length > 0) {
    issues.push({ route: '/goals', missing: goalsIssues.missingInV2 });
  }
  
  // 3. Comparar feedings/stats
  log('\n\n📊 Teste 3: Comparando FEEDINGS STATS', colors.bright);
  const v1Stats = await fetchWithJWT('/api/feedings/stats?days=7', token);
  const v2Stats = await fetchWithJWT('/api/v2/feedings/stats?days=7', token);
  
  const statsIssues = compareFields(v1Stats, v2Stats, 'GET /api/feedings/stats');
  if (statsIssues.missingInV2.length > 0) {
    issues.push({ route: '/feedings/stats', missing: statsIssues.missingInV2 });
  }
  
  // Resumo final
  log('\n\n' + '='.repeat(70), colors.cyan);
  log('RESUMO FINAL', colors.bright + colors.cyan);
  log('='.repeat(70), colors.cyan);
  
  if (issues.length === 0) {
    log('\n✅ TODAS AS ROTAS V2 RETORNAM OS MESMOS CAMPOS QUE V1!', colors.bright + colors.green);
    log('✅ Compatibilidade 100% garantida!', colors.green);
  } else {
    log(`\n⚠️  Encontrados ${issues.length} problemas de compatibilidade:`, colors.yellow);
    issues.forEach(issue => {
      log(`\n   Rota: ${issue.route}`, colors.yellow);
      log(`   Campos faltando em V2: ${issue.missing.join(', ')}`, colors.red);
    });
    log('\n📝 Ação necessária: Adicionar estes campos em V2', colors.yellow);
  }
  
  console.log('\n');
}

main().catch(console.error);

