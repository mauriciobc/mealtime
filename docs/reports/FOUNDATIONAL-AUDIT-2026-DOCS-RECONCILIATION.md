# Anexo E — Reconciliação de Documentação
## Foundational Audit MealTime — Julho 2026

---

## Resumo Executivo

O projeto contém **155 arquivos markdown** em `docs/` (não 165+ como estimado inicialmente, mas volume significativo). Múltiplos documentos **contradizem o estado real do código**, especialmente em testes, migração JWT (marcada "completa" enquanto v1 ativo), e arquitetura de contexts.

**Recomendação:** Arquivar ~40% dos docs para `docs/archive/` e manter índice com status CURRENT/STALE.

---

## Contagem por Diretório

| Diretório | Arquivos .md | Status predominante |
|-----------|--------------|---------------------|
| `docs/migrations/` | ~20 | STALE — muitos "COMPLETE/SUCCESS" |
| `docs/reports/` | ~20 | STALE — relatórios pontuais antigos |
| `docs/todos/` | ~8 | CONTRADICTS_CODE |
| `docs/testing/` | ~10 | PARCIALMENTE CURRENT |
| `docs/analysis/` | ~8 | MIXED |
| `docs/notifications/` | ~4 | NEEDS_REVIEW |
| `docs/user-guide/` | ~30+ | CURRENT (user-facing) |
| `docs/features/` | ~6 | MIXED |
| `docs/deployment/` | ~4 | PARTIALLY STALE |
| `docs/architecture/` | ~3 | STALE |
| `docs/development/` | ~6 | MIXED |
| `docs/fixes/` | ~3 | ARCHIVE |
| Raiz `docs/` | ~5 | MIXED |

---

## Documentos Prioritários — Status

| Documento | Status | Motivo |
|-----------|--------|--------|
| `docs/todos/TASKS.md` | **CONTRADICTS_CODE** | Diz Playwright removido; package.json tem 12 scripts E2E |
| `docs/todos/TASKS.md` | **CONTRADICTS_CODE** | Diz Vitest configurado; não existe vitest.config.ts |
| `docs/todos/TASKS.md` | **CONTRADICTS_CODE** | Diz jest.setup.js deletado; arquivo existe na raiz |
| `docs/architecture/contexts.md` | **STALE** | Não reflete 11 contexts + HapticsContext novo |
| `docs/analysis/COMPATIBILIDADE-V1-V2-ANALISE.md` | **PARTIALLY CURRENT** | Análise válida mas v1 ainda ativo |
| `docs/analysis/ANALISE-SWAGGER-VS-REALIDADE.md` | **CURRENT** | Ainda relevante — drift persiste |
| `docs/migrations/MIGRACAO-JWT-COMPLETA.md` | **STALE** | JWT v2 ok mas v1 X-User-ID ainda ativo |
| `docs/migrations/CONCLUSAO-MIGRACAO-JWT-V2.md` | **STALE** | Conclusão prematura |
| `docs/migrations/REACT-19-COMPLETE-IMPLEMENTATION.md` | **STALE** | Build falha; react-doctor 363 warnings |
| `docs/react-doctor-pareto-fix-plan.md` | **CURRENT** | Plano válido (404→363 warnings) |
| `docs/testing/e2e-testing.md` | **NEEDS_UPDATE** | Não menciona mobile-safari bug |
| `docs/INDEX.md` | **CURRENT** | Estrutura ok; falta status por doc |
| `docs/status.md` | **STALE** | Provavelmente desatualizado |
| `docs/memory.md` | **REVIEW** | Contexto de agente — pode conter claims falsos |
| `docs/context-refactor-migration-guide.md` | **STALE** | Refactor não executado |
| `docs/DEVELOPMENT-GUIDE.md` | **REVIEW** | Verificar versões e comandos |
| `docs/user-guide/*` | **CURRENT** | Documentação de usuário — baixo risco |
| `docs/reports/TSC-VICTORY-REPORT.md` | **CONTRADICTS_CODE** | TSC não está limpo |
| `docs/reports/LINT-SUCCESS-REPORT.md` | **CONTRADICTS_CODE** | Lint falha com 2 warnings |

---

## Contradições Críticas (Top 10)

### 1. Playwright: removido vs ativo
- **Doc:** `docs/todos/TASKS.md` Fase 1.1 — "Remover Playwright" ✅
- **Código:** `package.json` scripts `test:e2e*` (12 scripts), `@playwright/test@1.57`, 19 specs

### 2. Vitest: configurado vs ausente
- **Doc:** `docs/todos/TASKS.md` Fase 2 — Vitest configurado ✅
- **Código:** Sem `vitest.config.ts`, sem dependência vitest

### 3. Jest setup: deletado vs presente
- **Doc:** TASKS.md — jest.setup.js deletado ✅
- **Código:** `jest.setup.js` na raiz do projeto

### 4. Migração JWT completa
- **Doc:** `docs/migrations/CONCLUSAO-MIGRACAO-JWT-V2.md`
- **Código:** 11 rotas v1 com `X-User-ID` spoofável

### 5. React 19 migração completa
- **Doc:** `docs/migrations/REACT-19-COMPLETE-IMPLEMENTATION.md`
- **Código:** Build falha; 363 react-doctor warnings

### 6. TSC victory
- **Doc:** `docs/reports/TSC-VICTORY-REPORT.md`
- **Código:** `tsc --noEmit` = 11 erros; build falha

### 7. Lint success
- **Doc:** `docs/reports/LINT-SUCCESS-REPORT.md`
- **Código:** `npm run lint` exit 1 (2 warnings, max-warnings=0)

### 8. Context architecture
- **Doc:** `docs/architecture/contexts.md`
- **Código:** 11 contexts + ContextBridge + StateSync não documentados

### 9. API v1 deprecation
- **Doc:** Vários docs migrations dizem v2 como padrão
- **Código:** 34 rotas v1 ativas, frontend usa v1

### 10. Notificações refactor complete
- **Doc:** `docs/notifications/NOTIFICATION-REFACTOR-SUMMARY.md`
- **Código:** 4 serviços de notificação coexistindo; deliver v1 sem auth

---

## Matriz de Ação por Status

| Status | Ação | Qtd estimada |
|--------|------|--------------|
| CURRENT | Manter; adicionar data de revisão | ~50 |
| STALE | Mover para `docs/archive/` com banner | ~60 |
| CONTRADICTS_CODE | Reescrever ou deletar | ~25 |
| ARCHIVE | Mover sem revisão | ~20 |

---

## Proposta de Estrutura Pós-Reconciliação

```
docs/
├── INDEX.md              # Índice com status e data
├── DEVELOPMENT-GUIDE.md  # Único guia de dev (CURRENT)
├── architecture/
│   └── CURRENT-ARCHITECTURE.md  # Reescrito pós-R4
├── api/
│   └── v2-reference.md   # Swagger + notas
├── testing/
│   └── e2e-guide.md      # Atualizado
├── user-guide/           # Mantido
└── archive/
    ├── migrations/       # Relatórios históricos
    ├── reports/          # TSC-VICTORY, etc.
    └── todos/            # TASKS.md antigo
```

---

## Findings

### [HIGH] Documentação ativa induz decisões erradas

- **Módulo:** Developer Experience
- **Risco:** Dev segue TASKS.md e acredita que testes foram removidos
- **Correção:** Banner de deprecação no topo de docs STALE; archive em R5
- **Esforço:** M
- **Fase roadmap:** R5

### [MEDIUM] 19 relatórios em docs/reports/ sem distinção temporal

- **Módulo:** Reports
- **Encontrado:** TSC-VICTORY, LINT-SUCCESS coexistem com estado atual falho
- **Correção:** Este audit (`FOUNDATIONAL-AUDIT-2026.md`) torna-se source of truth; arquivar anteriores
- **Esforço:** S
- **Fase roadmap:** R5

### [MEDIUM] docs/INDEX.md sem status por documento

- **Correção:** Adicionar coluna Status e Last Reviewed
- **Esforço:** S
- **Fase roadmap:** R5

### [LOW] Duplicação user-guide PT/EN

- **Encontrado:** `docs/user-guide/` e `docs/user-guide/en/`
- **Risco:** Drift entre idiomas
- **Correção:** Processo de sync ou gerar EN from PT
- **Esforço:** M
- **Fase roadmap:** R5

---

## Checklist de Reconciliação (R5)

- [ ] Criar `docs/archive/` e mover relatórios TSC/LINT antigos
- [ ] Arquivar `docs/todos/TASKS.md` → escrever `docs/todos/CURRENT.md`
- [ ] Atualizar `docs/INDEX.md` com status
- [ ] Adicionar `docs/architecture/CURRENT-ARCHITECTURE.md`
- [ ] Banner `> ⚠️ ARQUIVADO` em docs movidos
- [ ] Link deste audit como referência canonical

---

*Gerado em: 2 de julho de 2026 | Auditoria foundational MealTime*
