# Plano: Adicionar coluna `gender` à tabela `cats`

**Data:** 2026-02-20  
**Regra crítica:** Não apagar ou recriar o banco em nenhum cenário. Apenas `ALTER TABLE ... ADD COLUMN`.

---

## 1. Objetivo

- Permitir armazenar o sexo do gato (ex.: macho/fêmea) no Supabase/PostgreSQL.
- Manter sincronização com o modelo local (Drift) e uso na UI (cor/ícone por gênero, l10n: `cats_genderMale`, `cats_genderFemale`).

---

## 2. Alteração no banco (Supabase)

### 2.1 Ferramenta recomendada: Supabase MCP

Usar **`apply_migration`** (não `execute_sql`) para DDL, conforme documentação do MCP.

- **Nome da migração (snake_case):** `add_gender_to_cats`
- **SQL:**

```sql
ALTER TABLE public.cats
  ADD COLUMN IF NOT EXISTS gender TEXT;
```

- **Por que é seguro:**  
  - Só adiciona uma coluna; não remove dados.  
  - `IF NOT EXISTS` evita erro se a coluna já existir (reexecução idempotente).  
  - Não há `DROP`, `TRUNCATE` nem `DELETE`.

### 2.2 Como aplicar via MCP

1. Abrir o Cursor com o projeto mealtime.
2. Chamar o MCP do Supabase:
   - **Server:** `user-supabase`
   - **Tool:** `apply_migration`
   - **Arguments:**
     - `name`: `add_gender_to_cats`
     - `query`: o SQL acima (uma linha ou múltiplas, desde que seja uma única string).

### 2.3 Verificação pós-migração (opcional)

- **Listar migrações:** MCP `list_migrations` — deve aparecer `add_gender_to_cats`.
- **Conferir tabela:** MCP `list_tables` com `schemas: ["public"]` (e, se o MCP expuser colunas, verificar se `cats` tem `gender`), ou rodar um SELECT em desenvolvimento:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cats'
ORDER BY ordinal_position;
```

---

## 3. Atualizar o schema Prisma

**Arquivo:** `prisma/schema.prisma`

- No model `cats`, adicionar (por exemplo após `restrictions`):

```prisma
  restrictions     String?
  gender           String?           // "male" | "female" | null
  notes            String?
```

- **Não** rodar `prisma migrate dev` que crie uma nova migração que altere o banco: o banco já foi alterado pelo Supabase MCP. Opções:
  - Apenas rodar `prisma db pull` para refrescar o schema a partir do banco, **ou**
  - Inserir manualmente o campo `gender` no `schema.prisma` como acima e rodar `prisma generate` para atualizar o client.

---

## 4. Tipos e validação no app (TypeScript)

### 4.1 Tipos base

| Arquivo | Alteração |
|--------|-----------|
| `lib/types/common.ts` | Em `BaseCat`: adicionar `gender?: 'male' \| 'female' \| null`. Em `BaseCats`: adicionar `gender?: string \| null`. |
| `lib/types.ts` | Em `CatType`: adicionar `gender?: 'male' \| 'female' \| null`. |
| `lib/database.types.ts` | Em `cats.Row`, `cats.Insert`, `cats.Update`: adicionar `gender: string \| null` (e em Insert/Update como opcional). |

### 4.2 Validação (Zod)

| Arquivo | Alteração |
|--------|-----------|
| `lib/validations/cats.ts` | Em `createCatSchema`: `gender: z.enum(['male', 'female']).optional().nullable()`. |
| `lib/dto/cat.dto.ts` | Em `createCatDtoSchema`: mesmo enum opcional/nullable para `gender`. |

### 4.3 APIs que leem/escrevem `cats`

Incluir `gender` em:

- **Selects Prisma** que listam colunas de `cats` (evitar `select: true` genérico onde se queira controle fino).
- **Respostas JSON** que mapeiam `cat` para o cliente (ex.: `photo_url` → `photoUrl`, `birth_date` → `birthdate`): adicionar `gender` (ou `gender: cat.gender`).
- **Payloads de criação/atualização:** aceitar `gender` no body e gravar em `gender` no banco.

Arquivos a revisar (onde já existem mapeamentos de campos de `cats`):

- `app/api/households/[id]/cats/route.ts` — GET (select + resposta), POST (body → create)
- `app/api/households/[id]/cats/[catId]/route.ts` — GET, PATCH (body → update)
- `app/api/v2/households/[id]/cats/route.ts` — select, create, resposta
- `app/api/v2/cats/[catId]/route.ts` — select, update
- `app/api/v2/cats/route.ts` — select, create
- `app/api/cats/route.ts` — select, create
- `app/api/cats/[catId]/route.ts` — select, update
- `app/api/mobile/cats/route.ts` — select, create
- `app/api/feedings/route.ts`, `app/api/feedings/[id]/route.ts`, `app/api/v2/feedings/**` — selects de `cat` (ex.: `photo_url`, `name`); adicionar `gender` nos selects que retornam dados do gato para o cliente.
- `app/api/v2/feedings/cats/route.ts`, `app/api/feedings/cats/route.ts` — mapeamento de cat para resposta.
- `app/api/v2/households/[id]/route.ts`, `app/api/households/[id]/route.ts` — listagem de cats do household.
- `app/api/households/[id]/members/[userId]/route.ts` — se retornar dados de cats.

Em cada um: adicionar `gender: true` no `select` onde houver select explícito de colunas de `cats`, e incluir `gender` no objeto de resposta quando o front precisar (UI/relatórios).

### 4.4 Serviços que mapeiam resposta da API para tipos do app

- `lib/services/apiService.ts` — em `fetchCatsForHousehold` (e qualquer outro que monte `CatType` a partir da API): mapear `gender` da resposta para o tipo (ex.: `mappedCat.gender = cat.gender ?? null`).

---

## 5. UI e l10n

- **Traduções:** Garantir chaves como `cats_genderMale` e `cats_genderFemale` nos arquivos de l10n (e usá-las onde for exibir “Macho”/“Fêmea”).
- **Formulários:** Incluir campo opcional “Sexo” (select ou radio: male/female/vazio) na criação/edição de gato.
- **Exibição:** Usar `gender` para cor/ícone por gênero onde já estiver planejado no design.

---

## 6. Ordem sugerida de execução

1. Aplicar migração no Supabase via MCP (`apply_migration`).
2. Atualizar `prisma/schema.prisma` (e `prisma generate` ou `db pull`).
3. Atualizar tipos em `lib/types/common.ts`, `lib/types.ts`, `lib/database.types.ts`.
4. Atualizar `lib/validations/cats.ts` e `lib/dto/cat.dto.ts`.
5. Atualizar rotas de API (select + resposta + body) e `lib/services/apiService.ts`.
6. Ajustar UI (formulários, exibição, l10n).

---

## 7. Checklist rápido

- [ ] Migração aplicada no Supabase (sem DROP/TRUNCATE/DELETE).
- [ ] Prisma schema com `gender String?`.
- [ ] `BaseCat`, `BaseCats`, `CatType` e `database.types.ts` com `gender`.
- [ ] Schemas Zod (create/update) com `gender` opcional.
- [ ] APIs de cats e de feedings/households que retornam cat atualizadas (select + resposta).
- [ ] apiService (mapeamento) atualizado.
- [ ] UI e l10n (form + exibição + chaves).

---

## 8. Referência SQL (cópia rápida)

```sql
ALTER TABLE public.cats
  ADD COLUMN IF NOT EXISTS gender TEXT;
```
