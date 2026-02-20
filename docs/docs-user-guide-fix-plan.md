# Plano de correção da documentação (markdown) – User Guide

## Visão geral

Corrigir a documentação em markdown do guia do usuário: **separar idiomas (sem conteúdo bilíngue nas mesmas páginas)**, garantir troubleshooting acessível, corrigir texto de contato, atualizar README e tratar imagens quebradas.

---

## 1. Separar idiomas (remover instruções bilíngues)

**Objetivo:** Cada página deve ter um único idioma. Nada de seções "### Portuguese" / "### English" no mesmo arquivo nem traduções entre parênteses no texto (ex.: "Clique em 'Criar' (Create)").

**Regra:**
- **Arquivos em português** (`docs/user-guide/*.md`, exceto pasta `en/`): apenas conteúdo em português. Remover todas as seções "### English", tabelas em inglês e blocos em inglês. Títulos apenas em português (ex.: "Criando uma Conta", não "Criando uma Conta / Creating an Account").
- **Arquivos em inglês** (`docs/user-guide/en/*.md`): apenas conteúdo em inglês. Remover todas as seções "### Portuguese" / "### Português", tabelas em português e blocos em português. Instruções referenciando UI devem usar apenas o texto em inglês (ex.: "Click 'Create account with Email'" em vez de "Click 'Criar conta com Email' (Create account with Email)"). Títulos apenas em inglês.

**Exemplo do que remover / como fica:**

Antes (bilíngue no mesmo bloco):
```markdown
### Portuguese
1. Na tela inicial, clique em "Ir para configurações de residência"
2. Ou vá para /households/new
...

### English
1. On the home screen, click "Ir para configurações de residência" (Go to household settings)
2. Or go to /households/new
...
```

Depois em **PT** (apenas em `docs/user-guide/households/creating-households.md`):
```markdown
1. Na tela inicial, clique em "Ir para configurações de residência"
2. Ou vá para /households/new
3. Digite um nome para a residência (ex: "Casa Principal")
4. Clique em "Criar"
```

Depois em **EN** (apenas em `docs/user-guide/en/households/creating-households.md`):
```markdown
1. On the home screen, click "Go to household settings"
2. Or go to /households/new
3. Enter a name for the household (e.g., "Main House")
4. Click "Create"
```

**Arquivos a refatorar (PT – remover todo conteúdo em inglês):**
- `docs/user-guide/README.md`
- `docs/user-guide/getting-started.md`
- `docs/user-guide/cats/managing-cats.md`
- `docs/user-guide/cats/cat-profiles.md`
- `docs/user-guide/feeding/recording-feedings.md`
- `docs/user-guide/feeding/feeding-history.md`
- `docs/user-guide/households/creating-households.md`
- `docs/user-guide/households/managing-members.md`
- `docs/user-guide/households/joining-household.md`
- `docs/user-guide/schedules/managing-schedules.md`
- `docs/user-guide/weight/tracking-weight.md`
- `docs/user-guide/weight/weight-goals.md`
- `docs/user-guide/statistics.md`
- `docs/user-guide/notifications.md`
- `docs/user-guide/profile-settings.md`
- `docs/user-guide/troubleshooting.md`

**Arquivos a refatorar (EN – remover todo conteúdo em português):**  
Todos os equivalentes em `docs/user-guide/en/` (getting-started, cats/*, feeding/*, households/*, schedules/*, weight/*, statistics, notifications, profile-settings, troubleshooting, README). Os arquivos EN que já forem só em inglês devem ser revisados para remover qualquer referência a texto de UI em português (usar só labels em inglês).

**Detalhes:**
- Em PT: manter apenas tabelas, listas e parágrafos em português; remover cabeçalhos duplos tipo "X / Y".
- Em EN: idem; se o app exibir UI em inglês, usar esse texto; se o app for só PT, definir convenção (ex.: sempre descrever em inglês: "the 'Criar' (Create) button" ou só "the Create button").
- Links internos entre páginas (ex.: `[Solução de problemas](/docs/troubleshooting)`) permanecem; em EN usar `/docs/en/...`.

---

## 2. Troubleshooting na navegação e rotas estáticas

- Garantir que "Solução de Problemas" / "Troubleshooting" esteja em `DOCS_STRUCTURE_PT` e `DOCS_STRUCTURE_EN` em [app/docs/[[...slug]]/page.tsx](app/docs/[[...slug]]/page.tsx). `generateStaticParams` já deriva dos itens dessas estruturas.
- Verificar que `/docs/troubleshooting` e `/docs/en/troubleshooting` abrem corretamente.

---

## 3. Frase de contato (troubleshooting PT)

Em [docs/user-guide/troubleshooting.md](docs/user-guide/troubleshooting.md), na seção de contato, usar apenas:
`Se o problema persistir, entre em contato com o suporte pelas configurações do app ou por e-mail: support@mealtime.app`

---

## 4. README do guia – idioma English

Em [docs/user-guide/README.md](docs/user-guide/README.md), trocar:
- `- [English](/docs/en) - Coming soon`  
por algo como:  
- `- [English](/docs/en) - English version`

---

## 5. Imagens (screenshots)

- Criar `public/user-guide/assets/screenshots/`.
- Criar `public/user-guide/assets/screenshots/README.md` listando os 12 arquivos PNG referenciados nos .md (signup.png, login.png, cats-list.png, households.png, dashboard.png, dashboard-fab.png, feedings-history.png, cats-new.png, schedules.png, statistics.png, weight.png, settings.png) e, opcionalmente, uma linha descrevendo o que cada screenshot deve mostrar.
- Opcional: adicionar placeholders PNG com esses nomes para evitar 404 até as screenshots reais existirem.

---

## Ordem sugerida de execução

1. Refatorar todos os .md para separação de idiomas (PT só em `docs/user-guide/`, EN só em `docs/user-guide/en/`).
2. Ajustes em `page.tsx` (troubleshooting na sidebar, se ainda faltar), frase de contato em `troubleshooting.md`, e README (English disponível).
3. Criar pasta de screenshots e README (e opcionalmente placeholders).
4. Verificar no navegador: `/docs`, `/docs/troubleshooting`, `/docs/en`, `/docs/en/troubleshooting` e uma página com imagem.
