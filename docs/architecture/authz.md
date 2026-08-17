# Autorização de household

Um módulo, `lib/authz/household-access.ts`. Rotas v2 e páginas SSR não reimplementam `household_members.findFirst`.

## Helpers

| Função | Quando | Falha |
| --- | --- | --- |
| `requireHouseholdMember(userId, householdId)` | leitura/escrita no household | 403 |
| `requireHouseholdAdmin(userId, householdId)` | convite, PATCH do household, gerir membros (owner **ou** role admin) | 403 |
| `requireCatAccess(userId, catId)` | qualquer recurso amarrado a um gato | 404 se o gato não existe, 403 se o user não é membro |

Resultado discriminado:

```ts
{ ok: true, data } | { ok: false, response: NextResponse }
```

`response` já está no envelope `{ success: false, error }` (`v2Err`).

## Identidade

`MobileAuthUser.household_ids` lista **todos** os households do usuário. `household_id` continua sendo o primeiro, só por compatibilidade. Filtros do tipo “stats de alimentação” usam `household_ids`, não o primeiro ID.

`getAuthenticatedUser` em `lib/auth.ts` delega para `validateHybridAuth` (sessão Supabase ou JWT).

## Fora deste helper

O cron `scheduled-notifications/deliver` lista membros para broadcast — não é um check de “este user pode acessar este household”. Mutações de membership (`create` / `deleteMany`) também ficam na rota.
