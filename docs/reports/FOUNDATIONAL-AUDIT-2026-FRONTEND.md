# Anexo B — Arquitetura Frontend
## Foundational Audit MealTime — Julho 2026

---

## Resumo Executivo

O frontend sofre de **provider hell** (11 contexts em 3 camadas), estado duplicado entre Context API e TanStack Query, e múltiplos arquivos legados/duplicados. O build de produção está **bloqueado** por import de `web-haptics/react`. React-doctor reporta **363 avisos** em 227 arquivos e **122 arquivos não utilizados**.

**Postura geral:** Dívida técnica ALTA | Migração React 19 parcialmente completa

---

## Mapa de Contexts (11 total)

```
CoreProviders (ThemeProvider → ReactQueryProvider → ErrorProvider)
  └── DataProviders (Loading → User → Household → Cats → Weight → Feeding → Schedule)
        └── UIProviders (Notification → Haptics → OnboardingWrapper)
```

| Context | Arquivo | Fonte de dados | Consumidores principais |
|---------|---------|----------------|-------------------------|
| ErrorContext | `lib/context/ErrorContext.tsx` | Local | Global error boundary |
| UserContext | `lib/context/UserContext.tsx` | Supabase + Prisma actions | App-wide (465 linhas) |
| HouseholdContext | `lib/context/HouseholdContext.tsx` | fetch `/api/households` | Settings, join, members |
| CatsContext | `lib/context/CatsContext.tsx` | fetch `/api/cats` | Dashboard, cats pages |
| WeightContext | `lib/context/WeightContext.tsx` | fetch weight APIs | Weight pages |
| FeedingContext | `lib/context/FeedingContext.tsx` | fetch `/api/feedings` | Dashboard, feeding |
| ScheduleContext | `lib/context/ScheduleContext.tsx` | fetch schedules | Schedules |
| LoadingContext | `lib/context/LoadingContext.tsx` | Local UI | Global loading |
| NotificationContext | `lib/context/NotificationContext.tsx` | Supabase realtime | Header, notifications |
| HapticsContext | `lib/context/HapticsContext.tsx` | web-haptics | Botões, ações |
| ThemeProvider | `components/theme-provider.tsx` | next-themes | App-wide |

**Sincronização manual adicional:**
- `lib/context/ContextBridge.tsx` — emite eventos `catsUpdated`, `feedingsUpdated`, `householdUpdated`
- `lib/context/StateSync.tsx` — sincronização cross-context

---

## Findings

### [CRITICAL] Build de produção falha — HapticsContext

- **Módulo:** TypeScript / Module Resolution
- **Arquivos:** `lib/context/HapticsContext.tsx:16`
- **Esperado (docs web-haptics):** Import `web-haptics/react` com `moduleResolution: bundler` ou `node16`
- **Encontrado:** `Cannot find module 'web-haptics/react'` — types existem em `node_modules/web-haptics/dist/react/index.d.ts` mas tsconfig não resolve
- **Risco:** Deploy Netlify bloqueado
- **Correção proposta:** Atualizar `tsconfig.json` `moduleResolution` para `bundler`; ou import de path alternativo
- **Esforço:** S
- **Fase roadmap:** R2

### [HIGH] Provider hell — 11 contexts com estado duplicado

- **Módulo:** State Management
- **Arquivos:** `components/layout/provider-groups.tsx`, `lib/context/*`, `ContextBridge.tsx`, `StateSync.tsx`
- **Esperado (TanStack Query docs):** Server/cache state no React Query; contexts apenas para UI ephemeral
- **Encontrado:** Cada domain context faz fetch próprio E mantém state local; React Query presente mas subutilizado como source of truth
- **Risco:** Re-renders em cascata, bugs de sync, dificuldade de manutenção
- **Correção proposta:** Domain hooks (`useCats`, `useFeedings`) sobre React Query; reduzir para 3-4 providers
- **Esforço:** XL
- **Fase roadmap:** R4

### [HIGH] FeedingContext.v2 duplicado e não integrado

- **Módulo:** Context Duplication
- **Arquivos:** `lib/context/FeedingContext.tsx`, `lib/context/FeedingContext.v2.tsx`, `FeedingContext.use-hook-example.tsx`, `FeedingContext.use-hook-example.client.tsx`
- **Esperado:** Um único context ou eliminação em favor de hooks
- **Encontrado:** v2 chama `/api/feedings` (v1); exemplos de hook coexistem; provider-groups usa apenas v1
- **Risco:** Confusão, código morto, migração incompleta
- **Correção proposta:** Remover v2 e exemplos após migrar para React Query hooks
- **Esforço:** M
- **Fase roadmap:** R4

### [HIGH] Três serviços de notificação coexistindo

- **Módulo:** Notification Services
- **Arquivos:** `lib/services/notificationService.ts` (deprecated), `lib/services/notification-service.ts`, `lib/services/supabase-notification-service.ts`, `lib/services/feeding-notification-service.ts`
- **Esperado:** Um serviço canônico
- **Encontrado:** `notificationService.ts` é wrapper deprecated com `console.warn`; `notification-service.ts` pode ser duplicata
- **Risco:** Imports inconsistentes, comportamento divergente
- **Correção proposta:** Consolidar em `supabase-notification-service.ts`; deletar deprecated
- **Esforço:** M
- **Fase roadmap:** R4

### [HIGH] Consumidores frontend ainda chamam API v1

- **Módulo:** API Consumption
- **Arquivos:** `lib/services/apiService.ts`, `lib/context/FeedingContext.v2.tsx`, `app/cats/new/NewCatPageContent.tsx`, `app/settings/page.tsx`, `app/join/JoinPageContent.tsx`, `app/households/HouseholdsPageContent.tsx`
- **Esperado:** 100% `/api/v2/*`
- **Encontrado:** fetch para `/api/cats`, `/api/households`, `/api/feedings`, `/api/households/join`
- **Risco:** Auth insegura v1, contratos divergentes
- **Correção proposta:** Migrar todos os fetch para v2
- **Esforço:** L
- **Fase roadmap:** R3

### [MEDIUM] Componentes incompletos / placeholders em rotas ativas

- **Módulo:** UI Completeness
- **Arquivos:** `components/new-feeding-sheet.tsx` (incompleto), `app/history/[id]/page.tsx` (TODO placeholder), `app/settings/[id]/page.tsx` (TODO placeholder), `components/cat/cat-list.tsx` (função ausente), `hooks/use-feeding.ts` (API removida)
- **Esperado:** Rotas funcionais ou removidas do router
- **Encontrado:** Páginas renderizam `<p>TODO: Implement...</p>`
- **Risco:** UX quebrada, rotas mortas indexáveis
- **Correção proposta:** Completar ou remover rotas; redirecionar para equivalentes funcionais
- **Esforço:** M
- **Fase roadmap:** R4

### [MEDIUM] useSearchParams sem Suspense boundary (5 ocorrências)

- **Módulo:** React 19 / Next.js 16
- **Esperado (Next.js docs):** `<Suspense>` wrapper em componentes com `useSearchParams()`
- **Encontrado:** react-doctor reporta 5 avisos
- **Risco:** CSR bailout de página inteira, performance degradada
- **Correção proposta:** Extrair componentes com search params para Suspense boundaries
- **Esforço:** M
- **Fase roadmap:** R4

### [MEDIUM] Client-side redirects em useEffect (14 ocorrências)

- **Módulo:** Next.js Navigation
- **Esperado:** `redirect()` em Server Components ou middleware
- **Encontrado:** react-doctor reporta 14 ocorrências
- **Risco:** Flash de conteúdo, SEO prejudicado, hydration issues
- **Correção proposta:** Migrar redirects para server/middleware
- **Esforço:** M
- **Fase roadmap:** R4

### [MEDIUM] dangerouslySetInnerHTML em chart component

- **Módulo:** XSS Prevention
- **Arquivos:** `components/ui/chart.tsx:83`
- **Esperado:** Evitar innerHTML; usar SVG React ou sanitização
- **Encontrado:** `dangerouslySetInnerHTML` para estilos de chart (padrão shadcn/recharts)
- **Risco:** Baixo se conteúdo é gerado internamente; médio se dados externos
- **Correção proposta:** Auditar origem do HTML; usar CSS variables
- **Esforço:** S
- **Fase roadmap:** R1

### [MEDIUM] Duplicata app/components/ vs components/

- **Módulo:** Project Structure
- **Arquivos:** `app/components/feeding-form.tsx`, `components/feeding/feeding-form.tsx`, `app/components/feeding-history.tsx`, etc.
- **Esperado:** Um diretório canônico `components/`
- **Encontrado:** 5 arquivos em `app/components/` duplicando ou competindo com `components/`
- **Risco:** Edições no arquivo errado, imports inconsistentes
- **Correção proposta:** Mover para `components/` e atualizar imports
- **Esforço:** S
- **Fase roadmap:** R5

### [LOW] 122 arquivos não utilizados (react-doctor)

- **Módulo:** Dead Code
- **Arquivos:** Diversos — ver relatório react-doctor
- **Encontrado:** 122 unused files, 107 unused exports (`createMiddlewareClient`)
- **Risco:** Bundle size, confusão
- **Correção proposta:** Curadoria faseada com react-doctor pareto plan
- **Esforço:** L
- **Fase roadmap:** R5

### [LOW] Pasta src/ legado

- **Módulo:** Legacy
- **Arquivos:** `src/pages.tsx`, `src/lib/image-cache.ts`
- **Encontrado:** 2 arquivos órfãos
- **Risco:** Mínimo
- **Correção proposta:** Remover após verificar imports
- **Esforço:** S
- **Fase roadmap:** R5

### [LOW] Metadata ausente em 23 páginas

- **Módulo:** SEO / Next.js
- **Encontrado:** react-doctor reporta páginas sem `export const metadata`
- **Risco:** SEO e social sharing prejudicados
- **Correção proposta:** Adicionar metadata estática ou `generateMetadata`
- **Esforço:** M
- **Fase roadmap:** R5

### [INFO] React Query configurado mas subutilizado

- **Módulo:** TanStack Query
- **Arquivos:** `lib/providers/react-query-provider.tsx`
- **Encontrado:** `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus: false` — configuração razoável
- **Risco:** Contexts fazem fetch paralelo ignorando cache
- **Correção proposta:** Migrar fetches de contexts para `useQuery`/`useMutation`
- **Esforço:** L
- **Fase roadmap:** R4

---

## React 19 + Next.js 16 Compliance

| Check | Status | Detalhe |
|-------|--------|---------|
| `"use client"` em providers | ⚠️ | Necessário para hooks, mas 11 níveis é excessivo |
| Server/Client boundaries | ⚠️ | Muitos pages são client-heavy |
| React Compiler | ❌ | Não habilitado |
| LazyMotion / code splitting | ⚠️ | recharts pesado em 5 páginas sem dynamic import |
| PWA offline | ✅ | `app/offline/page.tsx` existe |

---

## Performance

| Item | Impacto | Ação |
|------|---------|------|
| recharts em 5 páginas | Bundle +~200KB | `next/dynamic` com `ssr: false` |
| framer-motion | Moderado | LazyMotion já usado parcialmente |
| UserProvider 465 linhas | Re-render scope | Split em hooks menores |
| 11 provider nesting | Mount time | Flatten para 3-4 |

---

*Gerado em: 2 de julho de 2026 | Auditoria foundational MealTime*
