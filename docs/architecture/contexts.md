# Contexts

Dados de domínio (gatos, alimentações, agendas, peso, households) vêm do **React Query** em `lib/hooks/domain`. Os Contexts não são mais a fonte da verdade.

## O que o Context ainda faz

- **UserContext**: sessão Supabase, perfil, household atual.
- **CatsContext / FeedingContext / WeightContext / HouseholdContext**: fachada. O provider de gatos, por exemplo, só reexporta `useCatsQuery` (`state`, `catsMap`, `forceRefresh`). Mutações invalidam `domainKeys.*`.
- **Haptics / Error / Loading**: estado de UI, não de servidor.

## O que não fazer

- Não colocar `dispatch` de CRUD no Context. Use a mutation do hook de domínio e `invalidateQueries`.
- Não buscar `/api/v2` com `fetch` cru nos hooks de domínio — use `v2Get` / `v2Post` / `v2Put` / `v2Delete`.
- Não copiar membership `prisma.household_members.findFirst` nas páginas; o SSR usa `requireCatAccess` / `requireHouseholdMember`.
