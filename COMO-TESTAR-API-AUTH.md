# 🧪 Como Testar a API de Autenticação Mobile

## ✅ Correção Aplicada

O bug de **erro 500** foi corrigido! O problema era:
- ❌ O código tentava acessar `member.role` mas esse campo não estava sendo buscado do banco
- ✅ Agora o campo `role` está incluído na query do Prisma

## 🚀 Servidor Dev Está Rodando

O servidor está rodando em: **http://localhost:3000**

## 📝 Como Testar com Suas Credenciais

### Opção 1: Testar com usuário existente

```bash
node scripts/test-mobile-auth.js seu@email.com suaSenha123
```

### Opção 2: Usar variáveis de ambiente

```bash
TEST_EMAIL=seu@email.com TEST_PASSWORD=senha123 node scripts/test-mobile-auth.js
```

### Opção 3: Criar um novo usuário primeiro

Se você não tem um usuário ainda, acesse:
1. **http://localhost:3000/signup** - Criar nova conta
2. Faça o cadastro
3. Use as credenciais criadas para testar a API

## 🧪 Testes Disponíveis

O script `test-mobile-auth.js` executa 3 testes:

1. **✅ Login com credenciais válidas** (POST /api/auth/mobile)
   - Valida todos os campos obrigatórios
   - Verifica dados do usuário
   - Verifica informações do household
   - Verifica tokens (access_token e refresh_token)

2. **✅ Renovação de token** (PUT /api/auth/mobile)
   - Usa o refresh_token recebido no login
   - Valida novo access_token

3. **✅ Credenciais inválidas** (deve retornar 401)
   - Verifica que a API retorna erro correto

## 📊 Exemplo de Saída Bem-Sucedida

```
🚀 TESTE DE API DE AUTENTICAÇÃO MOBILE - MEALTIME
════════════════════════════════════════════════════════════

============================================================
  Teste 1: Login Mobile (POST /api/auth/mobile)
============================================================

ℹ️  Enviando requisição para: http://localhost:3000/api/auth/mobile
ℹ️  Email: seu@email.com
ℹ️  Password: ********

Status Code: 200
✅ Login realizado com sucesso!

📦 Dados recebidos:
────────────────────────────────────────────────────────────
{
  "success": true,
  "user": {
    "id": 1,
    "auth_id": "uuid-aqui",
    "full_name": "Seu Nome",
    "email": "seu@email.com",
    "household_id": 1,
    "household": {
      "id": 1,
      "name": "Casa da Família",
      "members": [
        {
          "id": 1,
          "name": "Seu Nome",
          "email": "seu@email.com",
          "role": "owner"
        }
      ]
    }
  },
  "access_token": "eyJhbGci...",
  "refresh_token": "refresh_...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
────────────────────────────────────────────────────────────

🔍 Validando resposta:
✅ Campo "success" está correto
✅ Campo "user" está correto
✅ Campo "user.id" está correto
✅ Campo "user.email" está correto
✅ Campo "user.full_name" está correto
✅ Campo "access_token" está correto
✅ Campo "refresh_token" está correto
✅ Campo "expires_in" está correto
✅ Campo "token_type" está correto

🏠 Informações do Household:
✅ Nome: Casa da Família
✅ ID: 1
✅ Membros: 1
  1. Seu Nome (seu@email.com) - Role: owner

✨ Todos os campos obrigatórios estão presentes!

============================================================
  Teste 2: Refresh Token (PUT /api/auth/mobile)
============================================================

ℹ️  Enviando requisição para: http://localhost:3000/api/auth/mobile
ℹ️  Refresh Token: refresh_token_aqui...

Status Code: 200
✅ Token renovado com sucesso!

...

============================================================
  Teste 3: Credenciais Inválidas
============================================================

ℹ️  Testando login com credenciais inválidas...
✅ API retornou erro 401 corretamente para credenciais inválidas!
ℹ️  Mensagem de erro: "Credenciais inválidas"

============================================================
  Resumo dos Testes
============================================================

Total de testes: 3
✅ Testes passaram: 3
❌ Testes falharam: 0

🎉 TODOS OS TESTES PASSARAM! 🎉
```

## 🔧 Comandos Úteis

### Parar o servidor
```bash
pkill -f "next dev"
```

### Ver logs do servidor
```bash
tail -f /tmp/mealtime-dev.log
```

### Reiniciar servidor
```bash
pkill -f "next dev" && cd /home/mauriciobc/Documentos/Code/mealtime && npm run dev
```

### Executar testes automaticamente (aguarda servidor iniciar)
```bash
./scripts/wait-and-test-auth.sh seu@email.com suaSenha
```

## 📱 Testando com App Mobile

Se você estiver desenvolvendo um app Android/iOS, use estes endpoints:

### Login
```bash
curl -X POST http://localhost:3000/api/auth/mobile \
  -H "Content-Type: application/json" \
  -d '{"email": "seu@email.com", "password": "senha123"}'
```

### Refresh Token
```bash
curl -X PUT http://localhost:3000/api/auth/mobile \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "seu_refresh_token"}'
```

### Usar Access Token em Requisições
```bash
curl -X GET http://localhost:3000/api/mobile/cats \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

## 🐛 O Que Foi Corrigido

**Arquivo:** `app/api/auth/mobile/route.ts`

**Linha 73-74:** Adicionado `role: true` na query do Prisma

**Antes:**
```typescript
household_members: {
  include: {
    user: { ... }
  }
}
```

**Depois:**
```typescript
household_members: {
  select: {
    role: true,  // ← ADICIONADO!
    user: { ... }
  }
}
```

Isso garante que o campo `role` esteja disponível quando o código tenta acessá-lo na linha 118, evitando o erro 500.

## 📚 Documentação Relacionada

- **Script de teste:** `scripts/test-mobile-auth.js`
- **Script auxiliar:** `scripts/wait-and-test-auth.sh`
- **README dos scripts:** `scripts/README-MOBILE-AUTH-TEST.md`
- **API Mobile Docs:** `docs/api/mobile-api.md`
- **Código da API:** `app/api/auth/mobile/route.ts`

