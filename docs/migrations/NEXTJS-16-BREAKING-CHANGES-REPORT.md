# Relatório de Breaking Changes - Next.js 16

**Data:** 2025-01-27  
**Versão Atual:** Next.js 16.1.0  
**Status:** Análise Completa

## Resumo Executivo

Este documento lista todos os breaking changes do Next.js 16 que afetam o projeto Mealtime e o status de cada um. A maioria das mudanças críticas já foi implementada, mas há algumas configurações e ajustes pendentes.

---

## ✅ Breaking Changes Já Implementados

### 1. **`proxy.ts` (antigo `middleware.ts`)**
- **Status:** ✅ **IMPLEMENTADO**
- **Arquivo:** `proxy.ts`
- **Detalhes:** O projeto já usa `proxy.ts` corretamente com a função `proxy` exportada. A migração de `middleware.ts` para `proxy.ts` foi concluída.

### 2. **Async `params` em Pages e API Routes**
- **Status:** ✅ **IMPLEMENTADO**
- **Detalhes:** Todas as páginas e rotas de API já estão usando `await params` ou `use(params)` corretamente:
  - Páginas: `app/cats/[id]/page.tsx`, `app/households/[id]/page.tsx`, etc.
  - API Routes: Todas as rotas dinâmicas já fazem `await context.params`
- **Exemplo Correto:**
```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  // ...
}
```

### 3. **Async `cookies()` em Server Components e API Routes**
- **Status:** ✅ **IMPLEMENTADO**
- **Detalhes:** Todos os usos de `cookies()` já estão usando `await cookies()`:
  - `app/api/feedings/batch/route.ts`
  - `app/api/households/[id]/route.ts`
  - `app/api/users/[id]/preferences/route.ts`
  - E outros...

### 4. **Async `headers()` em Server Components e API Routes**
- **Status:** ✅ **IMPLEMENTADO**
- **Detalhes:** Todos os usos de `headers()` já estão usando `await headers()`:
  - `app/api/feedings/route.ts`
  - `app/api/schedules/route.ts`
  - `app/api/weight-logs/route.ts`
  - E outros...

### 5. **`searchParams` em Pages**
- **Status:** ✅ **NÃO APLICA** (usando `useSearchParams()`)
- **Detalhes:** O projeto não usa `searchParams` como prop em páginas Server Components. Todas as páginas que precisam de search params usam o hook `useSearchParams()` do cliente, que é a abordagem correta.

---

## ⚠️ Breaking Changes que Precisam de Ajustes

### 1. **Configuração `next/image` - `minimumCacheTTL`**

**Status:** ⚠️ **PRECISA ATUALIZAÇÃO**

**Problema:**
- O padrão do Next.js 16 mudou de `60s` para `14400s` (4 horas)
- O projeto está usando `minimumCacheTTL: 60` explicitamente

**Arquivo:** `next.config.mjs` (linha 44)

**Ação Necessária:**
- Decidir se quer manter `60` (comportamento antigo) ou atualizar para `14400` (novo padrão)
- Se manter `60`, adicionar comentário explicando a escolha
- Se atualizar para `14400`, remover a configuração explícita ou atualizar o valor

**Recomendação:** Manter `60` se houver necessidade de revalidação mais frequente, ou atualizar para `14400` para melhor performance.

### 2. **Configuração `next/image` - `imageSizes`**

**Status:** ⚠️ **PRECISA ATUALIZAÇÃO**

**Problema:**
- O Next.js 16 removeu `16` dos tamanhos padrão (usado por apenas 4.2% dos projetos)
- O projeto ainda inclui `16` na lista: `imageSizes: [16, 32, 48, 64, 96, 128, 256]`

**Arquivo:** `next.config.mjs` (linha 47)

**Ação Necessária:**
- Remover `16` da lista se não for necessário
- Ou manter se houver casos de uso específicos que precisam desse tamanho

**Recomendação:** Remover `16` para alinhar com o padrão do Next.js 16, a menos que haja necessidade específica.

### 3. **Configuração `next/image` - `images.qualities`**

**Status:** ⚠️ **PRECISA ATUALIZAÇÃO**

**Problema:**
- O padrão mudou de `[1..100]` para `[75]`
- O projeto usa `quality={90}` em `components/safe-image.tsx` (linha 176)
- Com o novo padrão `[75]`, o valor `90` será arredondado para `75`

**Arquivo:** `next.config.mjs` e `components/safe-image.tsx`

**Ação Necessária:**
- Adicionar `qualities: [75, 90]` na configuração para manter o comportamento atual
- Ou alterar `quality={90}` para `quality={75}` em `safe-image.tsx`
- Ou adicionar `qualities: [90]` se quiser apenas esse valor

**Recomendação:** Adicionar `qualities: [75, 90]` para manter compatibilidade e permitir ambos os valores.

### 4. **Configuração `next/image` - `images.localPatterns`**

**Status:** ✅ **NÃO NECESSÁRIO**

**Problema:**
- Next.js 16 agora requer `images.localPatterns` para imagens locais com query strings
- Isso previne ataques de enumeração

**Verificação:**
- ✅ Não há uso de imagens locais com query strings no projeto
- Todas as imagens usam paths simples ou URLs remotas

**Ação Necessária:** Nenhuma ação necessária.

### 5. **Turbopack vs Webpack**

**Status:** ⚠️ **CONFIGURAÇÃO MISTA**

**Problema:**
- Next.js 16 usa Turbopack como padrão
- O projeto tem configuração do Turbopack (`turbopack: {}`) mas o build ainda usa `--webpack`
- Há configuração customizada do webpack no `next.config.mjs`

**Arquivo:** `package.json` (linha 8) e `next.config.mjs` (linhas 55-71)

**Situação Atual:**
```json
"build": "npm run prisma:generate && next build --webpack"
```

**Ação Necessária:**
- Decidir se quer migrar completamente para Turbopack ou manter Webpack
- Se migrar para Turbopack:
  - Remover `--webpack` do script de build
  - Verificar se a configuração customizada do webpack é necessária
  - Se for necessária, verificar se há equivalente no Turbopack
- Se manter Webpack:
  - Documentar a decisão
  - Manter `--webpack` flag

**Recomendação:** Testar build com Turbopack primeiro. Se funcionar, migrar. Se houver problemas com a configuração customizada, manter Webpack temporariamente.

### 6. **`revalidateTag()` Signature**

**Status:** ⚠️ **VERIFICAR USO**

**Problema:**
- `revalidateTag()` agora requer `cacheLife` profile como segundo argumento para SWR
- O projeto tem um uso comentado: `// revalidateTag('households');`

**Arquivo:** `app/api/households/route.ts` (linha 243)

**Ação Necessária:**
- Se for descomentar e usar, atualizar para: `revalidateTag('households', { revalidate: 0 })`
- Ou usar `updateTag()` em Actions para read-your-writes

---

## 📋 Checklist de Ações

- [ ] Atualizar `minimumCacheTTL` em `next.config.mjs` (decidir entre 60 ou 14400)
- [ ] Remover `16` de `imageSizes` em `next.config.mjs` (ou documentar necessidade)
- [ ] **Adicionar `qualities: [75, 90]` em `next.config.mjs`** (para manter `quality={90}` funcionando)
- [x] Verificar necessidade de `images.localPatterns` (não necessário - não há imagens locais com query strings)
- [ ] Decidir sobre migração Turbopack vs Webpack
- [ ] Atualizar `revalidateTag()` se for usado no futuro

---

## 🔍 Mudanças de Comportamento (Não Breaking, mas Importantes)

### 1. **Prefetch Cache Behavior**
- **Status:** ✅ **AUTOMÁTICO**
- **Detalhes:** Next.js 16 reescreveu completamente o comportamento de prefetch com layout deduplication e incremental prefetching. Isso é automático e não requer mudanças no código.

### 2. **Terminal Output**
- **Status:** ✅ **AUTOMÁTICO**
- **Detalhes:** O output do terminal foi redesenhado com melhor formatação e métricas de performance. Isso é automático.

### 3. **Dev e Build Output Directories**
- **Status:** ✅ **AUTOMÁTICO**
- **Detalhes:** `next dev` e `next build` agora usam diretórios de output separados, permitindo execução concorrente. Isso é automático.

---

## 📚 Referências

- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16 Breaking Changes](https://nextjs.org/blog/next-16#breaking-changes-and-other-updates)

---

## 🎯 Conclusão

**Status Geral:** 🟢 **BOM**

A maioria dos breaking changes críticos já foi implementada corretamente:
- ✅ `proxy.ts` implementado
- ✅ Async `params`, `cookies()`, `headers()` implementados
- ✅ `searchParams` não usado como prop (usa hooks do cliente)

**Ações Pendentes:**
- Ajustes de configuração do `next/image` (não críticos)
- Decisão sobre Turbopack vs Webpack
- Verificações de uso de features específicas

O projeto está bem preparado para o Next.js 16, com apenas ajustes de configuração pendentes.

