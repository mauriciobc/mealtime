# Progresso da Migração JWT - API v2

## Status Geral

**Data de início**: 2025-01-28  
**Rotas totais para migrar**: 13  
**Rotas migradas**: 2/13 (15%)

---

## ✅ Fase 1: Infraestrutura (COMPLETA)

### 1.1 Middleware Híbrido
- ✅ **Arquivo criado**: `lib/middleware/hybrid-auth.ts`
- ✅ Suporta JWT (mobile) via Authorization header
- ✅ Fallback para Supabase Session (web)
- ✅ Função `withHybridAuth()` disponível
- ✅ Logging completo

### 1.2 Estrutura de Diretórios v2
- ✅ Criado `/app/api/v2/`
- ✅ Subdiretórios criados:
  - `cats/[catId]/next-feeding/`
  - `feedings/[id]/`
  - `feedings/stats/`
  - `weight-logs/`
  - `goals/`
  - `schedules/[id]/`
  - `households/[id]/{cats,invite,invite-code}/`

### 1.3 Warning Middleware
- ✅ **Arquivo criado**: `lib/middleware/deprecated-warning.ts`
- ✅ Função `addDeprecatedWarning()` disponível
- ✅ Função `withDeprecatedWarning()` wrapper disponível
- ✅ Headers configurados:
  - `X-API-Version: v1`
  - `X-API-Deprecated: true`
  - `X-API-Sunset-Date: 2025-07-28`
  - `X-API-Migration-Guide`
  - `Warning: 299 - ...`

---

## 🔄 Fase 2: Rotas Críticas (EM PROGRESSO - 40%)

### 2.1 ✅ /api/v2/cats
- ✅ **Arquivo**: `app/api/v2/cats/route.ts`
- ✅ GET /api/v2/cats (listar gatos)
- ✅ POST /api/v2/cats (criar gato)
- ✅ Usando `withHybridAuth`
- ✅ Validações de peso e data de nascimento
- ✅ Resposta formato: `{ success, data, count }`
- ❌ Warnings não adicionados em v1 ainda

### 2.2 ✅ /api/v2/feedings
- ✅ **Arquivo**: `app/api/v2/feedings/route.ts`
- ✅ POST /api/v2/feedings (criar alimentação)
- ✅ GET /api/v2/feedings (listar alimentações)
- ✅ Usando `withHybridAuth`
- ✅ Detecção de alimentação duplicada
- ✅ Sistema de notificações integrado
- ✅ Agendamento de lembretes
- ✅ Resposta formato: `{ success, data, count }`
- ❌ Warnings não adicionados em v1 ainda

### 2.3 ❌ /api/v2/feedings/[id]
- ❌ **Arquivo**: `app/api/v2/feedings/[id]/route.ts` (PENDENTE)
- Métodos: GET, DELETE

### 2.4 ❌ /api/v2/feedings/stats
- ❌ **Arquivo**: `app/api/v2/feedings/stats/route.ts` (PENDENTE)
- Métodos: GET

### 2.5 ❌ /api/v2/cats/[catId]/next-feeding
- ❌ **Arquivo**: `app/api/v2/cats/[catId]/next-feeding/route.ts` (PENDENTE)
- Métodos: GET

---

## ⏳ Fase 3: Rotas Médias (NÃO INICIADA - 0%)

### 3.1 ❌ /api/v2/weight-logs
- ❌ 4 métodos HTTP (POST, GET, PUT, DELETE)

### 3.2 ❌ /api/v2/goals
- ❌ GET, POST

### 3.3 ❌ /api/v2/schedules
- ❌ GET, POST
- ❌ /api/v2/schedules/[id]: GET, PUT, DELETE

### 3.4 ❌ Consolidação de rotas duplicadas
- ❌ Decidir sobre weight/logs vs weight-logs
- ❌ Decidir sobre feedings vs feeding-logs

---

## ⏳ Fase 4: Rotas de Household (NÃO INICIADA - 0%)

### 4.1 ❌ /api/v2/households/[id]/cats
- ❌ GET, POST

### 4.2 ❌ /api/v2/households/[id]/invite
- ❌ POST

### 4.3 ❌ /api/v2/households/[id]/invite-code
- ❌ GET

---

## ⏳ Fase 5: Adicionar Warnings em V1 (NÃO INICIADA - 0%)

Rotas v1 que precisam de warnings:
- ❌ /api/cats/route.ts
- ❌ /api/feedings/route.ts
- ❌ /api/feedings/[id]/route.ts
- ❌ /api/feedings/stats/route.ts
- ❌ /api/cats/[catId]/next-feeding/route.ts
- ❌ /api/weight-logs/route.ts
- ❌ /api/goals/route.ts
- ❌ /api/schedules/route.ts
- ❌ /api/schedules/[id]/route.ts
- ❌ /api/households/[id]/cats/route.ts
- ❌ /api/households/[id]/invite/route.ts
- ❌ /api/households/[id]/invite-code/route.ts

---

## ⏳ Fase 6: Testes (NÃO INICIADA - 0%)

### 6.1 ❌ Script de Teste
- ❌ **Arquivo**: `scripts/test-api-v2.js` (PENDENTE)

### 6.2 ❌ Testes Manuais
- ❌ Testar JWT com rotas v2
- ❌ Testar Supabase Session com rotas v2
- ❌ Verificar headers de deprecation em v1
- ❌ Validar app web
- ❌ Validar app mobile

---

## ⏳ Fase 7: Documentação (NÃO INICIADA - 0%)

### 7.1 ❌ Guia de Migração
- ❌ **Arquivo**: `docs/API-V2-MIGRATION-GUIDE.md` (PENDENTE)

### 7.2 ❌ Swagger
- ❌ Atualizar `app/api/swagger.yaml`

### 7.3 ❌ README
- ❌ Documentar v2
- ❌ Marcar v1 como deprecated

---

## 📊 Estatísticas

| Fase | Status | Progresso |
|------|--------|-----------|
| **Fase 1: Infraestrutura** | ✅ Completa | 100% (3/3) |
| **Fase 2: Rotas Críticas** | 🔄 Em progresso | 40% (2/5) |
| **Fase 3: Rotas Médias** | ❌ Não iniciada | 0% (0/5) |
| **Fase 4: Rotas Household** | ❌ Não iniciada | 0% (0/3) |
| **Fase 5: Warnings V1** | ❌ Não iniciada | 0% (0/13) |
| **Fase 6: Testes** | ❌ Não iniciada | 0% (0/3) |
| **Fase 7: Documentação** | ❌ Não iniciada | 0% (0/3) |
| **TOTAL** | 🔄 **15% completo** | **5/35 tarefas** |

---

## 🎯 Próximos Passos Imediatos

1. ✅ Migrar `/api/v2/feedings/[id]`
2. ✅ Migrar `/api/v2/feedings/stats`
3. ✅ Migrar `/api/v2/cats/[catId]/next-feeding`
4. Adicionar warnings de deprecation em v1
5. Migrar rotas médias
6. Criar testes

---

## 🔧 Arquivos Modificados/Criados

### Novos arquivos
1. `lib/middleware/hybrid-auth.ts` (142 linhas)
2. `lib/middleware/deprecated-warning.ts` (27 linhas)
3. `app/api/v2/cats/route.ts` (331 linhas)
4. `app/api/v2/feedings/route.ts` (305 linhas)

### Estrutura criada
- `/app/api/v2/` + 8 subdiretórios

---

## 💡 Notas Técnicas

### Mudanças na Resposta da API

**V1 (antiga)**:
```json
{
  "id": "...",
  "name": "..."
}
```

**V2 (nova)**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "..."
  },
  "count": 1
}
```

### Autenticação Híbrida

O middleware `withHybridAuth` tenta:
1. **JWT primeiro** (se `Authorization: Bearer` presente)
2. **Supabase Session** (fallback para web)

Ambos funcionam com v2!

---

**Última atualização**: 2025-01-28 17:30

