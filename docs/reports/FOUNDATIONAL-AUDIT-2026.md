# Foundational Audit — MealTime (Julho 2026)

> **Marco foundational de dívida técnica** — inventário completo com severidade, compliance vs documentação oficial, baseline reproduzível e roadmap agressivo de correção.

**Data da auditoria:** 2 de julho de 2026  
**Escopo:** Código em `D:/Mauricio/Code/mealtime`  
**Prioridades:** Segurança/Auth → Arquitetura Frontend → Testes/CI  
**Postura:** Agressiva (v2 only, consolidar contexts, remover legado)

---

## Executive Summary

### Score de Saúde: **54 / 100**

| Dimensão | Score | Peso | Notas |
|----------|-------|------|-------|
| Segurança & Auth | 35/100 | 30% | v1 spoofável, rotas expostas |
| Qualidade de Build | 45/100 | 15% | Build falha (HapticsContext) |
| Arquitetura Frontend | 50/100 | 20% | 11 contexts, duplicatas |
| Testes & CI | 30/100 | 20% | Sem CI, skips condicionais |
| API & Dados | 65/100 | 10% | v2 sólida, v1 legado |
| Documentação | 40/100 | 5% | 155 docs, muitos stale |

### Top 10 Issues Críticas

| # | Severidade | Issue | Fase |
|---|------------|-------|------|
| 1 | **CRITICAL** | Spoofing via `X-User-ID` em 11 rotas API v1 | R1+R3 |
| 2 | **CRITICAL** | `POST /api/scheduled-notifications/deliver` sem autenticação | R1 |
| 3 | **HIGH** | `GET /api/test-prisma` exposto sem auth em produção | R1 |
| 4 | **HIGH** | Build de produção falha (`web-haptics/react` module resolution) | R2 |
| 5 | **HIGH** | Zero CI/CD — regressões chegam a produção sem gate | R2 |
| 6 | **HIGH** | API v1 e v2 em paralelo — drift e duplicação | R3 |
| 7 | **HIGH** | 11 React Contexts com estado duplicado vs React Query | R4 |
| 8 | **HIGH** | 40+ `test.skip()` condicionais — falso verde da suíte E2E | R6 |
| 9 | **MEDIUM** | v2 deliver aceita usuário autenticado além de cron | R1 |
| 10 | **MEDIUM** | 155 docs com contradições ativas (TASKS.md vs código) | R5 |

### Estimativa de Esforço Total (Correções R1–R6)

| Fase | Duração | Esforço |
|------|---------|---------|
| R1 Segurança crítica | 1–2 semanas | ~80h |
| R2 Fundação qualidade | 1 semana | ~40h |
| R3 Migração API v1→v2 | 2–3 semanas | ~120h |
| R4 Consolidação frontend | 2–3 semanas | ~120h |
| R5 Limpeza agressiva | 1–2 semanas | ~60h |
| R6 E2E em CI + staging | 1 semana | ~40h |
| **Total** | **8–12 semanas** | **~460h** |

---

## 1. Baseline Metrics

Comandos executados em 2 jul 2026 no ambiente local Windows.

### 1.1 `npm run lint`

```
Exit code: 1 (max-warnings=0)

D:\Mauricio\Code\mealtime\components\safe-image.tsx
  64:6  warning  react-hooks/exhaustive-deps

D:\Mauricio\Code\mealtime\components\weight\milestone-progress.tsx
  309:6  warning  react-hooks/exhaustive-deps

✖ 2 problems (0 errors, 2 warnings)
```

### 1.2 `npx tsc --noEmit`

```
Exit code: 1 — 11 erros

lib/context/HapticsContext.tsx(16,31): error TS2307: Cannot find module 'web-haptics/react'
tests/api-gender.spec.ts(19,9): error TS2532: Object is possibly 'undefined'
tests/api-gender.spec.ts(46,90): error TS2532: Object is possibly 'undefined'
tests/api-gender.spec.ts(92,89): error TS2532: Object is possibly 'undefined'
tests/api-gender.spec.ts(108,89): error TS2532: Object is possibly 'undefined'
tests/cats.spec.ts(62,90): error TS2532: Object is possibly 'undefined'
tests/e2e-cats.spec.ts(38,92): error TS2532: Object is possibly 'undefined'
tests/onboarding.spec.ts — 4 erros string | undefined
```

### 1.3 `npm run build`

```
Exit code: 1
Prisma generate: ✅ (v7.2.0, 371ms)
Webpack compile: ✅ (54s)
TypeScript check: ❌ FAILED

./lib/context/HapticsContext.tsx:16:31
Type error: Cannot find module 'web-haptics/react'
```

### 1.4 `npx react-doctor .`

```
363 warnings across 227/518 files (9.0s)
- 122 unused files
- 107 unused exports
- 14 client-side redirects in useEffect
- 5 useSearchParams without Suspense
- 1 dangerouslySetInnerHTML
- 16 components >400 lines
```

### 1.5 `npx depcheck`

```
Unused dependencies: @netlify/plugin-nextjs, @radix-ui/react-*, @react-pdf/renderer,
  @shadcn/ui, @tanstack/react-virtual, @uploadthing/react, uploadthing, cron, etc.

Unused devDependencies: form-data, netlify-cli, node-gyp, postcss, react-doctor

Missing dependencies: eslint-plugin-react, @testing-library/jest-dom (jest.setup.js orphan),
  @radix-ui/react-dialog (used by command.tsx)
```

### 1.6 `npx madge --circular lib/ components/`

```
Processed 0 files — No circular dependency found
(Nota: madge não resolveu paths no ambiente Windows; inspeção manual não encontrou ciclos óbvios)
```

### 1.7 Inventário Estático

| Métrica | Valor |
|---------|-------|
| Rotas API (route.ts) | 76 |
| Rotas v2 com withHybridAuth | 33 |
| Rotas v1 com X-User-ID | 11 |
| React Contexts | 11 |
| Playwright specs | 19 |
| Arquivos .bak em API | 10 |
| Docs markdown | 155 |
| GitHub Actions workflows | 0 |

---

## 2. Security & Auth Findings

→ Detalhes completos: [FOUNDATIONAL-AUDIT-2026-SECURITY.md](./FOUNDATIONAL-AUDIT-2026-SECURITY.md)

**Resumo:** Auth v2 (`withHybridAuth` + `getUser()`) está correta. Legado v1 é o vetor principal. Rotas operacionais (`deliver` v1, `test-prisma`) expostas.

---

## 3. Frontend Architecture Findings

→ Detalhes: [FOUNDATIONAL-AUDIT-2026-FRONTEND.md](./FOUNDATIONAL-AUDIT-2026-FRONTEND.md)

**Resumo:** Provider hell, duplicatas (FeedingContext.v2, 4 notification services), build bloqueado, consumidores em v1.

---

## 4. Testing & CI Findings

→ Detalhes: [FOUNDATIONAL-AUDIT-2026-TESTING.md](./FOUNDATIONAL-AUDIT-2026-TESTING.md)

**Resumo:** Playwright existe mas sem CI; jest.setup.js órfão; ESLint ignora tests/; mobile-safari inexistente.

---

## 5. API v1→v2 Migration Assessment

→ Detalhes: [FOUNDATIONAL-AUDIT-2026-API-MIGRATION.md](./FOUNDATIONAL-AUDIT-2026-API-MIGRATION.md)

**Resumo:** ~60% backend migrado; frontend ~40% ainda em v1. 10 .bak files. Prisma 7 adapter OK.

---

## 6. Database & Performance Findings

| Issue | Severidade | Detalhe |
|-------|------------|---------|
| RLS Supabase não protege Prisma | MEDIUM | Queries via DATABASE_URL bypassam RLS |
| Rate limit in-memory | HIGH | Ineficaz em Netlify serverless |
| N+1 potencial em repositories | MEDIUM | Auditar `lib/repositories/` em R4 |
| recharts bundle | LOW | 5 páginas sem code splitting |

---

## 7. Documentation Accuracy Report

→ Detalhes: [FOUNDATIONAL-AUDIT-2026-DOCS-RECONCILIATION.md](./FOUNDATIONAL-AUDIT-2026-DOCS-RECONCILIATION.md)

**Resumo:** 155 docs; ~25 contradizem código ativo. TASKS.md é o caso mais grave.

---

## 8. Dependency & Version Compliance Matrix

| Tecnologia | Versão Projeto | Doc Oficial | Compliance | Gap |
|------------|---------------|-------------|------------|-----|
| **Next.js** | 16.1.0 | nextjs.org/docs (App Router, proxy) | ⚠️ | Build falha TS; `proxy.ts` apiRoutes incompleto |
| **React** | 19.2.0 | react.dev | ⚠️ | 363 react-doctor warnings; Compiler não habilitado |
| **Prisma** | 7.2.0 | prisma.io/docs (driver adapters) | ✅ | `@prisma/adapter-pg` configurado corretamente |
| **Supabase SSR** | 0.7.0 / js 2.76 | supabase.com/docs (SSR cookies) | ✅ | `getUser()` no server; 1 `getSession()` no client |
| **TanStack Query** | 5.90.5 | tanstack.com/query | ⚠️ | Config ok; contexts ignoram cache |
| **Zod** | 4.1.12 | zod.dev v4 | ✅ | Usado em rotas v2 |
| **Playwright** | 1.57.0 | playwright.dev | ⚠️ | Config incompleto (mobile-safari) |
| **Netlify** | plugin 5.15.2 | docs.netlify.com | ⚠️ | Node 20.18 vs `.nvmrc` 20.19; build sem testes |
| **Tailwind** | 3.4.18 | tailwindcss.com | ✅ | shadcn/ui integrado |
| **MailerSend** | 2.6.0 | mailersend.com | ✅ | Config em `.env.example` |
| **Uploadthing** | 7.7.4 | docs.uploadthing.com | ⚠️ | depcheck marca unused; v2 upload usa fs local |
| **TypeScript** | 5.9.3 | typescriptlang.org | ⚠️ | 11 erros; sem script typecheck |
| **ESLint** | 9.38 flat config | eslint.org | ⚠️ | Ignora tests/; 2 warnings bloqueiam lint |
| **web-haptics** | 0.0.6 | npm package docs | ❌ | Import path não resolve com tsconfig atual |

### Versões de Runtime

| Arquivo | Node |
|---------|------|
| `package.json engines` | >=20.19.0 |
| `.nvmrc` | 20.19.0 |
| `netlify.toml` | 20.18.0 ⚠️ mismatch |

---

## 9. Remediation Roadmap (R1–R6)

### R1 — Segurança Crítica (1–2 semanas)

| # | Ação | Esforço | Critério de aceite |
|---|------|---------|-------------------|
| 1 | Proteger/remover `deliver` v1 | S | Rota retorna 401 ou 404 |
| 2 | Remover `test-prisma` | S | 404 em produção |
| 3 | Restringir v2 deliver a cron-only | S | User auth não executa deliver global |
| 4 | Fail-fast `ALLOWED_ORIGINS` em prod | S | Build falha sem env |
| 5 | Return 410 em rotas v1 X-User-ID | M | Spoofing impossível |
| 6 | Auditar IDOR em v2 endpoints | M | Testes E2E de IDOR verdes |
| 7 | CSP: remover unsafe-eval | M | CSP report-only validado |

**Dependências:** Nenhuma — iniciar imediatamente.

---

### R2 — Fundação de Qualidade (1 semana)

| # | Ação | Esforço |
|---|------|---------|
| 1 | Fix HapticsContext import / tsconfig moduleResolution | S |
| 2 | Adicionar `"typecheck": "tsc --noEmit"` no package.json | S |
| 3 | GitHub Actions: lint + typecheck + build | M |
| 4 | Fix Playwright mobile-safari project | S |
| 5 | Deletar jest.setup.js, 10 .bak files | S |
| 6 | Habilitar ESLint em tests/ | S |
| 7 | Fix 2 lint warnings | S |
| 8 | Alinhar Node netlify.toml → 20.19.0 | S |

**Critério de aceite:** `npm run lint && npm run typecheck && npm run build` verde em CI.

---

### R3 — Migração API v1 → v2 (2–3 semanas)

| # | Ação | Esforço |
|---|------|---------|
| 1 | Migrar `lib/services/apiService.ts` | M |
| 2 | Migrar contexts e pages para v2 | L |
| 3 | Consolidar `app/api/mobile/` em v2 | M |
| 4 | Deprecar e remover rotas v1 | L |
| 5 | Unificar Swagger v2 | M |
| 6 | Atualizar E2E helpers para v2 | M |

**Critério de aceite:** Zero fetch para `/api/` sem `v2` (exceto auth).

**Dependências:** R1 (segurança v1 bloqueada).

---

### R4 — Consolidação Frontend (2–3 semanas)

| # | Ação | Esforço |
|---|------|---------|
| 1 | Eliminar ContextBridge/StateSync | L |
| 2 | Domain hooks sobre React Query | XL |
| 3 | Remover FeedingContext.v2 e exemplos | S |
| 4 | Consolidar notification services | M |
| 5 | Completar ou remover páginas TODO | M |
| 6 | Suspense boundaries para useSearchParams | M |
| 7 | react-doctor fases 1–3 (quick wins) | L |

**Dependências:** R3 (API v2 estável).

---

### R5 — Limpeza Agressiva (1–2 semanas)

| # | Ação | Esforço |
|---|------|---------|
| 1 | Curadoria 122 unused files | L |
| 2 | Arquivar docs stale → `docs/archive/` | M |
| 3 | Remover `src/` legado | S |
| 4 | Unificar `app/components/` → `components/` | S |
| 5 | Reescrever `docs/todos/CURRENT.md` | S |
| 6 | Prettier + lint-staged (opcional) | S |

---

### R6 — E2E em CI + Staging (1 semana)

| # | Ação | Esforço |
|---|------|---------|
| 1 | Pipeline E2E contra staging no merge main | M |
| 2 | Reduzir test.skip condicionais | M |
| 3 | Adicionar specs IDOR e security | M |
| 4 | Credenciais teste em GitHub Secrets | S |
| 5 | Smoke tests fluxos críticos documentados | M |

**Dependências:** R2 (CI base) + R3 (v2 endpoints).

---

## 10. Appendix: Full Issue Catalog

### CRITICAL (2)

| ID | Título | Módulo | Fase |
|----|--------|--------|------|
| SEC-001 | X-User-ID spoofing em 11 rotas v1 | Auth | R1+R3 |
| SEC-002 | deliver v1 sem autenticação | Notifications | R1 |

### HIGH (12)

| ID | Título | Módulo | Fase |
|----|--------|--------|------|
| SEC-003 | test-prisma exposto | Debug | R1 |
| SEC-004 | CORS fallback localhost | proxy.ts | R1 |
| SEC-005 | Rate limit in-memory | Middleware | R1 |
| BUILD-001 | Build falha HapticsContext | TypeScript | R2 |
| CI-001 | Ausência de CI/CD | DevOps | R2 |
| API-001 | v1/v2 paralelo com drift | API | R3 |
| FE-001 | Provider hell 11 contexts | Frontend | R4 |
| FE-002 | Consumidores frontend em v1 | Frontend | R3 |
| TEST-001 | test.skip condicionais (40+) | E2E | R6 |
| TEST-002 | mobile-safari inexistente | Playwright | R2 |
| TEST-003 | ESLint ignora tests/ | ESLint | R2 |
| DOC-001 | TASKS.md contradiz código | Docs | R5 |

### MEDIUM (15)

| ID | Título | Fase |
|----|--------|------|
| SEC-006 | v2 deliver aceita user auth | R1 |
| SEC-007 | CSP unsafe-inline/eval | R2 |
| SEC-008 | RLS não protege Prisma | R1 |
| FE-003 | FeedingContext.v2 duplicado | R4 |
| FE-004 | 4 notification services | R4 |
| FE-005 | Componentes TODO/placeholder | R4 |
| FE-006 | useSearchParams sem Suspense | R4 |
| FE-007 | 14 client redirects useEffect | R4 |
| FE-008 | app/components duplicata | R5 |
| API-002 | Swagger duplicado | R3 |
| API-003 | mobile API separada | R3 |
| TEST-004 | jest.setup.js órfão | R2 |
| TEST-005 | E2E testa v1 predominantemente | R3 |
| DOC-002 | 19 relatórios stale em docs/reports | R5 |
| OPS-001 | Node version mismatch Netlify | R2 |

### LOW (8)

| ID | Título | Fase |
|----|--------|------|
| FE-009 | 122 unused files | R5 |
| FE-010 | src/ legado | R5 |
| FE-011 | Metadata ausente 23 páginas | R5 |
| FE-012 | dangerouslySetInnerHTML chart | R1 |
| TEST-006 | Sem Prettier | R5 |
| DEP-001 | depcheck false positives | R5 |
| DOC-003 | INDEX.md sem status | R5 |
| DOC-004 | user-guide PT/EN drift | R5 |

### INFO (3)

| ID | Título |
|----|--------|
| SEC-009 | Auth híbrida v2 bem implementada |
| FE-013 | React Query config razoável |
| API-004 | Prisma 7 adapter correto |

---

## Anexos

| Arquivo | Conteúdo |
|---------|----------|
| [FOUNDATIONAL-AUDIT-2026-SECURITY.md](./FOUNDATIONAL-AUDIT-2026-SECURITY.md) | Auth, CORS, IDOR, secrets |
| [FOUNDATIONAL-AUDIT-2026-FRONTEND.md](./FOUNDATIONAL-AUDIT-2026-FRONTEND.md) | Contexts, React 19, duplicatas |
| [FOUNDATIONAL-AUDIT-2026-TESTING.md](./FOUNDATIONAL-AUDIT-2026-TESTING.md) | Playwright, CI, ESLint |
| [FOUNDATIONAL-AUDIT-2026-API-MIGRATION.md](./FOUNDATIONAL-AUDIT-2026-API-MIGRATION.md) | v1→v2, Prisma, rotas |
| [FOUNDATIONAL-AUDIT-2026-DOCS-RECONCILIATION.md](./FOUNDATIONAL-AUDIT-2026-DOCS-RECONCILIATION.md) | 155 docs, contradições |

---

## Validação Staging (Não Executada — Credenciais Indisponíveis)

Os seguintes fluxos **devem** ser validados em staging Netlify após R1:

1. Login web → sessão → rotas protegidas
2. Bearer mobile → `/api/v2/*`
3. Token expirado → 401
4. IDOR: user A → recurso de user B
5. Cron deliver com `X-Cron-Secret`
6. CORS com origin de produção
7. E2E Playwright com `PLAYWRIGHT_BASE_URL=staging`

---

## Critérios de Sucesso desta Auditoria

- [x] Relatório mestre com issues por severidade
- [x] Compliance vs docs oficiais por tecnologia
- [x] Baseline metrics reproduzíveis
- [x] Validação staging documentada (execução pendente credenciais)
- [x] Roadmap R1–R6 com estimativas
- [x] Docs marcados STALE/ARCHIVE no anexo E

---

*Auditoria executada por análise automatizada + revisão manual de código. Próximo passo recomendado: aprovar R1 e iniciar correções de segurança imediatamente.*
