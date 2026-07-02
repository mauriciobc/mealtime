# Anexo C — Testes e CI/CD
## Foundational Audit MealTime — Julho 2026

---

## Resumo Executivo

O projeto possui **19 specs Playwright** em `tests/` mas **zero pipeline CI**, **zero testes unitários**, e ESLint **ignora completamente** `tests/**`. O `jest.setup.js` é órfão. O script `test:e2e:mobile` referencia projeto `mobile-safari` inexistente no config.

**Postura geral:** Cobertura E2E existe mas não é confiável | Qualidade automatizada AUSENTE

---

## Estado Atual

| Tipo | Quantidade | Status |
|------|------------|--------|
| E2E Playwright | 19 specs | Ativo localmente, sem CI |
| Unitários (Vitest/Jest) | 0 | TASKS.md diz Vitest configurado — **falso** |
| API integration auto | 0 | Scripts manuais em `scripts/test-*.js` |
| Typecheck no CI | 0 | `tsc --noEmit` não é script npm |
| GitHub Actions | 0 | Pasta `.github/` ausente |
| ESLint em tests | ❌ | `eslint.config.mjs:27` ignora `tests/**` |

---

## Inventário Playwright

### Specs (19 arquivos em `tests/`)

| Spec | Foco | Usa v2? |
|------|------|---------|
| `auth.spec.ts` | Login, signup, API auth | Parcial |
| `dashboard.spec.ts` | Dashboard | UI |
| `cats.spec.ts` | CRUD gatos | v1 provável |
| `e2e-cats.spec.ts` | E2E gatos | v1 |
| `feedings.spec.ts` | Alimentação | v1 |
| `households.spec.ts` | Households | v1 |
| `e2e-households.spec.ts` | E2E households | Menciona v2 |
| `notifications.spec.ts` | Notificações | — |
| `schedules.spec.ts` | Agendamentos | — |
| `settings.spec.ts` | Configurações | — |
| `statistics.spec.ts` | Estatísticas | — |
| `history.spec.ts` | Histórico | — |
| `profile.spec.ts` | Perfil | — |
| `join.spec.ts` | Join household | — |
| `onboarding.spec.ts` | Tours | — |
| `e2e-weight.spec.ts` | Peso | — |
| `e2e-complete.spec.ts` | Fluxo completo | — |
| `error-offline.spec.ts` | Offline/PWA | — |
| `api-gender.spec.ts` | API gender field | v2 |

### Config (`playwright.config.ts`)

| Setting | Valor | Issue |
|---------|-------|-------|
| `testDir` | `./tests` | ✅ |
| Projects | setup, chromium, chromium-unauthenticated, mobile-chrome | ❌ Falta `mobile-safari` |
| `webServer` | `npm run dev` | OK local; staging precisa `PLAYWRIGHT_BASE_URL` |
| `storageState` | `tests/fixtures/auth.json` | Depende de setup project |
| Timeout | 60s | OK |

### test.skip() — Condicionais (alto risco de falso verde)

Contagem: **40+ ocorrências** de `test.skip` condicionais baseados em `testUser.userId`, `testUser.email`, `testUser.password`.

**Padrão problemático:**
```typescript
test.skip(({ testUser }) => !testUser.userId, 'Skipping - no test user configured');
```

Se credenciais de teste não estiverem em `.env.test.local`, **todos os testes são silenciosamente pulados** — falso positivo de suíte verde.

---

## Findings

### [CRITICAL] Ausência total de CI/CD

- **Módulo:** CI/CD
- **Arquivos:** Ausência de `.github/workflows/*`
- **Esperado:** Pipeline com lint + typecheck + build mínimo; E2E em staging no merge
- **Encontrado:** Nenhum workflow; Netlify build roda apenas `npm run build` sem gates de qualidade
- **Risco:** Regressões chegam a produção sem detecção
- **Correção proposta:** GitHub Actions (ver proposta abaixo)
- **Esforço:** M
- **Fase roadmap:** R2 + R6

### [HIGH] Script test:e2e:mobile referencia projeto inexistente

- **Módulo:** Playwright Config
- **Arquivos:** `package.json:28`, `playwright.config.ts`
- **Esperado:** Script referencia apenas projects definidos
- **Encontrado:** `"test:e2e:mobile": "playwright test --project=mobile-chrome --project=mobile-safari"` mas config só tem `mobile-chrome`
- **Risco:** Comando falha; falsa sensação de cobertura mobile Safari
- **Correção proposta:** Adicionar project `mobile-safari` com `devices['iPhone 13']` ou remover do script
- **Esforço:** S
- **Fase roadmap:** R2

### [HIGH] ESLint ignora diretório tests/

- **Módulo:** ESLint
- **Arquivos:** `eslint.config.mjs:27`
- **Esperado:** Testes sob mesmo padrão de qualidade
- **Encontrado:** `'**/tests/**'` em ignores
- **Risco:** Erros de hooks, any types, e más práticas nos testes
- **Correção proposta:** Remover ignore; adicionar override para regras de teste
- **Esforço:** S
- **Fase roadmap:** R2

### [HIGH] jest.setup.js órfão

- **Módulo:** Test Infrastructure
- **Arquivos:** `jest.setup.js` (raiz)
- **Esperado:** Arquivo ausente ou integrado a runner ativo
- **Encontrado:** Referencia `@testing-library/jest-dom` (missing dep per depcheck); sem `jest.config`; TASKS.md marca como deletado mas arquivo existe
- **Risco:** Confusão; depcheck false positive de missing dependency
- **Correção proposta:** Deletar `jest.setup.js`
- **Esforço:** S
- **Fase roadmap:** R2

### [HIGH] TASKS.md contradiz realidade de testes

- **Módulo:** Documentation
- **Arquivos:** `docs/todos/TASKS.md`
- **Esperado:** Doc reflete estado do código
- **Encontrado:** Marca Playwright e Jest como removidos; Vitest como configurado — mas Playwright está ativo com 12 scripts npm e Vitest não existe
- **Risco:** Time toma decisões baseadas em informação falsa
- **Correção proposta:** Reescrever TASKS.md ou arquivar
- **Esforço:** S
- **Fase roadmap:** R5

### [MEDIUM] TypeScript errors em specs (11 erros)

- **Módulo:** Type Safety
- **Arquivos:** `tests/api-gender.spec.ts`, `tests/cats.spec.ts`, `tests/e2e-cats.spec.ts`, `tests/onboarding.spec.ts`
- **Esperado:** `tsc --noEmit` limpo
- **Encontrado:** `Object is possibly 'undefined'`, `string | undefined` not assignable
- **Risco:** Testes podem falhar silenciosamente; typecheck não roda em CI
- **Correção proposta:** Adicionar script `typecheck`; corrigir specs
- **Esforço:** S
- **Fase roadmap:** R2

### [MEDIUM] Maioria dos E2E testa fluxos v1

- **Módulo:** API Coverage
- **Arquivos:** `tests/*.spec.ts`, `tests/helpers/api-helper.ts`
- **Esperado:** E2E validam contratos v2 pós-migração
- **Encontrado:** Helpers e pages usam rotas v1; apenas `api-gender.spec.ts` e alguns helpers usam v2
- **Risco:** Migração v2 sem rede de segurança
- **Correção proposta:** Atualizar helpers para v2; adicionar smoke tests v2
- **Esforço:** L
- **Fase roadmap:** R3 + R6

### [MEDIUM] e2e/debug-helper.spec.ts fora de testDir

- **Módulo:** Test Organization
- **Arquivos:** `e2e/debug-helper.spec.ts` (untracked no git status)
- **Esperado:** Todos specs em `tests/` ou removidos
- **Encontrado:** Spec em pasta `e2e/` separada — não executado por `playwright test` default
- **Risco:** Debug spec esquecido
- **Correção proposta:** Mover para `tests/` ou deletar
- **Esforço:** S
- **Fase roadmap:** R2

### [LOW] Sem Prettier / formatação consistente

- **Módulo:** Code Style
- **Encontrado:** Apenas ESLint; sem Prettier config
- **Risco:** Diffs ruidosos, inconsistência
- **Correção proposta:** Prettier + lint-staged (opcional R5)
- **Esforço:** S
- **Fase roadmap:** R5

### [LOW] .eslintrc.json legado pode coexistir

- **Módulo:** ESLint
- **Encontrado:** `eslint.config.mjs` é flat config ativo; verificar se `.eslintrc.json` ainda existe
- **Risco:** Confusão de qual config prevalece
- **Correção proposta:** Remover legado
- **Esforço:** S
- **Fase roadmap:** R2

---

## Baseline de Comandos (executados 2 jul 2026)

### `npm run lint`
```
Exit code: 1
2 warnings (max-warnings=0):
- components/safe-image.tsx:64 — useCallback unnecessary dep
- components/weight/milestone-progress.tsx:309 — useEffect missing dep
```

### `npx tsc --noEmit`
```
Exit code: 1
11 errors:
- lib/context/HapticsContext.tsx — module 'web-haptics/react' not found
- tests/*.spec.ts — 10 errors (possibly undefined, type mismatch)
```

### `npm run build`
```
Exit code: 1
Compiled successfully (webpack) in 54s
TypeScript check FAILED:
  lib/context/HapticsContext.tsx:16 — Cannot find module 'web-haptics/react'
```

### `npx react-doctor .`
```
363 warnings across 227/518 files
122 unused files
107 unused exports
14 client-side redirects in useEffect
5 useSearchParams without Suspense
1 dangerouslySetInnerHTML
```

### `npx depcheck`
```
Unused deps: @netlify/plugin-nextjs, @radix-ui/*, @react-pdf/renderer, uploadthing, etc.
Missing: eslint-plugin-react, @testing-library/jest-dom (jest.setup.js), @radix-ui/react-dialog
```

### `npx madge --circular lib/ components/`
```
Processed 0 files — No circular dependency found
(Nota: madge não processou arquivos no Windows path; verificar manualmente)
```

---

## Proposta de CI (roadmap — não implementado)

```yaml
# .github/workflows/quality.yml (proposta)
name: Quality Gates
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.19.0'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run build

  e2e-staging:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ secrets.STAGING_URL }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

---

## Validação Staging E2E (documentada)

| Fluxo crítico | Spec existente | Gap |
|---------------|----------------|-----|
| Auth login/logout | `auth.spec.ts` | OK |
| Criar gato | `cats.spec.ts` | Usa v1 |
| Registrar alimentação | `feedings.spec.ts` | Usa v1 |
| Join household | `join.spec.ts` | — |
| Notificações | `notifications.spec.ts` | Skip condicional |
| Offline PWA | `error-offline.spec.ts` | — |
| API v2 cats | `api-gender.spec.ts` | Parcial |
| IDOR security | ❌ Ausente | **Criar em R6** |
| Cron deliver | ❌ Ausente | **Criar em R6** |

---

*Gerado em: 2 de julho de 2026 | Auditoria foundational MealTime*
