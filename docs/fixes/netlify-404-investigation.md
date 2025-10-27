# Investigação e Solução: Erro 404 em Todas as Páginas do Netlify

**Data:** 27 de Outubro de 2025  
**Status:** SOLUÇÃO IDENTIFICADA - Requer ação manual

## 🔍 Problema Identificado

Todas as páginas do site `mealtime.app.br` estão retornando erro 404 (Page Not Found) do Netlify.

## 🎯 Causa Raiz

A configuração de **"Publish directory"** na interface web do Netlify está definida como `.next`, o que causa um conflito crítico com o plugin `@netlify/plugin-nextjs`.

**Por que isso é um problema:**
- O plugin `@netlify/plugin-nextjs` é responsável por gerenciar automaticamente o deployment do Next.js
- Quando um "publish directory" é definido manualmente (especialmente como `.next`), o Netlify tenta servir os arquivos diretamente desse diretório
- Isso impede o plugin de funcionar corretamente, resultando em erro 404 para todas as rotas

## 📊 Evidências Coletadas

### 1. Status HTTP
```bash
HTTP/2 404 
cache-control: public,max-age=0,must-revalidate
```

### 2. Configuração Atual (API)
```json
{
  "build_settings": {
    "cmd": "npm run build",
    "dir": ".next"  // ← PROBLEMA!
  }
}
```

### 3. Erro do Plugin
```
Error: Your publish directory cannot be the same as the base directory of your site.
Please check your build settings

Resolved config:
  publish: /home/mauriciobc/Documentos/Code/mealtime
  publishOrigin: ui  // ← Configurado na interface web
```

## ✅ Solução

### Passo 1: Acesse as Configurações do Site

1. Acesse: https://app.netlify.com/projects/meowtime
2. Clique em **"Site configuration"** no menu lateral esquerdo
3. Clique em **"Build & deploy"**
4. Role até **"Build settings"**

### Passo 2: Remova o Publish Directory

1. Procure o campo **"Publish directory"**
2. Se estiver preenchido com `.next` ou qualquer outro valor, **APAGUE COMPLETAMENTE**
3. Deixe o campo **VAZIO**
4. Clique em **"Save"** ou **"Update settings"**

### Passo 3: Faça um Novo Deploy

Após salvar as configurações, você pode:

**Opção A: Deploy Manual (Recomendado)**
```bash
npx netlify deploy --prod --build
```

**Opção B: Trigger via Git**
```bash
git commit --allow-empty -m "trigger: force redeploy after fixing publish directory"
git push origin main
```

## 🔧 Alterações Realizadas no Código

### 1. Remoção de Scheduled Functions Incorreta
```toml
# REMOVIDO do netlify.toml:
[[scheduledFunctions]]
  function = "app/api/scheduled-notifications/deliver/route.ts"
  schedule = "* * * * *"
```

**Motivo:** Scheduled functions no Netlify devem estar em `netlify/functions/`, não como rotas de API do Next.js.

### 2. Atualização do netlify.toml
```toml
# netlify.toml
[build]
  command = "npm run build"
  # IMPORTANTE: NÃO definir publish directory quando usar @netlify/plugin-nextjs
  # O plugin gerencia isso automaticamente

[build.environment]
  NODE_VERSION = "20.18.0"
  NPM_FLAGS = "--include=dev"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## ⚠️ Limitação da API

Tentamos corrigir a configuração via API do Netlify, mas ela **não permite** atualizar o campo `dir` (publish directory) programaticamente. Por isso, a correção **DEVE ser feita manualmente** na interface web.

## 📝 Commits Realizados

1. `fix: remove invalid scheduledFunctions configuration from netlify.toml` (0fcc1d5)
2. `fix: explicitly set empty publish directory to fix Next.js routing` (0adb38f)

## ✨ Resultado Esperado

Após seguir os passos acima, o site deve:
- ✅ Carregar a página inicial corretamente
- ✅ Todas as rotas funcionarem normalmente
- ✅ APIs routes (`/api/*`) funcionarem
- ✅ SSR (Server-Side Rendering) funcionar corretamente
- ✅ ISR (Incremental Static Regeneration) funcionar
- ✅ Edge Functions funcionarem

## 🔗 Links Úteis

- **Admin do Projeto:** https://app.netlify.com/projects/meowtime
- **Deploy Logs:** https://app.netlify.com/projects/meowtime/deploys
- **Function Logs:** https://app.netlify.com/projects/meowtime/logs/functions
- **Edge Function Logs:** https://app.netlify.com/projects/meowtime/logs/edge-functions

## 📚 Documentação de Referência

- [Netlify Next.js Plugin](https://github.com/opennextjs/opennextjs-netlify)
- [Netlify Build Configuration](https://docs.netlify.com/configure-builds/file-based-configuration/)
- [Next.js on Netlify](https://docs.netlify.com/frameworks/next-js/)

---

**Próximos Passos:**
1. Seguir o passo a passo acima para remover o publish directory
2. Fazer um novo deploy
3. Testar o site em: https://mealtime.app.br
4. Verificar se todas as páginas estão funcionando corretamente

