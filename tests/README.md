# 🧪 Sistema de Testes - Mealtime

Este documento descreve o sistema de testes implementado para o projeto Mealtime, que prioriza **testes manuais** para a maioria das funcionalidades e **testes automatizados** apenas para funcionalidades críticas.

## 📋 Visão Geral

### Filosofia de Testes
- **Testes Manuais**: Base principal para validação de funcionalidades
- **Testes Automatizados**: Apenas para funcionalidades críticas e smoke tests
- **Foco**: Qualidade, manutenibilidade e velocidade de desenvolvimento

### Estrutura de Diretórios
```
tests/
├── automated/           # Testes automatizados
│   ├── critical/       # Testes de funcionalidades críticas
│   └── smoke/          # Testes de fumaça
├── manual/             # Documentação de testes manuais
├── tools/              # Ferramentas de apoio
│   └── helpers/        # Helpers e utilitários
└── setup.ts            # Configuração global
```

## 🚀 Como Executar Testes

### Testes Automatizados
```bash
# Executar todos os testes automatizados
npm run test

# Interface visual para testes
npm run test:ui

# Executar testes uma vez
npm run test:run

# Testes de fumaça
npm run test:smoke

# Testes críticos
npm run test:critical

# Cobertura de código
npm run test:coverage
```

### Testes com Dados
```bash
# Resetar banco e executar testes
npm run test:with-data

# Gerar dados específicos e executar testes
npm run test:with-data:minimal
npm run test:with-data:medium
npm run test:with-data:large
```

### Gerenciamento de Banco de Dados
```bash
# Resetar banco de dados de teste
npm run test:db:reset

# Gerar dados de teste
npm run test:db:generate

# Gerar cenários específicos
npm run test:db:generate:minimal
npm run test:db:generate:medium
npm run test:db:generate:large
```

### Validação de Documentação
```bash
# Validar testes manuais
npm run test:validate-manual
```

### Verificação de Segurança
```bash
# Verificar segurança do banco de dados
npm run test:safety-check

# Verificar segurança em ambiente de teste
npm run test:safety-check:verbose
```

## 📚 Testes Manuais

### Documentação Disponível
- **`tests/manual/user-flows.md`**: Fluxos principais de usuário
- **`tests/manual/critical-paths.md`**: Caminhos críticos da aplicação
- **`tests/manual/edge-cases.md`**: Casos extremos e cenários de erro
- **`tests/manual/regression-checklist.md`**: Checklist de regressão

### Como Executar Testes Manuais
1. Abra a aplicação em desenvolvimento: `npm run dev`
2. Siga os passos documentados em cada arquivo
3. Marque os itens como concluídos (`[x]`)
4. Reporte problemas encontrados

### Frequência de Testes
- **Diário**: Caminhos críticos
- **Semanal**: Fluxos de usuário principais
- **Mensal**: Casos extremos e regressão completa

## 🤖 Testes Automatizados

### Testes Críticos (`tests/automated/critical/`)

#### Autenticação (`auth.test.ts`)
- Validação de credenciais
- Middleware de autenticação
- Sessões e logout
- Segurança básica

#### API Core (`api-core.test.ts`)
- Endpoints de gatos (CRUD)
- Endpoints de alimentação (CRUD)
- Endpoints de peso (CRUD)
- Validações de resposta

#### Banco de Dados (`database.test.ts`)
- Operações CRUD básicas
- Validações de dados
- Relacionamentos
- Transações

### Testes de Fumaça (`tests/automated/smoke/`)

#### Carregamento da Aplicação (`app-load.test.ts`)
- Carregamento básico
- Rotas principais
- Responsividade
- Performance básica
- Segurança básica
- Acessibilidade básica

## 🛠️ Ferramentas e Scripts

### Scripts de Desenvolvimento
- **`scripts/reset-test-db.ts`**: Reset do banco de dados de teste
- **`scripts/generate-test-data.ts`**: Geração de dados de teste
- **`scripts/validate-manual-tests.ts`**: Validação da documentação

### Helpers de Teste (`tests/tools/helpers/`)

#### `test-utils.ts`
- Utilitários para mocks
- Funções de validação
- Assertions customizadas
- Utilitários de performance

#### `mock-data.ts`
- Dados mock para testes
- Cenários pré-definidos
- Dados para APIs
- Dados de erro

#### `db-helpers.ts`
- Gerenciamento de banco de dados
- Transações de teste
- Backup e restauração
- Verificação de integridade

## 📊 Métricas e Relatórios

### Cobertura de Código
```bash
npm run test:coverage
```
- Relatórios em HTML, JSON e LCOV
- Exclusão de arquivos não críticos
- Foco em funcionalidades críticas

### Performance dos Testes
- Tempo de execução < 30 segundos
- Testes isolados e independentes
- Mocks para dependências externas

## 🔧 Configuração

### Vitest (`vitest.config.ts`)
- Ambiente: `happy-dom`
- Setup: `tests/setup.ts`
- Cobertura: `v8`
- Aliases: `@/*`

### Segurança do Banco de Dados
- **Proteção Automática**: Sistema impede operações destrutivas em produção
- **Validação de Ambiente**: Apenas ambientes `test` e `development` permitidos
- **Detecção de Produção**: Identifica bancos de produção por URL e volume de dados
- **Confirmação Obrigatória**: Requer confirmação manual para operações destrutivas
- **Backup Automático**: Faz backup antes de operações destrutivas (configurável)
- **Limite de Deletions**: Limita número de registros deletados por execução

### Setup Global (`tests/setup.ts`)
- Mocks de browser globals
- Configuração de fetch
- Setup de Request/Response/Headers

## 🚨 Troubleshooting

### Problemas Comuns

#### Testes Falhando
1. Verificar se o banco de dados está limpo
2. Executar `npm run test:db:reset`
3. Verificar mocks e dependências

#### Performance Lenta
1. Verificar se há testes desnecessários
2. Otimizar mocks
3. Usar `npm run test:smoke` para testes rápidos

#### Problemas de Banco de Dados
1. Verificar segurança: `npm run test:safety-check`
2. Verificar variáveis de ambiente
3. Executar migrações: `npx prisma migrate deploy`
4. Resetar banco: `npm run test:db:reset`

#### Problemas de Segurança
1. Verificar se NODE_ENV=test está configurado
2. Verificar se DATABASE_URL aponta para banco de teste
3. Verificar se não há keywords de produção na URL
4. Executar: `npm run test:safety-check`

### Logs e Debug
```bash
# Verbose mode
npm run test -- --reporter=verbose

# Debug específico
DEBUG=vitest npm run test
```

## 📝 Contribuindo

### Adicionando Novos Testes

#### Testes Automatizados
1. Criar arquivo em `tests/automated/critical/` ou `tests/automated/smoke/`
2. Usar padrão: `*.test.ts` ou `*.test.tsx`
3. Importar helpers necessários
4. Seguir padrões de nomenclatura

#### Testes Manuais
1. Atualizar documentação em `tests/manual/`
2. Adicionar casos de teste específicos
3. Incluir critérios de aceitação
4. Documentar cenários de erro

### Padrões de Código
- Usar TypeScript
- Seguir convenções de nomenclatura
- Incluir comentários explicativos
- Manter testes isolados

## 🎯 Critérios de Sucesso

### Métricas de Qualidade
- [ ] Tempo de execução < 30 segundos
- [ ] Manutenção < 1 hora/semana
- [ ] Cobertura crítica > 90%
- [ ] Documentação 100% atualizada
- [ ] Falsos positivos < 5%

### Benefícios Esperados
- [ ] Desenvolvimento mais rápido
- [ ] Manutenção simplificada
- [ ] Documentação clara
- [ ] Foco no que realmente importa
- [ ] Redução de custos

## 📞 Suporte

Para dúvidas sobre testes:
1. Consultar este README
2. Verificar documentação em `tests/manual/`
3. Executar `npm run test:validate-manual`
4. Abrir issue no repositório

---

**Última atualização**: $(date)
**Versão**: 1.0.0 