# 🔐 Teste de Autenticação JWT nas Rotas da API

Este documento descreve como testar se as rotas da API estão funcionando corretamente com autenticação JWT da API mobile.

## 📋 Visão Geral

A autenticação JWT funciona da seguinte forma:

1. **Login**: Aplicativo mobile faz POST para `/api/auth/mobile` com email/senha
2. **Obtenção de Token**: API retorna `access_token` (JWT) e `refresh_token`
3. **Uso do Token**: Aplicativo envia o JWT no header `Authorization: Bearer <token>`
4. **Validação**: Middleware `validateMobileAuth` valida o JWT e retorna dados do usuário

## 🏗️ Arquitetura

### Middleware de Autenticação

**Arquivo**: `lib/middleware/mobile-auth.ts`

```typescript
export async function validateMobileAuth(request: NextRequest): Promise<{
  success: boolean;
  user?: MobileAuthUser;
  error?: string;
  statusCode?: number;
}>
```

**Funcionamento**:
1. Extrai o token JWT do header `Authorization: Bearer <token>`
2. Valida o token usando `supabase.auth.getUser(token)`
3. Busca dados do usuário no Prisma usando o `auth_id`
4. Retorna dados do usuário incluindo `household_id`

### Rotas que Usam o Middleware

✅ **`/api/mobile/cats`** - Lista e cria gatos (usa `withMobileAuth`)
- GET `/api/mobile/cats` - Lista gatos do household do usuário
- POST `/api/mobile/cats` - Cria novo gato

### Rotas que NÃO Usam o Middleware (Mas Deveriam)

❌ **`/api/c fruits`** - Usa header `X-User-ID` diretamente
❌ **`/api/weight-logs`** - Usa header `X-User-ID` diretamente
❌ **`/api/feedings`** - Usa header `X-User-ID` diretamente

**Recomendação**: Migrar estas rotas para usar `withMobileAuth` para consistência e segurança.

## 🧪 Como Testar

### Pré-requisitos

1. Servidor rodando: `npm run dev`
2. Usuário de teste criado (veja `scripts/create-test-user.ts`)

### Script de Teste Automatizado

Execute o script de teste:

```bash
# Com credenciais de teste
node scripts/test-jwt-auth.js teste@mealtime.dev teste123456

# Com suas credenciais
node scripts/test-jwt-auth.js seu@email.com suaSenha
```

### Testes Manuais com cURL

#### 1. Fazer Login

```bash
curl -X POST http://localhost:3000/api/auth/mobile \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@mealtime.dev","password":"teste123456"}'
```

**Resposta Esperada**:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "auth_id": "...",
    "full_name": "Usuário de Teste",
    "email": "teste@mealtime.dev",
    "household_id": "...",
    "household": {...}
  },
  "access_token": "eyJhbGci...",
  "refresh_token": "refresh_...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### 2. Listar Gatos (Sem JWT - Deve Falhar)

```bash
curl http://localhost:3000/api/mobile/c也許s
```

**Resposta Esperada**: `401 Unauthorized`

#### 3. Listar Gatos (Com JWT - Deve Funcionar)

```bash
TOKEN="seu_access_token_aqui"

curl http://localhost:3000/api/mobile/cats \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta Esperada**:
```json
{
  "success": true,
  "data": [...],
  "count": 2
}
```

#### 4. Criar Gato (Com JWT)

```bash
TOKEN="seu_access_token_aqui"

curl -X POST http://localhost:3000/api/mobile/cats \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gato Teste",
    "weight": 4.5,
    "birth_date": "2020-01-15"
  }'
```

## ✅ Checklist de Testes

### Testes de Autenticação

- [ ] Login com credenciais válidas retorna JWT
- [ ] Login com credenciais inválidas retorna 401
- [ ] Acesso sem JWT retorna 401
- [ ] Acesso com JWT válido funciona
- [ ] Acesso com JWT inválido retorna 401
- [ ] Refresh token funciona (PUT `/api/auth/mobile`)

### Testes de Rotas

- [ ] GET `/api/mobile/cats` lista gatos com JWT válido
- [ ] POST `/api/mobile/cats` cria gato com JWT válido
- [ ] Rotas protegidas requerem JWT

## 🐛 Problemas Conhecidos

### Problema: Algumas rotas usam X-User-ID

**Descrição**: Rotas como `/api/cats` usam o header `X-User-ID` em vez do JWT

**Impacto**: Inconsistência na autenticação e possível vulnerabilidade de segurança

**Solução**: Migrar todas as rotas para usar `withMobileAuth`

**Status**: ⚠️ Não implementado

### Problema: Validar JWT em cada request

**Descrição**: O middleware valida o JWT chamando `supabase.auth.getUser(token)` a cada request

**Impacto**: Latência adicional em cada request

**Solução**: Cache de validação ou verificação local do JWT (se Supabase permitir)

**Status**: ✅ Funcionando (pode ser otimizado)

## 📚 Documentação Relacionada

- **Middleware**: `lib/middleware/mobile-auth.ts`
- **API Mobile Docs**: `docs/api/mobile-api.md`
- **Script de Criação de Usuário**: `scripts/create-test-user.ts`
- **Script de Teste**: `scripts/test-jwt-auth.js`
- **Script de Teste Auth**: `scripts/test-mobile-auth.js`

## 🎯 Próximos Passos

1. ✅ Verificar que o middleware está funcionando
2. ⚠️ Migrar rotas antigas para usar `withMobileAuth`
3. ⚠️ Adicionar testes automatizados
4. ⚠️ Documentar todas as rotas móveis
5. ⚠️ Implementar rate limiting

## 📝 Notas Técnicas

### Token JWT do Supabase

O token JWT retornado pelo Supabase contém:
- `sub`: User ID (UUID)
- `email`: Email do usuário
- `exp`: Timestamp de expiração
- Outros campos personalizados

### Validação do Token

O middleware chama `supabase.auth.getUser(token)` que:
1. Verifica a assinatura do token
2. Verifica se o token não expirou
3. Retorna os dados do usuário do Supabase

### Cache de Usuário

Após validar o token, o middleware busca dados do usuário no Prisma. Este passo poderia ser cacheado para melhor performance.

