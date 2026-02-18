# Mapa de fluxos de usuário para E2E (MealTime)

Documento gerado a partir do mapeamento com browser e do código (rotas, page objects, componentes). Uso: implementar/corrigir testes E2E e alinhar seletores com a UI real.

**Convenções**: App em PT-BR. Seletores preferidos: `getByRole`, `getByLabel`, `getByPlaceholder`, texto visível. IDs dinâmicos: obter da lista ou do redirect após criar recurso.

---

## Índice

1. [Auth](#1-auth)
2. [Proteção de rotas](#2-proteção-de-rotas)
3. [Onboarding / Home vazia](#3-onboarding--home-vazia)
4. [Home (Dashboard)](#4-home-dashboard)
5. [Households](#5-households)
6. [Cats](#6-cats)
7. [Feedings](#7-feedings)
8. [Schedules](#8-schedules)
9. [Weight](#9-weight)
10. [Statistics](#10-statistics)
11. [History](#11-history)
12. [Profile](#12-profile)
13. [Notifications](#13-notifications)
14. [Settings](#14-settings)
15. [Join (convite)](#15-join-convite)
16. [Error / Offline](#16-error--offline)

---

## 1. Auth

### 1.1 Login (email/senha)

| Campo | Valor |
|-------|--------|
| **Objetivo** | Usuário entra com email e senha. |
| **Pré-condições** | Nenhuma. |
| **URL** | `/login` (query opcional: `callbackUrl`, `redirectTo`) |
| **Título da página** | "Entrar \| MealTime" |
| **Passos** | 1. Acessar `/login`. 2. Preencher email e senha. 3. Clicar em "Entrar com Email". |
| **Seletores estáveis** | `input#email`, `input#password`, `button[type="submit"]` com texto "Entrar com Email"; `getByLabel('Email')`, `getByLabel('Senha')`; link "Registre-se"; `[data-testid="login-page"]`; alert `[role="alert"]` para erro. |
| **Critério de sucesso** | Redirect para `redirectTo` ou `/`; ou mensagem de erro em `[role="alert"]`. |
| **Spec / Page object** | `tests/auth.spec.ts`, `tests/pages/login-page.ts` |

### 1.2 Login com Google

| Campo | Valor |
|-------|--------|
| **Objetivo** | Iniciar OAuth Google. |
| **Passos** | Clicar em "Entrar com Google". Redirecionamento externo. |
| **Seletores** | `getByRole('button', { name: /google/i })`. |
| **Spec** | `auth.spec.ts` (link presente); fluxo completo depende de conta Google. |

### 1.3 Signup

| Campo | Valor |
|-------|--------|
| **Objetivo** | Criar conta com email/senha ou Google. |
| **Pré-condições** | Nenhuma. |
| **URL** | `/signup` |
| **Título da página** | "Cadastro \| MealTime" |
| **Passos** | 1. Acessar `/signup` (ou clicar "Registre-se" no login). 2. Nome, email, senha, confirmar senha. 3. "Criar conta com Email". |
| **Seletores estáveis** | `input#name`, `input#email`, `input#password`, `input#confirmPassword`; `getByLabel('Nome Completo')`, `getByLabel('Email')`, etc.; botão "Criar conta com Email"; link "Entre aqui" para voltar ao login. |
| **Critério de sucesso** | Toast de sucesso e instrução para confirmar email; ou toast de erro (senhas não coincidem, &lt; 6 caracteres, etc.). |
| **Spec / Page object** | `auth.spec.ts` (navegação login→signup); `tests/pages/signup-page.ts`. **Nota**: Page object usa `has-text("Registrar")`/"Cadastrar" no submit; na UI o texto é **"Criar conta com Email"** — alinhar seletor. |

### 1.4 Logout

| Campo | Valor |
|-------|--------|
| **Objetivo** | Encerrar sessão. |
| **Pré-condições** | Usuário autenticado. |
| **Passos** | Menu (header) → "Sair" / "Log out". |
| **Seletores** | Menu no `app-header`; item de menu com texto de logout. |
| **Critério de sucesso** | Redirect para `/login` ou home pública. |
| **Spec** | A implementar (logout explícito). |

---

## 2. Proteção de rotas

| Campo | Valor |
|-------|--------|
| **Objetivo** | Rotas protegidas redirecionam para login quando não autenticado. |
| **Pré-condições** | Sem cookies de auth (storage state vazio). |
| **Passos** | Acessar `/`, `/cats`, `/households`, `/feedings`, `/schedules`, `/weight`, `/statistics`, `/profile`, `/settings`, etc. |
| **Comportamento observado** | Redirect para `/login?redirectTo=%2F<path>` (ex.: `/login?redirectTo=%2Fcats`). Título "Entrar \| MealTime". |
| **Critério de sucesso** | URL contém `/login` e opcionalmente `redirectTo`. |
| **Spec** | `auth.spec.ts` ("Protected Routes - Error Handling": redirect unauthenticated users). |

---

## 3. Onboarding / Home vazia

| Campo | Valor |
|-------|--------|
| **Objetivo** | Usuário logado sem household (ou sem gatos) vê CTAs para configurar. |
| **Pré-condições** | Autenticado; sem residência ou sem gatos. |
| **URL** | `/` (e possivelmente `/weight`, `/feedings`, `/schedules`) |
| **Passos** | Após login, acessar home ou páginas que dependem de household/cats. |
| **Seletores** | Links "Ir para Configurações de Residência" (`/households`), "Cadastrar Meu Primeiro Gato" (`/cats/new`) em `HomeClient.tsx` e `WeightPageContent.tsx`. |
| **Critério de sucesso** | Mensagem de estado vazio e links visíveis. |
| **Spec** | Parcial em `e2e-complete.spec.ts` (botão "Pular"/"Próximo" para onboarding). |

---

## 4. Home (Dashboard)

| Campo | Valor |
|-------|--------|
| **Objetivo** | Timeline de cuidados com gatos (Cat Care Timeline). |
| **Pré-condições** | Autenticado. |
| **URL** | `/` |
| **Título da página** | "Início \| MealTime" |
| **Passos** | Acessar `/` (ou clicar "Início" no bottom-nav). |
| **Seletores** | `h1` com texto "Cat Care Timeline"; componente `CatTimeline`; bottom-nav com "Início", "Gatos", "Domicílios", "Agenda", "Peso", "Estatísticas". |
| **Critério de sucesso** | Heading "Cat Care Timeline" visível; com dados: timeline com eventos; sem dados: estado vazio com links. |
| **Spec / Page object** | `tests/dashboard.spec.ts`, `tests/pages/dashboard-page.ts` (alguns testes em skip). |

---

## 5. Households

### 5.1 Lista

| Campo | Valor |
|-------|--------|
| **URL** | `/households` |
| **Título** | "Minhas Residências" (PageHeader). |
| **Seletores** | `getByRole('heading', { name: /minhas residências/i })`; link "Criar Nova" ou `a[href="/households/new"]`; cards de residência; link "Gerenciar" por card. |
| **Estado vazio** | "Nenhuma Residência"; botão "Criar Nova". |
| **Spec** | `households.spec.ts`, `household-pages.ts`. |

### 5.2 Novo domicílio

| Campo | Valor |
|-------|--------|
| **URL** | `/households/new` |
| **Título** | "Novo Domicílio" (h1). |
| **Passos** | Preencher nome (e descrição se existir); clicar em criar. Redirect para `/households/[id]`. |
| **Seletores** | Input nome; botão de criar (texto do botão no componente). |
| **Critério de sucesso** | Redirect para `/households/[id]`; toast de sucesso. |
| **Spec** | `households.spec.ts` (criação via UI e via API). |

### 5.3 Detalhe do domicílio

| Campo | Valor |
|-------|--------|
| **URL** | `/households/[id]` (id = UUID do household). |
| **Conteúdo** | Nome da residência (h1); lista de gatos; ações: Editar, Convidar Membros. |
| **Seletores** | `h1` com nome; link/button "Editar Residência"; "Convidar Novo Membro" / "Convidar Membros"; "Adicionar Gato" (`/cats/new?householdId=...`). |
| **Spec** | Fluxo em `e2e-households.spec.ts`; page objects em `household-pages.ts`. |

### 5.4 Editar residência

| Campo | Valor |
|-------|--------|
| **URL** | `/households/[id]/edit` |
| **Título** | "Editar Residência". |
| **Passos** | Alterar nome/descrição; Salvar. Redirect para `/households/[id]`. |
| **Seletores** | `HouseholdEditPage`: botão Salvar, Cancelar, Opções (excluir/sair). |
| **Spec** | Page object `HouseholdEditPage`; spec a expandir. |

### 5.5 Convidar membros

| Campo | Valor |
|-------|--------|
| **URL** | `/households/[id]/members/invite` |
| **Título** | "Convidar Membros" (h1); card "Convidar por E-mail". |
| **Passos** | Inserir e-mail; enviar convite. |
| **Seletores** | `getByRole('heading', { name: /convidar membros/i })`; input email; botão enviar. |
| **Spec** | A implementar (fluxo de convite + join). |

---

## 6. Cats

### 6.1 Lista

| Campo | Valor |
|-------|--------|
| **URL** | `/cats` |
| **Título** | "Meus Gatos" (PageHeader). |
| **Seletores** | `getByRole('heading', { name: /meus gatos/i })`; `a[href="/cats/new"]` ou botão "Adicionar Gato"; cards com nome do gato. |
| **Estado vazio** | "Nenhum gato cadastrado" ou "Sem residência"; link "Cadastrar Gato". |
| **Spec** | `cats.spec.ts`, `e2e-cats.spec.ts`, `cats-page.ts`. |

### 6.2 Novo gato

| Campo | Valor |
|-------|--------|
| **URL** | `/cats/new` (query opcional: `householdId`) |
| **Passos** | Nome, data nascimento, peso, etc.; submeter. Redirect para `/cats/[id]` ou `/cats`. |
| **Seletores** | `CatNewPage`: inputs por label; botão submit. |
| **Spec** | `e2e-cats.spec.ts`, `cat-new-page.ts`. |

### 6.3 Detalhe do gato

| Campo | Valor |
|-------|--------|
| **URL** | `/cats/[id]` |
| **Passos** | Ver perfil; "Editar"; "Registrar Alimentação" (sheet/drawer). |
| **Seletores** | Link/button "Editar"; botão "Registrar Alimentação"; dados do gato. |
| **Spec** | `cat-detail-page.ts`; specs que navegam para detalhe. |

### 6.4 Editar gato

| Campo | Valor |
|-------|--------|
| **URL** | `/cats/[id]/edit` |
| **Passos** | Alterar dados; Salvar → `/cats/[id]` ou Cancelar → `/cats`. |
| **Seletores** | `CatEditPage`: save, cancel, delete. |
| **Spec** | `cat-edit-page.ts`. |

---

## 7. Feedings

### 7.1 Lista (Histórico de Alimentações)

| Campo | Valor |
|-------|--------|
| **URL** | `/feedings` |
| **Título** | "Histórico de Alimentações" (PageHeader). |
| **Seletores** | `h1` ou PageHeader com "Histórico de Alimentações"; `a[href="/feedings/new"]` ou "Registrar Alimentação"; timeline/lista de itens; estado vazio "Nenhum registro encontrado" / "Nenhuma alimentação". |
| **Spec** | `feedings.spec.ts`, `feedings-page.ts`. **Nota**: teste "navigate to create new feeding page" está em skip — investigar (link ou sheet). |

### 7.2 Nova alimentação

| Campo | Valor |
|-------|--------|
| **URL** | `/feedings/new` (ou sheet/modal a partir de feedings/cat detail). |
| **Passos** | Selecionar gato; tipo refeição; quantidade; data/hora; status; submeter. |
| **Seletores** | Form em `FeedingForm`; botão "Registrar Alimentação" (ou "Registrando..."); link "Ir para Configurações" se sem gatos. |
| **Spec** | `feeding-new-page.ts`; teste de navegação em skip. |

---

## 8. Schedules

### 8.1 Lista

| Campo | Valor |
|-------|--------|
| **URL** | `/schedules` |
| **Título** | "Agendamentos" (PageHeader). |
| **Seletores** | PageHeader "Agendamentos"; actionLabel "Novo Agendamento" (link/button); "Agendamentos Ativos"; "Próximas Alimentações Agendadas"; estado vazio: "Cadastrar Gato" ou "Criar Primeiro Agendamento". |
| **Spec** | A implementar (page object e spec dedicados). |

### 8.2 Novo agendamento

| Campo | Valor |
|-------|--------|
| **URL** | `/schedules/new` |
| **Título** | "Novo Agendamento". |
| **Passos** | Tipo de agendamento; gato; horários; etc.; "Criar Agendamento". Redirect para `/schedules`. Toast "Agendamento criado com sucesso!". |
| **Seletores** | Form labels; botão "Criar Agendamento" / "Criando..."; link "Ir para Configurações" se sem gatos. |
| **Spec** | A implementar. |

---

## 9. Weight

| Campo | Valor |
|-------|--------|
| **URL** | `/weight` |
| **Título** | "Painel de Peso" ou "Painel de Acompanhamento de Peso" (h1). |
| **Passos** | Página: seleção de gato; abas de período; "Registrar Peso" (abre dialog); "Nova Meta de Peso" / "Definir Meta" (dialog). |
| **Seletores** | `page.locator('h1:has-text("Painel de Peso")')` ou "Painel de Acompanhamento de Peso"; `button:has-text("Registrar Peso")`; `button:has-text("Nova Meta de Peso")` ou "Nova Meta"; dialog `[role="dialog"]` com "Registrar Novo Peso", "Salvar Registro", "Cancelar". |
| **Page objects** | `WeightPage`, `WeightRegisterDialog`, `WeightGoalDialog` em `weight-page.ts`. |
| **Spec** | `e2e-weight.spec.ts`. |

---

## 10. Statistics

| Campo | Valor |
|-------|--------|
| **URL** | `/statistics` |
| **Conteúdo** | Gráficos e totais; filtros; link "Registrar Alimentação"; sem auth: botão "Fazer Login"; link para `/settings`. |
| **Seletores** | Heading/título da página; filtros; link para feedings/settings. |
| **Spec** | A implementar. |

---

## 11. History

| Campo | Valor |
|-------|--------|
| **URL** | `/history` (lista); `/history/[id]` (detalhe de evento). |
| **Título** | "Histórico de Alimentações" (h1). |
| **Passos** | Lista de eventos; clicar em item → detalhe. Link "Registrar Alimentação" (`/feedings/new`). |
| **Seletores** | `h1:has-text("Histórico de Alimentações")`; links para itens; link "Registrar Alimentação". |
| **Spec** | A implementar. |

---

## 12. Profile

| Campo | Valor |
|-------|--------|
| **URL** | `/profile` |
| **Conteúdo** | Avatar; nome; botão "Editar perfil" (`/profile/edit`). |
| **URL editar** | `/profile/edit` |
| **Seletores** | Avatar; heading com nome; link/button "Editar perfil". |
| **Spec** | A implementar. |

---

## 13. Notifications

| Campo | Valor |
|-------|--------|
| **URL** | `/notifications` |
| **Título** | "Notificações" (h1). |
| **Seletores** | `h1:has-text("Notificações")`; lista de notificações (convites, etc.). |
| **Spec** | A implementar. |

---

## 14. Settings

| Campo | Valor |
|-------|--------|
| **URL** | `/settings` |
| **Comportamento** | Se não autenticado: redirect para `/login` ou `/households` (conforme implementação). Se autenticado: seções (ex.: residência, perfil); botão "Sair" (logout). |
| **Seletores** | `SettingsPage`: `householdSection`, `profileSection`, `logoutButton`. |
| **Spec** | `settings.spec.ts`; page object `settings-page.ts`. |

---

## 15. Join (convite)

| Campo | Valor |
|-------|--------|
| **URL** | `/join` (query: `code` com código de convite, opcional). |
| **Objetivo** | Usuário autenticado insere código (ou usa `code` na URL) e entra no domicílio. |
| **Passos** | Acessar `/join?code=...` ou abrir `/join` e preencher código; submeter. API `POST /api/households/join` com `inviteCode`. |
| **Critério de sucesso** | Toast "Você entrou no domicílio com sucesso!"; dispatch do household; redirect. |
| **Seletores** | Input para código; botão de enviar/entrar. |
| **Spec** | A implementar (fluxo completo: convite + join). |

---

## 16. Error / Offline

### 16.1 Página de erro

| Campo | Valor |
|-------|--------|
| **URL** | `/error` (query opcional: `message`). |
| **Conteúdo** | Mensagem de erro; botões "Tentar novamente", "Ir para Home"; retry count em sessionStorage. |
| **Seletores** | `h1`; `[role="alert"]` ou Alert; links/buttons. |
| **Spec** | A implementar. |

### 16.2 Offline

| Campo | Valor |
|-------|--------|
| **URL** | `/offline` |
| **Título** | "Você está offline" (h1). |
| **Spec** | A implementar. |

---

## Resumo de specs existentes e gaps

| Área | Spec | Status |
|------|------|--------|
| Auth | `auth.spec.ts` | Ok (login, signup link, redirect, API); logout e signup completo a reforçar. |
| Dashboard | `dashboard.spec.ts` | Vários skip; alinhar com storage state e household. |
| Cats | `cats.spec.ts`, `e2e-cats.spec.ts` | Ok; detalhe/edição cobertos por page objects. |
| Households | `households.spec.ts`, `e2e-households.spec.ts` | Ok (lista, criar); convite e join a implementar. |
| Feedings | `feedings.spec.ts` | Navegação para new em skip. |
| Weight | `e2e-weight.spec.ts` | Ok. |
| Schedules | — | Page object/spec a implementar. |
| Statistics, History, Profile, Notifications | — | A implementar. |
| Settings | `settings.spec.ts` | Básico. |
| Join, Error, Offline | — | A implementar. |

**Ajustes sugeridos em page objects**

- **Signup**: Submit button — usar texto "Criar conta com Email" (ou regex) em vez de "Registrar"/"Cadastrar".
- **Weight**: Título pode ser "Painel de Acompanhamento de Peso" ou "Painel de Peso"; usar regex nos locators.
- **Feedings**: Confirmar se "nova alimentação" é página `/feedings/new` ou sheet; ajustar `clickAddFeeding` e expectativas.
