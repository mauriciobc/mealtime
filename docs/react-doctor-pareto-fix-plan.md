# Plano de correções React Doctor — priorização Pareto (impacto/esforço)

**Score atual:** 82/100 (Great) · **404 avisos** em 226 arquivos  
**Objetivo:** Subir o score priorizando **maior impacto com menor esforço**.

---

## 1. Matriz impacto × esforço (Pareto)

Escalas: **Impacto** 1–5 (5 = crítico para SEO/segurança/bundle), **Esforço** 1–5 (5 = refatoração pesada).  
**Prioridade** = Impacto ÷ Esforço (quanto maior, mais “quick win”).

| # | Categoria | Avisos | Impacto | Esforço | Ratio | Fase |
|---|-----------|--------|---------|--------|-------|------|
| 1 | Page without metadata | 23 | 5 | 1 | **5.0** | 1 |
| 2 | dangerouslySetInnerHTML | 1 | 5 | 1 | **5.0** | 1 |
| 3 | Array index as key | 11 | 4 | 1 | **4.0** | 1 |
| 4 | Headings sem conteúdo acessível | 6 | 3 | 1 | **3.0** | 2 |
| 5 | LazyMotion (m vs motion) | 1 | 3 | 1 | **3.0** | 2 |
| 6 | useSearchParams sem Suspense | 5 | 4 | 2 | **2.0** | 2 |
| 7 | recharts sem code splitting | 5 | 4 | 2 | **2.0** | 2 |
| 8 | Unused export | 107 | 2 | 1 | **2.0** | 3 |
| 9 | useState(now()) sem lazy init | 3 | 2 | 1 | **2.0** | 3 |
| 10 | scale: 0 em animação | 4 | 2 | 1 | **2.0** | 3 |
| 11 | useState inicializado de prop | 3 | 3 | 2 | **1.5** | 3 |
| 12 | useMemo em expressão trivial | 2 | 1 | 1 | **1.0** | 3 |
| 13 | Unknown property | 3 | 1 | 1 | **1.0** | 3 |
| 14 | Unused type | 34 | 1 | 1 | **1.0** | 3 |
| 15 | Client-side redirect em useEffect | 14 | 4 | 4 | **1.0** | 4 |
| 16 | useEffect simulando event handler | 11 | 3 | 3 | **1.0** | 4 |
| 17 | 5+ setState em um useEffect | 9 | 3 | 3 | **1.0** | 4 |
| 18 | useEffect(setState, []) flash | 4 | 3 | 2 | **1.5** | 3 |
| 19 | Componente muito grande | 16 | 2 | 4 | **0.5** | 5 |
| 20 | Muitos useState / useReducer | 16 | 2 | 4 | **0.5** | 5 |
| 21 | Unused file | 122 | 2 | 3* | **0.7** | 4** |
| 22 | Outros (link CSS, children prop, etc.) | ~6 | 1 | 1 | **1.0** | 3 |

\* Esforço variável: muitos “unused” são scripts/testes; remoção em massa exige curadoria.  
\** Fase 4 apenas para arquivos claramente mortos (ex.: backups, duplicatas); não apagar scripts úteis.

---

## 2. Resumo das fases (ordem de execução)

- **Fase 1 — Quick wins críticos:** metadata, segurança (dangerouslySetInnerHTML), keys estáveis.  
- **Fase 2 — Alto impacto, esforço baixo/médio:** a11y headings, LazyMotion restante, Suspense + useSearchParams, code splitting recharts.  
- **Fase 3 — Limpeza e polish:** unused exports/types, useState lazy/derived, animação scale, useMemo trivial, unknown props, flash de hidratação, outros pontuais.  
- **Fase 4 — Refators pesados (só se quiser subir mais):** redirect no servidor, useEffect → event handlers, consolidar setState (useReducer/derived), remoção seleta de unused files.  
- **Fase 5 — Opcional (manutenibilidade):** componentes grandes e muitos useState.

---

## 3. Fase 1 — Quick wins críticos (≈35 avisos)

**Objetivo:** Máximo ganho de score e segurança com mudanças mínimas.

### 3.1 Page without metadata (23 páginas)

- **Arquivos:**  
  `app/households/page.tsx`, `app/households/[id]/members/invite/page.tsx`, `app/households/[id]/page.tsx`, `app/cats/new/page.tsx`, `app/test-notifications/page.tsx`, `app/schedules/page.tsx`, `app/weight/page.tsx`, `app/schedules/new/page.tsx`, `app/cats/page.tsx`, `app/feedings/new/page.tsx`, `app/offline/page.tsx`, `app/statistics/page.tsx`, `app/cats/[id]/edit/page.tsx`, `app/profile/edit/page.tsx`, `app/test-calendar/page.tsx`, `app/api-docs/page.tsx`, `app/feedings/page.tsx`, `app/notifications/page.tsx`, `app/households/new/page.tsx`, `app/households/[id]/edit/page.tsx`, `app/history/[id]/page.tsx`, `app/history/page.tsx`, `app/households/[id]/cats/page.tsx`.
- **Ação:**  
  - Se a página for Server Component: adicionar `export const metadata = pageMetadata('Título', 'Descrição')` (usar `@/lib/metadata`).  
  - Se for Client Component: criar wrapper em Server Component que exporte `metadata` e renderize o client (ex.: `PageClient`) — mesmo padrão já usado em login/signup/error.
- **Verificação:** Rodar React Doctor e confirmar queda dos 23 avisos “Page without metadata”.

### 3.2 dangerouslySetInnerHTML (1)

- **Arquivo:** `components/ui/chart.tsx` (linha 82).
- **Ação:** Garantir que o conteúdo injetado seja sanitizado ou gerado internamente (sem input do usuário). Se for de terceiros (ex.: lib de chart), considerar alternativa ou wrapper que sanitize. Documentar decisão no código.
- **Verificação:** Aviso “Do not use dangerouslySetInnerHTML” deve sumir após revisão/sanitização ou mudança de abordagem.

### 3.3 Array index as key (11)

- **Arquivos e locais:**  
  `components/feeding/feeding-schedule.tsx:43`, `app/households/page.tsx:80`, `components/feeding/upcoming-feedings.tsx:117`, `components/events-list.tsx:31`, `app/test-notifications/page.tsx:591`, `components/cat/cat-list.tsx:92`, `app/schedules/new/page.tsx:418`, `app/statistics/page.tsx:253`, `components/animated-list.tsx:47`, `components/weight/weight-trend-chart.tsx:340`, `app/history/page.tsx:214`.
- **Ação:** Trocar `key={index}` / `key={i}` por identificador estável: `key={item.id}`, `key={item.slug}` ou, para listas estáticas, `key={\`row-${index}\`}` / `key={\`skeleton-${index}\`}` conforme o caso. Evitar índice quando a lista for reordenada/filtrada.
- **Verificação:** Os 11 avisos “Array index used as key” devem desaparecer.

---

## 4. Fase 2 — Alto impacto, esforço baixo/médio (≈23 avisos)

### 4.1 Headings com conteúdo acessível (6)

- **Arquivos:** `components/ui/alert.tsx:39`, `components/ui/card.tsx:36`, `components/ui/typography.tsx:8,23,38,53`.
- **Ação:** Garantir que `<h*>` tenham texto ou conteúdo acessível a leitores de tela (não só espaços ou ícones). Se for componente de layout decorativo, considerar `role="presentation"` ou usar `<div>` com classe de estilo em vez de heading, quando semântica de título não se aplicar.
- **Verificação:** Avisos “Headings must have content and the content must be accessible” resolvidos.

### 4.2 LazyMotion (1)

- **Arquivo:** `src/pages.tsx:4` — usar `m` com LazyMotion em vez de `motion`.
- **Ação:** Garantir que o tree esteja dentro de `<LazyMotion features={domAnimation}>` e trocar `motion` por `m` nesse arquivo. Se `src/pages.tsx` for legado/não usado no App Router, considerar remover ou marcar como unused.
- **Verificação:** Aviso “Import m with LazyMotion instead of motion” resolvido.

### 4.3 useSearchParams sem Suspense (5)

- **Arquivos:** `app/statistics/page.tsx:280`, `app/error/ErrorPageContent.tsx:14`, `app/signup/SignupPageContent.tsx:21`, `app/login/LoginPageContent.tsx:23`, `app/join/JoinPageContent.tsx:22`.
- **Ação:** Garantir que o componente que chama `useSearchParams()` esteja envolvido em `<Suspense fallback={...}>` em um nível acima (ex.: no `page.tsx` que importa o *Content). Padrão já usado em login/signup; replicar onde ainda faltar.
- **Verificação:** Avisos “useSearchParams() requires a Suspense boundary” resolvidos.

### 4.4 recharts — code splitting (5)

- **Arquivos:** `components/ui/chart.tsx:5`, `app/statistics/page.tsx:12`, `app/components/dashboard/dashboard-content.tsx:11`, `components/weight/milestone-progress.tsx:10`, `components/weight/weight-trend-chart.tsx:5`.
- **Ação:** Carregar recharts com `next/dynamic(..., { ssr: false })` ou `React.lazy` no ponto de uso, para não aumentar o bundle da página inicial.
- **Verificação:** Avisos “recharts is a heavy library” resolvidos.

---

## 5. Fase 3 — Limpeza e polish (≈157 avisos)

### 5.1 Unused export (107)

- **Ação:** Por arquivo listado pelo Doctor: remover export não usado ou re-exportar onde for API pública. Focar primeiro em arquivos de app/components; libs e utils podem ser curados em lote.
- **Verificação:** Redução progressiva dos 107 avisos (não é obrigatório zerar de uma vez).

### 5.2 Unused type (34)

- **Ação:** Remover tipos não referenciados ou exportá-los apenas onde forem parte da API pública.
- **Verificação:** Redução dos avisos “Unused type”.

### 5.3 useState(now()) → lazy init (3)

- **Arquivos:** `app/weight/page.tsx:159`, `components/ui/simple-time-picker.tsx:69,70`.
- **Ação:** Trocar `useState(now())` por `useState(() => now())` para evitar executar na inicialização em todo render.
- **Verificação:** Avisos “useState(now()) calls initializer on every render” resolvidos.

### 5.4 scale: 0 em animação (4)

- **Arquivos:** `components/timeline-event.tsx:84,134`, `components/cat/cat-timeline.tsx:114`, `components/notification-badge.tsx:32`.
- **Ação:** Usar `initial={{ scale: 0.95, opacity: 0 }}` (ou equivalente) em vez de `scale: 0` para entrada mais natural.
- **Verificação:** Avisos “scale: 0 makes elements appear from nowhere” resolvidos.

### 5.5 useMemo trivial (2)

- **Arquivo:** `components/ui/simple-time-picker.tsx:63,76`.
- **Ação:** Remover `useMemo` onde a expressão for trivial (acesso a propriedade, operação simples).
- **Verificação:** Avisos “useMemo wrapping a trivially cheap expression” resolvidos.

### 5.6 Unknown property (3)

- **Arquivos:** `app/api-docs/page.tsx:98`, `components/ui/command.tsx:40`.
- **Ação:** Remover ou renomear props que não são atributos HTML/React válidos; se for prop de lib, usar spread em elemento nativo apenas com props conhecidos.
- **Verificação:** Avisos “Unknown property” resolvidos.

### 5.7 useState inicializado de prop (3)

- **Arquivos:** `components/weight/milestone-progress.tsx:122,123`, `components/weight/goal-form-sheet.tsx:60`.
- **Ação:** Se o valor deve acompanhar a prop, derivar no render (`const value = transform(prop)`). Manter useState só para estado local que pode divergir (ex.: draft do usuário).
- **Verificação:** Avisos “useState initialized from prop” resolvidos.

### 5.8 useEffect(setState, []) flash (4)

- **Arquivos:** `components/onboarding-wrapper.tsx:27`, `app/cats/[id]/client.tsx:73`, `app/components/cat-details.tsx:116,121`.
- **Ação:** Avaliar `useSyncExternalStore` ou ajuste de UI (ex.: skeleton) para evitar flash; em último caso documentar e, se aplicável, `suppressHydrationWarning` onde for seguro.
- **Verificação:** Redução dos avisos “useEffect(setState, []) on mount causes a flash”.

### 5.9 Outros pontuais

- **Evitar children como prop:** `app/weight/page.tsx:649` — preferir composição com filhos em JSX.
- **&lt;link rel="stylesheet"&gt;:** `app/api-docs/page.tsx:67` — importar CSS no bundle ou usar CSS Modules.
- **Inline render function:** `components/weight/recent-history-list.tsx:229,250` — extrair para componente nomeado.

---

## 6. Fase 4 — Refators pesados (opcional; ~38 + unused files)

### 6.1 Client-side redirect em useEffect (14)

- **Arquivos:** `components/layout/client-layout.tsx`, `app/households/[id]/members/invite/page.tsx`, `app/households/[id]/page.tsx`, `app/cats/new/page.tsx`, `app/schedules/new/page.tsx`, `app/cats/page.tsx`, `app/cats/[id]/edit/page.tsx`, `app/login/LoginPageContent.tsx`, `app/settings/page.tsx`, `app/HomeClient.tsx`, `app/households/new/page.tsx`, `components/auth/protected-route.tsx`, `app/households/[id]/edit/page.tsx`.
- **Ação:** Onde for possível, mover checagem de auth para Server Component e usar `redirect()` de `next/navigation`, ou tratar em middleware. Onde precisar de client, manter redirect mas documentar e considerar como débito técnico.
- **Verificação:** Redução dos 14 avisos (possível não zerar sem mudança grande de arquitetura).

### 6.2 useEffect simulando event handler (11)

- **Arquivos:** `components/ui/time-field.tsx:17`, `app/households/[id]/members/invite/page.tsx:65`, `components/feeding/new-feeding-sheet.tsx:158`, `app/schedules/new/page.tsx:109`, `app/settings/page.tsx:316,323`, `components/weight/recent-history-list.tsx:68`, `components/weight/milestone-progress.tsx:208`, `app/households/new/page.tsx:50`, `app/households/[id]/edit/page.tsx:43`, `components/weight/quick-log-panel.tsx:60`.
- **Ação:** Mover lógica condicional para handlers reais (onClick, onChange, onSubmit) em vez de reagir em useEffect a mudanças de estado/props.
- **Verificação:** Redução dos avisos “useEffect simulating an event handler”.

### 6.3 5+ setState em um useEffect (9)

- **Arquivos:** `app/households/[id]/members/invite/page.tsx:79`, `app/households/[id]/page.tsx:282`, `components/feeding/new-feeding-sheet.tsx:158`, `app/cats/[id]/edit/page.tsx:125`, `app/settings/page.tsx:323`, `components/weight/milestone-progress.tsx:179,228`, `app/households/[id]/edit/page.tsx:52`, `app/history/page.tsx:72`.
- **Ação:** Agrupar estado em um único objeto e usar `useReducer`, ou derivar o máximo possível no render.
- **Verificação:** Redução dos avisos “5 setState calls in a single useEffect”.

### 6.4 Unused file (122) — seletivo

- **Ação:** Não remover scripts de teste, ferramentas ou arquivos que são entry points (ex.: SW, offline). Remover apenas arquivos claramente mortos (backups, duplicatas, componentes substituídos e não referenciados). Revisar lista do Doctor e marcar “manter” / “remover” antes de deletar.
- **Verificação:** Redução dos avisos “Unused file” sem quebrar builds ou scripts.

---

## 7. Fase 5 — Opcional (manutenibilidade)

### 7.1 Componente muito grande (16)

- **Ação:** Extrair seções em subcomponentes (ex.: `<UserHeader />`, `<UserActions />`) nos arquivos listados pelo Doctor.
- **Verificação:** Avisos “Component is X lines” reduzidos ao longo do tempo.

### 7.2 Muitos useState (16)

- **Ação:** Onde fizer sentido, agrupar em `useReducer` ou estado derivado.
- **Verificação:** Avisos “has N useState calls” reduzidos.

---

## 8. Critérios de sucesso por fase

| Fase | Avisos alvo | Sucesso |
|------|-------------|--------|
| 1 | ~35 | Metadata + segurança + keys estáveis aplicados; novo run do Doctor confirma redução. |
| 2 | ~23 | Headings, LazyMotion, Suspense, recharts tratados; confirmação no Doctor. |
| 3 | ~157 | Redução progressiva de exports/tipos/lazy init/anim/useMemo/props/flash/outros. |
| 4 | ~38 + files | Redução de redirects/useEffect/setState e remoção seletiva de unused files. |
| 5 | 32 | Redução de “component too large” e “many useState” onde for viável. |

---

## 9. Ordem sugerida de execução

1. **Fase 1** → rodar `npx react-doctor . --verbose` e validar score e avisos.
2. **Fase 2** → rodar de novo e validar.
3. **Fase 3** em lotes (ex.: primeiro unused exports em `app/` e `components/`, depois tipos, depois anim/useState/useMemo).
4. **Fase 4** só se a meta for >90 ou limpeza máxima; **Fase 5** conforme capacidade.

Com Fases 1 e 2 bem aplicadas, a relação impacto/esforço (Pareto) já fica coberta na maior parte; o restante melhora score e manutenção de forma incremental.
