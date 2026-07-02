# Anexo D — Migração API v1 → v2
## Foundational Audit MealTime — Julho 2026

---

## Resumo Executivo

O MealTime opera com **duas gerações de API em paralelo**: ~41 rotas v1 em `app/api/*` e ~35 rotas v2 em `app/api/v2/*`. A v2 usa `withHybridAuth` consistentemente; a v1 usa padrões legados (`X-User-ID`, `getUser()` ad-hoc, ou sem auth). Existem **10 arquivos `.bak`** em rotas v1 e middleware `deprecated-warning` já preparado para transição.

**Postura:** Migração ~60% completa no backend | Consumidores frontend ~40% ainda em v1

---

## Inventário de Rotas

### Contagem (76 arquivos route.ts)

| Categoria | Quantidade | Auth Pattern |
|-----------|------------|--------------|
| v2 (`app/api/v2/*`) | 35 | `withHybridAuth` (33 rotas) + swagger |
| v1 core (`app/api/*` exceto auth/mobile) | 34 | Misto: X-User-ID, getUser ad-hoc, sem auth |
| Auth (`app/api/auth/*`) | 3 | Supabase OAuth + mobile JWT |
| Mobile (`app/api/mobile/*`) | 1 | Mobile-specific |
| Debug (`app/api/test-prisma`) | 1 | **Sem auth** |
| Swagger v1 | 1 | Público |

### Rotas v2 com withHybridAuth (33)

`cats`, `cats/[catId]`, `cats/[catId]/next-feeding`, `feedings`, `feedings/[id]`, `feedings/batch`, `feedings/cats`, `feedings/last/[catId]`, `feedings/stats`, `goals`, `households`, `households/[id]`, `households/[id]/cats`, `households/[id]/feeding-logs`, `households/[id]/invite`, `households/[id]/invite-code`, `households/[id]/members`, `households/[id]/members/[userId]`, `households/join`, `households/invites/[notificationId]/accept`, `households/invites/[notificationId]/reject`, `notifications`, `notifications/[id]`, `notifications/bulk`, `profile/[idOrUsername]`, `scheduled-notifications`, `scheduled-notifications/deliver`, `schedules`, `schedules/[id]`, `statistics`, `upload`, `users/[id]`, `users/[id]/preferences`, `weight-logs`

### Rotas v1 com X-User-ID (11 — INSEGURAS)

`feedings`, `feedings/[id]`, `feedings/stats`, `goals`, `schedules`, `weight/logs`, `weight-logs`, `cats/[catId]/next-feeding`, `households/[id]/cats`, `households/[id]/invite`, `households/[id]/invite-code`

### Rotas v1 com getUser() ad-hoc (parcialmente seguras)

`households`, `households/[id]`, `households/join`, `households/[id]/members`, `cats`, `cats/[catId]`, `upload`, `statistics`, `scheduled-notifications`, `monitoring/errors`, `users/[id]`, etc.

### Rotas v1 SEM autenticação

| Rota | Risco |
|------|-------|
| `app/api/scheduled-notifications/deliver/route.ts` | CRITICAL |
| `app/api/test-prisma/route.ts` | HIGH |
| `app/api/swagger/route.ts` | LOW (doc) |
| `app/api/feeding-logs/route.ts` | Verificar |

### Arquivos .bak (10 — deletar)

```
app/api/users/[id]/route.ts.bak
app/api/households/[id]/route.ts.bak
app/api/households/[id]/cats/route.ts.bak
app/api/schedules/[id]/route.ts.bak
app/api/feedings/last/[catId]/route.ts.bak
app/api/profile/[idOrUsername]/route.ts.bak
app/api/households/[id]/members/route.ts.bak
app/api/households/[id]/feeding-logs/route.ts.bak
app/api/households/[id]/invite-code/route.ts.bak
app/api/households/[id]/invite/route.ts.bak
```

---

## Paridade v1 vs v2

| Domínio | v1 | v2 | Paridade |
|---------|----|----|----------|
| Cats | ✅ | ✅ | v2 superior (auth) |
| Feedings | ✅ | ✅ | v2 + batch, stats |
| Households | ✅ | ✅ | v2 + invites flow |
| Notifications | ❌ Removido? | ✅ | v1 notifications routes ausentes no filesystem |
| Schedules | ✅ | ✅ | Paridade |
| Weight/Goals | ✅ | ✅ | Paridade |
| Upload | ✅ | ✅ | v2 com validação imagem |
| Statistics | ✅ | ✅ | Paridade |
| Profile | ✅ | ✅ | Paridade |
| Swagger | ✅ | ✅ | Duplicado |
| Scheduled deliver | ✅ (sem auth) | ✅ (cron secret) | v2 superior |

> **Nota:** `.next/types/validator.ts` referencia rotas `app/api/notifications/*` que não existem mais no filesystem — artefato stale de build anterior.

---

## Consumidores Frontend por Versão

### Ainda em v1 (migrar em R3)

| Arquivo | Endpoints v1 |
|---------|--------------|
| `lib/services/apiService.ts` | `/api/cats/*`, `/api/feedings`, `/api/households/*` |
| `lib/context/FeedingContext.v2.tsx` | `/api/feedings` |
| `app/cats/new/NewCatPageContent.tsx` | `POST /api/cats` |
| `app/settings/page.tsx` | `/api/households/join`, `/api/households` |
| `app/join/JoinPageContent.tsx` | `POST /api/households/join` |
| `app/households/HouseholdsPageContent.tsx` | `DELETE /api/households/{id}` |

### Já em v2

| Arquivo | Endpoints v2 |
|---------|--------------|
| `components/feeding/new-feeding-sheet.tsx` | `/api/v2/feedings` |
| `components/notifications/household-invite-notification.tsx` | invites v2 |
| `lib/services/supabase-notification-service.ts` | `/api/v2/notifications` |
| `tests/helpers/api-helper.ts` | Múltiplos v2 |
| `tests/api-gender.spec.ts` | `/api/v2/cats` |

---

## Prisma 7 Assessment

| Check | Status | Evidência |
|-------|--------|-----------|
| Driver adapter `@prisma/adapter-pg` | ✅ | `lib/prisma.ts:3-24` |
| `prisma.config.ts` | ✅ | Referenciado no generate |
| Prisma Client 7.2.0 | ✅ | `package.json` |
| Schema com multi-schema | ✅ | `schemas = ["public"]` |
| RLS comments no schema | ⚠️ | RLS Supabase não protege queries Prisma diretas |
| Migrations alinhadas | ⚠️ | Campo `gender` no schema mas erros TS em build anterior sugerem drift pontual |

---

## Findings

### [CRITICAL] API v1 com autenticação spoofável

- **Módulo:** API v1 Security
- **Arquivos:** 11 rotas com `X-User-ID` (ver lista acima)
- **Esperado:** Deprecation imediata
- **Encontrado:** Rotas ativas em produção
- **Risco:** IDOR total
- **Correção proposta:** Return 410 Gone em v1; redirect docs para v2
- **Esforço:** M
- **Fase roadmap:** R1 + R3

### [HIGH] Duplicação de rotas aumenta drift

- **Módulo:** API Architecture
- **Encontrado:** Mesma lógica em v1 e v2 com divergências (gender parsing, food_type, includes)
- **Risco:** Bug corrigido em v2 mas não em v1
- **Correção proposta:** Feature freeze v1; shared repository layer
- **Esforço:** L
- **Fase roadmap:** R3

### [HIGH] deprecated-warning middleware existe mas v1 ainda ativo

- **Módulo:** Deprecation
- **Arquivos:** `lib/middleware/deprecated-warning.ts`, rotas v1 que importam `addDeprecatedWarning`
- **Encontrado:** Headers de deprecation em algumas rotas v1
- **Risco:** Clientes ignoram warnings
- **Correção proposta:** Sunset date + 410 após migração frontend
- **Esforço:** S
- **Fase roadmap:** R3

### [MEDIUM] Swagger duplicado v1 e v2

- **Módulo:** API Documentation
- **Arquivos:** `app/api/swagger/route.ts`, `app/api/v2/swagger/route.ts`
- **Encontrado:** Dois endpoints swagger
- **Risco:** Docs desatualizados (ver `docs/analysis/ANALISE-SWAGGER-VS-REALIDADE.md`)
- **Correção proposta:** Swagger único v2
- **Esforço:** M
- **Fase roadmap:** R3

### [MEDIUM] Mobile API separada (`app/api/mobile/cats`)

- **Módulo:** Mobile
- **Arquivos:** `app/api/mobile/cats/route.ts`
- **Encontrado:** Rota mobile fora de v2
- **Risco:** Terceira superfície de API na migração agressiva
- **Correção proposta:** Consolidar em v2 com hybrid auth
- **Esforço:** M
- **Fase roadmap:** R3

### [LOW] 10 arquivos .bak em rotas v1

- **Esforço:** S | **Fase:** R2

---

## Plano de Migração Agressivo (R3)

### Semana 1
1. Inventariar todos os `fetch('/api/` no codebase
2. Criar mapping v1→v2 endpoint por endpoint
3. Migrar `lib/services/apiService.ts` para v2

### Semana 2
4. Migrar contexts (Cats, Feeding, Household) para v2
5. Migrar pages (settings, join, cats/new)
6. Atualizar E2E helpers

### Semana 3
7. Return 410 em rotas v1 (exceto auth callback)
8. Deletar arquivos v1 + .bak
9. Unificar Swagger
10. Remover `deprecated-warning` middleware

### Critérios de aceite R3
- [ ] Zero `fetch` para `/api/` sem prefixo `v2` (exceto auth)
- [ ] E2E verde contra staging
- [ ] Swagger v2 reflete 100% rotas ativas
- [ ] Nenhuma rota v1 retorna 200

---

*Gerado em: 2 de julho de 2026 | Auditoria foundational MealTime*
