# 🚨 FIX URGENTE - Deploy Quebrado no Netlify

## ❌ Problema
Todas as páginas mostram "Page Not Found" do Netlify após deploy.

## 🔧 Causa Raiz
O arquivo `netlify.toml` estava com configuração incorreta:
- ❌ Tinha `publish = ".next"` (ERRADO quando usa plugin)
- ❌ O plugin `@netlify/plugin-nextjs` gerencia o diretório automaticamente

## ✅ Solução Aplicada

### Arquivo corrigido: `netlify.toml`

```toml
# Netlify configuration for Next.js 16

[build]
  command = "npm run build"
  # NÃO especifique 'publish' - o plugin cuida disso!

[build.environment]
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## 🚀 Deploy URGENTE

### Passo 1: Instalar dependência (se não instalou antes)
```bash
npm install
```

### Passo 2: Commit e Push IMEDIATAMENTE
```bash
git add netlify.toml
git commit -m "fix: remove publish path do netlify.toml - plugin gerencia automaticamente"
git push origin main
```

### Passo 3: Aguardar deploy no Netlify
- Acesse: https://app.netlify.com/
- Vá para seu site
- Aguarde o novo deploy terminar (≈ 2-5 minutos)

### Passo 4: Verificar se funcionou
```bash
# Teste a homepage
curl -I https://mealtime.app.br/

# Teste uma página
curl -I https://mealtime.app.br/login

# Teste o endpoint API
curl -X POST https://mealtime.app.br/api/auth/mobile \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"senha123"}'
```

## 🔍 Se ainda não funcionar

### Opção 1: Verificar logs do Netlify
1. Vá para o dashboard do Netlify
2. Clique em "Deploys"
3. Clique no deploy mais recente
4. Verifique se há erros nos logs

### Opção 2: Verificar se o plugin foi instalado
No log de build do Netlify, procure por:
```
Installing plugins
  - @netlify/plugin-nextjs
```

Se NÃO aparecer, significa que o `npm install` não rodou. Solução:
```bash
# Garanta que package-lock.json tem o plugin
npm install
git add package-lock.json
git commit -m "chore: update package-lock com plugin netlify"
git push
```

### Opção 3: Limpar cache do Netlify
No dashboard do Netlify:
1. Site settings > Build & deploy > Build settings
2. Clique em "Clear cache and retry deploy"

### Opção 4: Verificar variáveis de ambiente
Certifique-se de que todas as variáveis estão configuradas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- Outras necessárias

## 📝 O que estava errado?

### ❌ Configuração ERRADA (antiga):
```toml
[build]
  command = "npm run build"
  publish = ".next"  # <-- PROBLEMA!

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Por que está errado?**
- O plugin `@netlify/plugin-nextjs` **já gerencia** o diretório de output
- Especificar `publish = ".next"` causa conflito
- O Netlify tenta servir arquivos do diretório errado

### ✅ Configuração CORRETA (nova):
```toml
[build]
  command = "npm run build"
  # SEM publish - plugin gerencia!

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## 🎯 Resultado Esperado

Após o deploy com a correção:

✅ Homepage acessível: `https://mealtime.app.br/`
✅ Rotas funcionando: `/login`, `/signup`, `/cats`, etc.
✅ API routes funcionando: `/api/auth/mobile`
✅ Assets carregando corretamente (CSS, JS, imagens)
✅ SSR e ISR funcionando

## ⚠️ Importante

**NÃO adicione estas linhas ao netlify.toml:**
- ❌ `publish = ".next"`
- ❌ `publish = "out"`
- ❌ `publish = "dist"`
- ❌ Qualquer outro `publish`

**O plugin gerencia tudo automaticamente!**

## 📞 Se precisar de ajuda

Verifique:
1. Logs de build no Netlify
2. Console do browser (F12) para erros JS
3. Network tab para ver quais requests estão falhando

## ✅ Checklist Final

Antes de considerar resolvido:
- [ ] Deploy concluído com sucesso no Netlify
- [ ] Homepage carrega sem erro 404
- [ ] Página `/login` acessível
- [ ] Página `/cats` acessível
- [ ] API `/api/auth/mobile` responde
- [ ] CSS e JS carregam corretamente
- [ ] Sem erros no console do browser

