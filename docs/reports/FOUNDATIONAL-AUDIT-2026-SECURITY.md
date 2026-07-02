# Anexo A — Segurança e Autenticação
## Foundational Audit MealTime — Julho 2026

---

## Resumo Executivo

A camada de autenticação **v2** (`withHybridAuth`, `getUser()`) está alinhada com as práticas recomendadas do Supabase SSR. Porém, **rotas v1 legadas** ainda usam o header `X-User-ID` sem validação criptográfica — vetor crítico de IDOR/spoofing. Duas rotas operacionais (`deliver` v1, `test-prisma`) estão expostas sem proteção adequada.

**Postura geral:** CRÍTICA em legado v1 | ADEQUADA em v2

---

## Inventário de Arquivos Auditados

| Arquivo | Função |
|---------|--------|
| `lib/auth.ts` | `getAuthenticatedUser`, `withAuth`, `requireAuth` |
| `lib/middleware/hybrid-auth.ts` | `validateHybridAuth`, `withHybridAuth` |
| `lib/middleware/mobile-auth.ts` | JWT Bearer via `getUser(token)` |
| `utils/supabase/middleware.ts` | Refresh de sessão no middleware |
| `utils/supabase/admin.ts` | Service role (server-only) |
| `proxy.ts` | CORS, métricas, auth de páginas |
| `lib/middleware/rate-limit.ts` | Rate limit in-memory |
| `lib/utils/security-headers.ts` | CSP, HSTS, X-Frame-Options |
| `app/api/scheduled-notifications/deliver/route.ts` | Cron v1 **sem auth** |
| `app/api/v2/scheduled-notifications/deliver/route.ts` | Cron v2 com `X-Cron-Secret` |
| `app/api/test-prisma/route.ts` | Debug **sem auth** |

---

## Compliance vs Documentação Oficial

### Supabase SSR (v0.7 / @supabase/supabase-js 2.76)

| Requisito oficial | Status | Evidência |
|-------------------|--------|-----------|
| Usar `getUser()` no server, não `getSession()` | ✅ Maioria | `hybrid-auth.ts:46`, `lib/auth.ts:58`, `mobile-auth.ts:61` |
| `getSession()` no client para tokens | ⚠️ 1 ocorrência | `lib/services/supabase-notification-service.ts:215` — aceitável no client, mas preferir `getUser()` para refresh |
| Service role nunca no client | ✅ | `admin.ts` usa apenas `SUPABASE_SERVICE_ROLE_KEY` server-side |
| Cookie handling com `createServerClient` | ✅ | `utils/supabase/middleware.ts`, `proxy.ts` |

### Next.js 16 Middleware (`proxy.ts`)

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| Lista de rotas API protegida completa | ❌ | `apiRoutes` em `proxy.ts:36-44` omite `/api/v2/*`, `/api/feedings`, `/api/auth`, `/api/mobile` |
| CORS restrito em produção | ⚠️ | Default `ALLOWED_ORIGINS` = apenas localhost se env ausente (`proxy.ts:13-33`) |
| Headers de segurança | ⚠️ | CSP permite `'unsafe-inline'` e `'unsafe-eval'` (`security-headers.ts:27`) |

---

## Findings

### [CRITICAL] Spoofing de identidade via header X-User-ID em rotas v1

- **Módulo:** API v1 Auth
- **Arquivos:** `app/api/feedings/[id]/route.ts`, `app/api/feedings/route.ts`, `app/api/households/[id]/cats/route.ts`, `app/api/goals/route.ts`, `app/api/schedules/route.ts`, `app/api/weight/logs/route.ts`, `app/api/weight-logs/route.ts`, `app/api/cats/[catId]/next-feeding/route.ts`, `app/api/households/[id]/invite/route.ts`, `app/api/households/[id]/invite-code/route.ts`, `app/api/feedings/stats/route.ts` (11 rotas)
- **Esperado (docs oficiais):** Autenticação via sessão Supabase (`getUser()`) ou JWT validado — nunca confiar em header customizado do cliente
- **Encontrado:** Rotas v1 leem `X-User-ID` de `headers()` e usam como `authUserId` sem verificar sessão/JWT
- **Risco:** Qualquer cliente pode forjar o header e acessar/modificar dados de outro usuário (IDOR horizontal)
- **Correção proposta:** Migrar consumidores para v2 com `withHybridAuth`; deprecar v1 imediatamente; bloquear `X-User-ID` no middleware
- **Esforço:** L
- **Fase roadmap:** R1 + R3

### [CRITICAL] Rota de entrega de notificações v1 sem autenticação

- **Módulo:** Scheduled Notifications
- **Arquivos:** `app/api/scheduled-notifications/deliver/route.ts`
- **Esperado:** Proteção via `CRON_SECRET`, Netlify scheduled function identity, ou IP allowlist
- **Encontrado:** `POST` público com TODO explícito na linha 8; qualquer ator pode disparar entrega em massa e criar notificações de warning
- **Risco:** Abuso de recursos, spam de notificações, manipulação de estado `delivered`
- **Correção proposta:** Remover rota v1; usar apenas v2 que valida `X-Cron-Secret` (`app/api/v2/scheduled-notifications/deliver/route.ts:273-279`)
- **Esforço:** S
- **Fase roadmap:** R1

### [HIGH] Rota de debug test-prisma exposta em produção

- **Módulo:** Debug / Ops
- **Arquivos:** `app/api/test-prisma/route.ts`
- **Esperado:** Rota ausente em produção ou protegida por auth + env flag
- **Encontrado:** `GET` sem autenticação retorna dados de `cats`, `feeding_logs`, `households` e lista de models Prisma
- **Risco:** Information disclosure, fingerprinting de schema, possível vetor de reconhecimento
- **Correção proposta:** Deletar rota ou guardar com `NODE_ENV !== 'production'` + auth admin
- **Esforço:** S
- **Fase roadmap:** R1

### [HIGH] CORS com fallback apenas localhost em produção

- **Módulo:** CORS / proxy.ts
- **Arquivos:** `proxy.ts:13-33`
- **Esperado:** `ALLOWED_ORIGINS` obrigatório em produção com domínios reais (`.env.example` documenta `https://mealtime.app.br`)
- **Encontrado:** Se `ALLOWED_ORIGINS` não estiver definido, apenas origens localhost são permitidas — mas rotas v1 sem CORS middleware podem ainda ser acessíveis via curl/server-side
- **Risco:** Configuração incorreta em deploy; comportamento inconsistente entre ambientes
- **Correção proposta:** Fail-fast em build se `ALLOWED_ORIGINS` ausente em `NODE_ENV=production`
- **Esforço:** S
- **Fase roadmap:** R1

### [HIGH] Rate limiting in-memory ineficaz em serverless

- **Módulo:** Rate Limit
- **Arquivos:** `lib/middleware/rate-limit.ts`
- **Esperado (Netlify/serverless):** Rate limit distribuído (Redis, Upstash, Netlify Edge)
- **Encontrado:** `Map` in-memory por instância (`inMemoryStore`); cada cold start reseta contadores
- **Risco:** Brute force em auth, abuso de API sem proteção real
- **Correção proposta:** Upstash Redis ou Netlify rate limiting no edge
- **Esforço:** M
- **Fase roadmap:** R1

### [MEDIUM] v2 deliver aceita qualquer usuário autenticado além de cron

- **Módulo:** Scheduled Notifications v2
- **Arquivos:** `app/api/v2/scheduled-notifications/deliver/route.ts:271-288`
- **Esperado:** Apenas cron/internal pode executar entrega global
- **Encontrado:** Fallback para `withHybridAuth` — usuário logado pode disparar entrega de TODAS notificações pendentes do sistema
- **Risco:** Usuário malicioso processa fila global; side effects em escala
- **Correção proposta:** Remover fallback de user auth; exigir apenas `X-Cron-Secret` ou Netlify identity
- **Esforço:** S
- **Fase roadmap:** R1

### [MEDIUM] CSP permissivo com unsafe-inline/eval

- **Módulo:** Security Headers
- **Arquivos:** `lib/utils/security-headers.ts:27`
- **Esperado:** CSP restritivo com nonces (Next.js 16 suporta)
- **Encontrado:** `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
- **Risco:** Reduz eficácia contra XSS se combinado com injeção
- **Correção proposta:** Nonce-based CSP via middleware
- **Esforço:** M
- **Fase roadmap:** R2

### [MEDIUM] Queries Prisma sem filtro household em alguns endpoints v1

- **Módulo:** Data Access
- **Arquivos:** Diversas rotas v1 que confiam em `X-User-ID` para membership check — lógica existe mas é bypassável pelo spoofing
- **Esperado:** RLS Supabase alinhado + auth server-side
- **Encontrado:** Schema Prisma marca RLS (`/// This model contains row level security`) mas app usa Prisma direto com connection string — RLS Supabase **não se aplica** às queries Prisma
- **Risco:** Segurança depende 100% da lógica application-level
- **Correção proposta:** Centralizar authorization em middleware/repository layer; auditar cada query
- **Esforço:** L
- **Fase roadmap:** R1 + R3

### [LOW] getSession() em serviço de notificações client-side

- **Módulo:** Supabase Auth Client
- **Arquivos:** `lib/services/supabase-notification-service.ts:215`
- **Esperado:** `getUser()` para validar sessão no client quando possível
- **Encontrado:** `getSession()` para obter access_token
- **Risco:** Baixo no client; sessão pode estar stale
- **Correção proposta:** Migrar para `getUser()` + session refresh
- **Esforço:** S
- **Fase roadmap:** R4

### [INFO] Auth híbrida v2 bem implementada

- **Módulo:** Hybrid Auth
- **Arquivos:** `lib/middleware/hybrid-auth.ts`, `lib/middleware/mobile-auth.ts`
- **Encontrado:** JWT primeiro, fallback session; `getUser(token)` para mobile; lookup Prisma para household
- **Risco:** Nenhum significativo
- **Correção proposta:** Manter como padrão; expandir para 100% das rotas
- **Esforço:** —
- **Fase roadmap:** —

---

## Validação em Staging (documentada — credenciais não executadas nesta auditoria)

| Fluxo | O que testar | Resultado esperado |
|-------|--------------|-------------------|
| Login web | Email/senha → dashboard | Sessão persistida; cookie `sb-*` setado |
| Rotas v2 protegidas | `GET /api/v2/cats` sem auth | 401 JSON |
| Bearer mobile | `Authorization: Bearer <token>` em `/api/v2/feedings` | 200 com dados do household |
| Token expirado | Bearer inválido | 401 consistente |
| IDOR gato | User A tenta `GET /api/v2/cats/{catId_de_B}` | 403 |
| IDOR household | User A tenta `GET /api/v2/households/{id_de_B}` | 403 |
| Cron deliver v1 | `POST /api/scheduled-notifications/deliver` sem secret | **Deve falhar após R1** — hoje retorna 200 |
| test-prisma | `GET /api/test-prisma` em staging | **Deve retornar 404 após R1** — hoje retorna dados |
| CORS | Origin `https://evil.com` em preflight | Bloqueado se `ALLOWED_ORIGINS` configurado |

> **Nota:** Credenciais de staging não foram fornecidas nesta sessão. Os testes acima devem ser executados manualmente ou via Playwright contra `PLAYWRIGHT_BASE_URL` de staging após R1.

---

## Secrets e Env

| Variável | Em `.env.example` | Exposta ao client | Status |
|----------|-------------------|-------------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Sim (OK) | OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Sim (OK) | OK |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Não | OK |
| `CRON_SECRET` | ✅ | Não | Definido mas v1 não usa |
| `DATABASE_URL` | ✅ | Não | OK |
| `ALLOWED_ORIGINS` | ✅ | Não | Crítico em prod |

---

*Gerado em: 2 de julho de 2026 | Auditoria foundational MealTime*
