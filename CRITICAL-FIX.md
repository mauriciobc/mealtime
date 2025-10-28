# 🚨 CORREÇÃO CRÍTICA - Next.js 16 + Netlify

## ⚠️ Descoberta Final

**Next.js 16 NÃO aceita `middleware.ts` para builds!**

Erro de build:
```
Error: Both middleware file "./middleware.ts" and proxy file "./proxy.ts" are detected. 
Please use "./proxy.ts" only.
```

## ✅ Solução Definitiva

### Configuração Correta:

1. **Usar APENAS `proxy.ts`** (Next.js 16 requirement)
2. **Build com `--webpack`** (evita Turbopack WorkerError)
3. **Netlify detecta automaticamente** (OpenNext adapter)

### Arquivos Finais:

#### `package.json`
```json
{
  "scripts": {
    "build": "npm run prisma:generate && next build --webpack"
  }
}
```

#### `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20.18.0"
  NPM_FLAGS = "--include=dev"

[[redirects]]
  from = "/_next/static/*"
  to = "/_next/static/:splat"
  status = 200

[[redirects]]
  from = "/images/*"
  to = "/images/:splat"
  status = 200

[[redirects]]
  from = "/favicon.ico"
  to = "/favicon.ico"
  status = 200

[[redirects]]
  from = "/*"
  to = "/.netlify/edge-functions/___netlify-edge-handler-node-middleware"
  status = 200
  force = false

[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    Access-Control-Allow-Headers = "Content-Type, Authorization, X-Requested-With"
    Access-Control-Max-Age = "86400"
```

#### `proxy.ts`
```typescript
export default async function proxy(request: NextRequest) {
  // Todo o código do middleware anterior
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|site.webmanifest|robots.txt|sitemap.xml|browserconfig.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|xml)$).*)',
  ],
};
```

#### `next.config.mjs`
```javascript
const nextConfig = {
  // NO output: 'standalone'
  // NO turbo config
  // Mantém webpack config original
  // Mantém headers/redirects originais
}
```

## 🎯 Por Que Isso Funciona

1. **Next.js 16:** Aceita apenas `proxy.ts`
2. **Webpack flag:** Evita conflito Turbopack vs webpack config
3. **Netlify OpenNext:** Detecta `proxy.ts` automaticamente e gera edge function
4. **Sem plugin manual:** OpenNext adapter faz tudo automaticamente

## ⚠️ Arquivos que DEVEM existir

- ✅ `proxy.ts` (com função `proxy()`)
- ✅ `package.json` (com --webpack flag)
- ✅ `netlify.toml` (config original)
- ✅ `next.config.mjs` (config original)
- ❌ **NÃO** middleware.ts
- ❌ **NÃO** @netlify/plugin-nextjs no package.json

---

**Status:** Pronto para deploy final
**Data:** 2025-10-28

