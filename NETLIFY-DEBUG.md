# 🚨 DEBUG: Deploy Netlify Retornando 404

## Status Atual
- ✅ Deploy concluído no Netlify
- ❌ Todas as páginas retornam 404
- ❌ API routes também retornam 404
- ❌ Netlify está servindo página de erro padrão

## Informações do Deploy

### Headers da Resposta:
```
HTTP/2 404 
server: Netlify
cache-control: public,max-age=0,must-revalidate
```

**Análise**: Netlify está servindo página 404 padrão, não o Next.js.

## Possíveis Causas

### 1. Plugin não está sendo executado
**Como verificar nos logs do Netlify:**
- Procure por: `Installing plugins` → `@netlify/plugin-nextjs`
- Se NÃO aparecer, o plugin não foi instalado

### 2. Build falhou silenciosamente
**Como verificar nos logs do Netlify:**
- Procure por erros no `npm run build`
- Verifique se há `Error:` ou `Failed to compile`

### 3. Configuração incompatível no next.config.mjs
**Possíveis problemas:**
- `output: 'export'` (incompatível com plugin)
- `output: 'standalone'` (pode precisar de configuração adicional)
- `distDir` customizado

## Ações de Debug

### Passo 1: Verificar Logs do Netlify
1. Acesse: https://app.netlify.com/
2. Vá em: Sites → mealtime → Deploys
3. Clique no último deploy
4. Expanda **"Deploy log"**

### Procure por estas seções:

#### A. Instalação de dependências
```
$ npm install
```
- ✅ Deve completar sem erros
- ⚠️ Se houver warnings sobre peer dependencies, OK
- ❌ Se houver ERRORs, anotar

#### B. Instalação do Plugin
```
Installing plugins
  - @netlify/plugin-nextjs@5.14.4
```
- ✅ Se aparecer = Plugin instalado
- ❌ Se NÃO aparecer = Plugin não foi instalado

#### C. Build do Next.js
```
$ npm run build

> mealtime-app@0.1.0 build
> npm run prisma:generate && next build

✓ Creating an optimized production build
✓ Compiled successfully
```
- ✅ Deve mostrar "Compiled successfully"
- ❌ Se houver "Failed to compile", copiar o erro

#### D. Processamento do Plugin
```
Next.js cache restored
Packaging functions from .netlify/functions-internal directory
```
- ✅ Deve mostrar que empacotou as funções
- ❌ Se não aparecer, plugin não processou

### Passo 2: Verificar se há erro específico

#### Se o erro for: "Cannot find module"
**Solução:** Falta dependência no package.json

#### Se o erro for: "Plugin not found"  
**Solução:** Executar localmente:
```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "chore: rebuild package-lock.json"
git push
```

#### Se o erro for: "Build script returned non-zero"
**Solução:** Testar build localmente:
```bash
npm run build
```
Se falhar localmente, corrigir antes de deploy.

### Passo 3: Configurações Alternativas

Se o plugin ainda não funcionar, tente configuração mais explícita:

#### Opção A: Netlify.toml com mais detalhes
```toml
[build]
  command = "npm run build"
  functions = ".netlify/functions"

[build.environment]
  NODE_VERSION = "20"
  NPX_FLAGS = "--yes"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions]
  node_bundler = "esbuild"
```

#### Opção B: Adicionar ao next.config.mjs
```js
const nextConfig = {
  // ... outras configs
  
  // Forçar output para standalone (para Netlify)
  output: process.env.NETLIFY ? undefined : 'standalone',
}
```

#### Opção C: Desabilitar source maps temporariamente
```js
const nextConfig = {
  productionBrowserSourceMaps: false, // Testar sem source maps
  // ...
}
```

## Checklist de Verificação no Netlify Dashboard

Na aba de Deploy, verifique:

### Site Settings
- [ ] Build command: `npm run build`
- [ ] Publish directory: **VAZIO** (não deve ter nada!)
- [ ] Functions directory: **VAZIO** ou `.netlify/functions`
- [ ] Node version: 20.x

### Build & Deploy > Environment
- [ ] `NODE_VERSION` = `20`
- [ ] Todas as env vars necessárias presentes:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `DATABASE_URL`
  - [ ] Outras variáveis do `.env`

### Plugins
- [ ] `@netlify/plugin-nextjs` está na lista

## Solução Rápida: Forçar Reinstalação

Se nada funcionar, tente:

```bash
# 1. Limpar tudo localmente
rm -rf .next node_modules package-lock.json

# 2. Reinstalar
npm install

# 3. Testar build local
npm run build

# 4. Se funcionar, commit e push
git add package-lock.json
git commit -m "chore: rebuild dependencies"
git push

# 5. No Netlify Dashboard:
# Deploys > Trigger deploy > "Clear cache and deploy site"
```

## Informações para Compartilhar

Se precisar de ajuda, copie estas informações dos logs do Netlify:

1. **Seção "Installing plugins"** (primeiras linhas)
2. **Seção "npm run build"** (completa)
3. **Seção "Packaging functions"** (se existir)
4. **Últimas 20 linhas do log** (onde mostra sucesso ou erro)

## Comparação: Como Deveria Funcionar

### Deploy BEM-SUCEDIDO (exemplo):
```
4:12:05 PM: ────────────────────────────────────────────────────────────────
4:12:05 PM:   Installing plugins
4:12:05 PM: ────────────────────────────────────────────────────────────────
4:12:05 PM:   - @netlify/plugin-nextjs@5.14.4
4:12:10 PM: ​
4:12:10 PM: ────────────────────────────────────────────────────────────────
4:12:10 PM:   Netlify Build                                                 
4:12:10 PM: ────────────────────────────────────────────────────────────────
4:12:10 PM: ​
4:12:10 PM: $ npm run build
4:12:10 PM: > build
4:12:10 PM: > next build
4:12:30 PM: ✓ Creating an optimized production build
4:12:40 PM: ✓ Compiled successfully
4:12:40 PM: ​
4:12:40 PM: ────────────────────────────────────────────────────────────────
4:12:40 PM:   @netlify/plugin-nextjs onBuild
4:12:40 PM: ────────────────────────────────────────────────────────────────
4:12:40 PM: Next.js cache saved
4:12:41 PM: Packaging Next.js functions
4:12:50 PM: ✔ Packaged 42 functions
4:12:50 PM: ​
4:12:50 PM: (Deploy continues...)
```

### Deploy COM PROBLEMA (o que está acontecendo):
```
Se você NÃO ver:
- "Installing plugins" com @netlify/plugin-nextjs
- "Packaging Next.js functions"
- "Packaged X functions"

= Plugin não está rodando!
```

## Próximo Passo

**URGENTE:** Verifique os logs do último deploy no Netlify e compartilhe:
1. Há "Installing plugins"?
2. O build completou com sucesso?
3. Há "Packaging functions"?

Com essas informações conseguimos identificar o problema exato.

