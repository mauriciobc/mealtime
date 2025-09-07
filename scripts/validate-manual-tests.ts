#!/usr/bin/env ts-node
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestValidation {
  file: string;
  status: 'valid' | 'missing' | 'incomplete';
  issues: string[];
  sections: string[];
}

const MANUAL_TEST_FILES = [
  'tests/manual/user-flows.md',
  'tests/manual/critical-paths.md',
  'tests/manual/edge-cases.md',
  'tests/manual/regression-checklist.md'
];

const REQUIRED_SECTIONS = {
  'user-flows.md': ['AUTENTICAÇÃO', 'GERENCIAMENTO DE GATOS', 'ALIMENTAÇÃO', 'PESO', 'NOTIFICAÇÕES', 'CONFIGURAÇÕES', 'ESTATÍSTICAS'],
  'critical-paths.md': ['CAMINHOS CRÍTICOS - PRIORIDADE MÁXIMA', 'CAMINHOS IMPORTANTES - PRIORIDADE MÉDIA', 'CAMINHOS SECUNDÁRIOS - PRIORIDADE BAIXA', 'CENÁRIOS DE FALHA CRÍTICA'],
  'edge-cases.md': ['CASOS DE ERRO DE REDE', 'CASOS DE DISPOSITIVO', 'CASOS DE DADOS', 'CASOS DE USUÁRIO', 'CASOS DE SISTEMA'],
  'regression-checklist.md': ['AUTENTICAÇÃO', 'GERENCIAMENTO DE GATOS', 'ALIMENTAÇÃO', 'PESO', 'NOTIFICAÇÕES', 'CONFIGURAÇÕES', 'ESTATÍSTICAS', 'ERROS COMUNS']
};

function validateManualTests(): TestValidation[] {
  console.log('🔍 Validando documentação de testes manuais...\n');
  
  const validations: TestValidation[] = [];
  
  for (const file of MANUAL_TEST_FILES) {
    const validation: TestValidation = {
      file,
      status: 'valid',
      issues: [],
      sections: []
    };
    
    if (!existsSync(file)) {
      validation.status = 'missing';
      validation.issues.push('Arquivo não encontrado');
      validations.push(validation);
      continue;
    }
    
    try {
      const content = readFileSync(file, 'utf-8');
      const fileName = file.split('/').pop()!;
      const requiredSections = REQUIRED_SECTIONS[fileName as keyof typeof REQUIRED_SECTIONS] || [];
      
      // Verificar seções obrigatórias
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          validation.issues.push(`Seção "${section}" não encontrada`);
          validation.status = 'incomplete';
        } else {
          validation.sections.push(section);
        }
      }
      
      // Verificar estrutura básica
      if (!content.includes('##') || !content.includes('###')) {
        validation.issues.push('Estrutura de markdown inadequada');
        validation.status = 'incomplete';
      }
      
      // Verificar se há conteúdo suficiente
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      if (lines.length < 50) {
        validation.issues.push('Conteúdo insuficiente (menos de 50 linhas)');
        validation.status = 'incomplete';
      }
      
      // Verificar se há listas de verificação
      if (!content.includes('- [ ]') && !content.includes('- [x]')) {
        validation.issues.push('Não há listas de verificação (checklists)');
        validation.status = 'incomplete';
      }
      
    } catch (error) {
      validation.status = 'missing';
      validation.issues.push(`Erro ao ler arquivo: ${error}`);
    }
    
    validations.push(validation);
  }
  
  return validations;
}

function printValidationReport(validations: TestValidation[]): void {
  let totalIssues = 0;
  let validFiles = 0;
  
  console.log('📊 RELATÓRIO DE VALIDAÇÃO\n');
  console.log('=' .repeat(50));
  
  for (const validation of validations) {
    const fileName = validation.file.split('/').pop()!;
    const statusIcon = validation.status === 'valid' ? '✅' : validation.status === 'incomplete' ? '⚠️' : '❌';
    
    console.log(`${statusIcon} ${fileName}`);
    
    if (validation.status === 'valid') {
      console.log(`   ✅ Arquivo válido (${validation.sections.length} seções encontradas)`);
      validFiles++;
    } else {
      console.log(`   ❌ Status: ${validation.status.toUpperCase()}`);
      for (const issue of validation.issues) {
        console.log(`      • ${issue}`);
        totalIssues++;
      }
    }
    
    console.log('');
  }
  
  console.log('=' .repeat(50));
  console.log(`📈 RESUMO:`);
  console.log(`   • Arquivos válidos: ${validFiles}/${validations.length}`);
  console.log(`   • Total de problemas: ${totalIssues}`);
  console.log(`   • Taxa de sucesso: ${Math.round((validFiles / validations.length) * 100)}%`);
  
  if (totalIssues === 0) {
    console.log('\n🎉 Todos os testes manuais estão documentados corretamente!');
  } else {
    console.log('\n⚠️  Alguns arquivos precisam de atenção. Revise os problemas listados acima.');
  }
}

function generateRecommendations(validations: TestValidation[]): void {
  const incompleteFiles = validations.filter(v => v.status !== 'valid');
  
  if (incompleteFiles.length === 0) {
    return;
  }
  
  console.log('\n💡 RECOMENDAÇÕES:');
  console.log('=' .repeat(50));
  
  for (const validation of incompleteFiles) {
    const fileName = validation.file.split('/').pop()!;
    console.log(`\n📝 ${fileName}:`);
    
    if (validation.status === 'missing') {
      console.log('   • Crie o arquivo seguindo o template base');
      console.log('   • Use markdown com estrutura clara');
      console.log('   • Inclua listas de verificação');
    } else {
      console.log('   • Adicione as seções obrigatórias faltantes');
      console.log('   • Expanda o conteúdo com mais detalhes');
      console.log('   • Inclua exemplos práticos');
    }
  }
  
  console.log('\n📚 TEMPLATES DISPONÍVEIS:');
  console.log('   • tests/manual/user-flows.md - Fluxos de usuário');
  console.log('   • tests/manual/critical-paths.md - Caminhos críticos');
  console.log('   • tests/manual/edge-cases.md - Casos extremos');
  console.log('   • tests/manual/regression-checklist.md - Checklist de regressão');
}

async function main() {
  try {
    const validations = validateManualTests();
    printValidationReport(validations);
    generateRecommendations(validations);
    
    const hasIssues = validations.some(v => v.status !== 'valid');
    process.exit(hasIssues ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Erro durante validação:', error);
    process.exit(1);
  }
}

// Executar se for o arquivo principal
main().then(() => {
  console.log('\n🎉 Validação concluída!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});

export { validateManualTests, printValidationReport }; 