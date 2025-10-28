# 🚀 Instruções de Deploy - Next.js 16 no Netlify

## ✅ Status das Correções

Todas as correções para Next.js 16 foram implementadas:

- ✅ Corrigidos `params` assíncronos em 3 arquivos
- ✅ Corrigidos `cookies()` assíncronos em 11 arquivos de API  
- ✅ Criado `middleware.ts` wrapper para compatibilidade Netlify
- ✅ Atualizado `netlify.toml` com plugin explícito
- ✅ Criado `.nvmrc` com versão Node.js 20.18.0

## 📦 Arquivos Modificados

### Código Principal
- `app/cats/[id]/default.tsx` - await params
- `app/settings/[id]/page.tsx` - await params  
- `app/api/feedings/[id]/route.ts` - await params
- 11 arquivos de API - await cookies()

### Configuração
- ~~`middleware.ts`~~ - **REMOVIDO** - Next.js 16 não permite ter ambos
- `netlify.toml` - Plugin explícito adicionado
- `proxy.ts` - Mantido (arquivo correto para Next.js 16)
- `.nvmrc` - **NOVO** - Versão Node.js

### Documentação
- `NEXTJS-16-MIGRATION-FIX.md` - Documentação completa
- `DEPLOY-INSTRUCTIONS.md` - Este arquivo

## 🎯 Como Fazer o Deploy

### Opção 1: Deploy Automático (Recomendado)

```bash
# 1. Verificar status
git status

# 2. Adicionar todas as mudanças
git add .

# 3. Commit com mensagem descritiva
git commit -m "fix: Next.js 16 compatibility - async params/cookies + Netlify wrapper"

# 4. Push para main (deploy automático)
git push origin main

# 5. Monitorar deploy no Netlify
# https://app.netlify.com/projects/meowtime
```

### Opção 2: Deploy Manual via Netlify CLI

```bash
# 1. Fazer build local
npm run build

# 2. Deploy para produção
npx netlify-cli deploy --prod --message "Next.js 16 compatibility fixes"

# Ou apenas preview:
npx netlify-cli deploy --message "Test Next.js 16 fixes"
```

## 🔍 Verificações Pós-Deploy

### 1. Testar Redirecionamentos de Autenticação

```bash
# Teste 1: Acessar rota protegida sem login
curl -I https://mealtime.app.br/cats/any-id
# Esperado: Redirect 302 para /login

# Teste 2: Acessar API sem auth
curl https://mealtime.app.br/api/cats/any-id
# Esperado: 401 Unauthorized
```

### 2. Verificar Logs no Netlify

1. Acesse: https://app.netlify.com/projects/meowtime/logs
2. Filtre por "Edge Functions"
3. Procure por execuções do middleware
4. Verifique se não há erros

### 3. Testar no Navegador

1. **Logout completo** (limpar cookies)
2. Tentar acessar: `https://mealtime.app.br/cats`
3. **Deve redirecionar** para `/login`
4. Fazer login
5. Tentar acessar `/cats` novamente
6. **Deve funcionar** normalmente

## ⚠️ Troubleshooting

### Se redirecionamentos ainda não funcionarem:

1. **Verificar build do Netlify**
   - Procure por: "Next.js Middleware Handler" nos logs
   - Deve mostrar: `@netlify/plugin-nextjs` ativo

2. **Verificar se middleware.ts foi deployado**
   ```bash
   npx netlify-cli functions:list
   # Deve listar: ___netlify-edge-handler-node-middleware
   ```

3. **Limpar cache do Netlify**
   - Vá em: Deploy > Trigger Deploy > Clear cache and deploy site

4. **Verificar variáveis de ambiente**
   - Confirme que `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão configuradas

## 📊 Monitoramento

### Via Netlify MCP (se disponível)

```javascript
// Verificar último deploy
mcp_netlify_netlify-deploy-services-reader({
  "operation": "get-deploy",
  "params": {"deployId": "DEPLOY_ID"}
})

// Verificar logs
// Acesse: https://app.netlify.com/projects/meowtime/logs/edge-functions
```

### Via CLI

```bash
# Status do site
npx netlify-cli status

# Ver logs em tempo real
npx netlify-cli watch

# Listar deploys recentes
npx netlify-cli api listSiteDeploys --data '{"site_id": "ea7083ac-4ad2-49ed-a2d7-84ca93435c31"}'
```

## 🔄 Rollback (se necessário)

Se algo der errado:

```bash
# 1. Via interface Netlify
# Deploy > Published deploys > Clique em deploy anterior > Publish deploy

# 2. Via CLI
npx netlify-cli api rollbackDeploy --data '{"deploy_id": "PREVIOUS_DEPLOY_ID"}'

# 3. Via Git
git revert HEAD
git push origin main
```

## 📝 Próximas Ações

- [ ] Fazer deploy
- [ ] Verificar redirecionamentos funcionando
- [ ] Monitorar logs por 24h
- [ ] Documentar quaisquer issues encontrados
- [ ] Quando `@netlify/plugin-nextjs` suportar `proxy.ts`, remover `middleware.ts`

## 🆘 Suporte

Se problemas persistirem:

1. **Netlify Support**: https://answers.netlify.com/
2. **Next.js Discussions**: https://github.com/vercel/next.js/discussions
3. **Documentação**: `NEXTJS-16-MIGRATION-FIX.md`

---

**Última atualização:** 2025-10-28  
**Versão Next.js:** 16.0.0  
**Plugin Netlify:** @netlify/plugin-nextjs (versão mais recente)

