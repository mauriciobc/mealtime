# Arquitetura do MealTime

O MealTime é um app Next.js para registrar alimentação, peso e rotina de gatos em um household compartilhado.

## Stack

- **Next.js 16** (App Router)
- **Supabase Auth** (sessão no browser + JWT no mobile). Não usamos NextAuth.
- **Prisma** no Postgres
- **React Query** para dados de domínio (gatos, feedings, schedules, peso, households)
- **Context** só como fachada: sessão do usuário, haptics, e wrappers finos em cima do React Query
- **Tailwind + shadcn/ui**

## Onde mora cada regra

| Regra | Dono |
| --- | --- |
| Autorização de household / gato | `lib/authz/household-access.ts` — ver [authz.md](./authz.md) |
| Contrato de escrita de gato | `lib/validations/cats.ts` |
| Fetch HTTP v2 | `lib/api/v2-client.ts` + envelope `lib/responses/v2-json.ts` |
| Tradução snake_case → tipos da UI | `lib/mappers/` |
| Query keys de domínio | `lib/hooks/domain/query-keys.ts` |

## Estrutura

```
app/                 # páginas e rotas (API viva em app/api/v2)
components/          # UI por domínio
lib/authz/           # membership e acesso a gato
lib/hooks/domain/    # React Query
lib/mappers/         # um mapper por recurso
lib/validations/     # Zod
```

A API v1 (`/api/cats`, `/api/feedings`, …) está desligada: o proxy responde **410**. Clientes novos usam `/api/v2/*`.
