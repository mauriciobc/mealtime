# Correção do Endpoint /api/auth/mobile no Deploy

## 📋 Problema Identificado

O endpoint `https://mealtime.app.br/api/auth/mobile` não estava acessível após o deploy no Netlify.

## 🔍 Análise da Causa Raiz

Após investigação sistemática, identificamos que o problema estava relacionado à **configuração do Netlify para Next.js 16**:

### Problemas Encontrados:

1. **Falta do Plugin Netlify Next.js**: O `netlify.toml` não estava configurado com o plugin `@netlify/plugin-nextjs`, essencial para que o Netlify reconheça e processe corretamente as API routes do Next.js.

2. **Configuração Incompleta do Build**: Faltavam variáveis de ambiente importantes como `NODE_VERSION` e flags de npm.

3. **Falta de Runtime Configuration**: A rota API não tinha explicitamente definido o runtime e modo dinâmico.

## ✅ Correções Implementadas

### 1. Atualização do `netlify.toml`

**Arquivo**: `/netlify.toml`

```toml
# Netlify configuration for Next.js 16 deployment

[build]
  command = "npm run build"
  publish = ".next"

# Next.js Runtime Configuration
[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

# Essential Netlify plugins for Next.js
# This plugin handles API routes, SSR, and ISR automatically
[[plugins]]
  package = "@netlify/plugin-nextjs"

# Scheduled Functions (cron jobs)
[[scheduledFunctions]]
  function = "app/api/scheduled-notifications/deliver/route.ts"
  schedule = "* * * * *"   # run every minute

# CORS Headers for API routes
[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    Access-Control-Allow-Headers = "Content-Type, Authorization, X-Requested-With"
    Access-Control-Max-Age = "86400"
```

**Mudanças**:
- ✅ Adicionado `NODE_VERSION = "20"` para garantir versão compatível
- ✅ Adicionado plugin `@netlify/plugin-nextjs` (essencial!)
- ✅ Configurado headers CORS corretos para APIs
- ✅ Removido redirect problemático que estava causando conflito

### 2. Adição de Runtime Config na API Route

**Arquivo**: `/app/api/auth/mobile/route.ts`

```typescript
// Configuração de runtime para Netlify/Vercel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

**Mudanças**:
- ✅ Explicitamente definido runtime Node.js
- ✅ Forçado modo dinâmico para evitar cache estático

### 3. Atualização do `package.json`

**Arquivo**: `/package.json`

```json
"devDependencies": {
  "@netlify/plugin-nextjs": "^5.7.2",
  // ... outras dependências
}
```

**Mudanças**:
- ✅ Adicionado `@netlify/plugin-nextjs` como dependência de desenvolvimento

## 🧪 Como Testar

### Teste Local (Antes do Deploy)

```bash
# 1. Instalar dependências atualizadas
npm install

# 2. Gerar build
npm run build

# 3. Iniciar servidor de produção local
npm start

# 4. Testar endpoint
curl -X POST http://localhost:3000/api/auth/mobile \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "senha123"
  }'
```

### Teste no Netlify (Após Deploy)

```bash
# Teste básico
curl -X POST https://mealtime.app.br/api/auth/mobile \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu_email@exemplo.com",
    "password": "sua_senha"
  }'
```

**Resposta esperada de sucesso (200)**:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "auth_id": "...",
    "full_name": "Nome do Usuário",
    "email": "email@exemplo.com",
    "household_id": "...",
    "household": { ... }
  },
  "access_token": "eyJhbGc...",
  "refresh_token": "...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Resposta esperada de erro (401)**:
```json
{
  "success": false,
  "error": "Credenciais inválidas"
}
```

### Teste com Postman/Insomnia

1. **Método**: POST
2. **URL**: `https://mealtime.app.br/api/auth/mobile`
3. **Headers**:
   ```
   Content-Type: application/json
   ```
4. **Body (raw JSON)**:
   ```json
   {
     "email": "seu_email@exemplo.com",
     "password": "sua_senha"
   }
   ```

## 📦 Passos para Deploy

1. **Commit das alterações**:
   ```bash
   git add netlify.toml package.json app/api/auth/mobile/route.ts
   git commit -m "fix: corrige endpoint /api/auth/mobile para funcionar no Netlify"
   ```

2. **Push para o repositório**:
   ```bash
   git push origin main
   ```

3. **Aguardar build automático no Netlify**:
   - Acesse o dashboard do Netlify
   - Verifique o status do build
   - Aguarde até que o status seja "Published"

4. **Testar o endpoint em produção**:
   ```bash
   curl -X POST https://mealtime.app.br/api/auth/mobile \
     -H "Content-Type: application/json" \
     -d '{"email":"teste@exemplo.com","password":"senha123"}'
   ```

## 🔧 Troubleshooting

### Erro: "404 Not Found"

**Causa**: O plugin Netlify não foi instalado corretamente.

**Solução**:
```bash
npm install --save-dev @netlify/plugin-nextjs
git add package.json package-lock.json
git commit -m "chore: adiciona plugin Netlify Next.js"
git push
```

### Erro: "500 Internal Server Error"

**Causa**: Variáveis de ambiente podem não estar configuradas no Netlify.

**Solução**:
1. Acesse o dashboard do Netlify
2. Vá em "Site settings" > "Environment variables"
3. Verifique se todas as variáveis necessárias estão configuradas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL`
   - Outras variáveis do `.env`

### Erro: "CORS Error"

**Causa**: Headers CORS não estão sendo aplicados corretamente.

**Solução**: Já corrigido no `netlify.toml`. Se persistir, verifique se o deploy foi concluído com sucesso.

## 📚 Referências

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Netlify Next.js Plugin](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

## ✅ Checklist de Validação

Antes de considerar o problema resolvido, verifique:

- [ ] O build no Netlify foi concluído com sucesso
- [ ] O endpoint responde com status 200 para credenciais válidas
- [ ] O endpoint responde com status 401 para credenciais inválidas
- [ ] O endpoint responde com status 400 para requisições malformadas
- [ ] Headers CORS estão presentes na resposta
- [ ] O token JWT retornado é válido e pode ser usado em outras requisições
- [ ] O refresh token funciona corretamente no endpoint PUT

## 📝 Notas Adicionais

### Por que o Next.js 16 não precisa de middleware.ts?

O Next.js 16 renomeou `middleware.ts` para `proxy.ts` e o arquivo já existe no projeto em `/proxy.ts`. Este arquivo:
- Lida com autenticação para rotas protegidas
- **NÃO bloqueia** `/api/auth/mobile` (está na lista `SKIP_AUTH_ROUTES`)
- É executado automaticamente pelo Next.js

### Arquitetura do Fluxo de Autenticação

```
Cliente Mobile
    ↓
POST /api/auth/mobile
    ↓
proxy.ts (verifica que /api/auth está em SKIP_AUTH_ROUTES)
    ↓
route.ts executa
    ↓
1. Valida credenciais no Supabase
2. Busca dados do usuário no Prisma
3. Retorna JWT tokens
    ↓
Cliente recebe tokens
```

## 🎯 Resultado Esperado

Após aplicar todas as correções e fazer o deploy:

✅ `https://mealtime.app.br/api/auth/mobile` está acessível
✅ Aplicativos mobile podem autenticar usuários
✅ Tokens JWT são gerados corretamente
✅ Refresh tokens funcionam
✅ CORS está configurado corretamente

