# 🧪 Scripts de Teste - API de Autenticação Mobile

## 📋 Descrição

Scripts para testar a API de autenticação mobile do Mealtime. Estes scripts validam que o endpoint `/api/auth/mobile` está funcionando corretamente após a correção do bug de erro 500.

## 📁 Arquivos

### 1. `test-mobile-auth.js`
Script Node.js completo que testa:
- ✅ Login com credenciais válidas (POST /api/auth/mobile)
- ✅ Renovação de token (PUT /api/auth/mobile)
- ✅ Validação de credenciais inválidas (deve retornar 401)
- ✅ Validação de todos os campos obrigatórios na resposta
- ✅ Validação de informações do household e membros

### 2. `wait-and-test-auth.sh`
Script bash auxiliar que:
- ⏳ Aguarda o servidor dev inicializar
- 🚀 Executa automaticamente os testes
- ⚡ Facilita a automação do processo

## 🚀 Como Usar

### Opção 1: Com servidor já rodando

```bash
# Se você já tem um usuário cadastrado
node scripts/test-mobile-auth.js seu@email.com suaSenha123

# Ou usando variáveis de ambiente
TEST_EMAIL=seu@email.com TEST_PASSWORD=senha123 node scripts/test-mobile-auth.js
```

### Opção 2: Script completo (inicia servidor + testa)

```bash
# Inicie o servidor dev em uma janela separada
npm run dev

# Em outra janela/aba, execute:
./scripts/wait-and-test-auth.sh seu@email.com suaSenha123
```

### Opção 3: Teste rápido sem credenciais

```bash
# Tenta usar credenciais de exemplo (provavelmente vai falhar no login, 
# mas testa se o servidor está respondendo corretamente)
./scripts/wait-and-test-auth.sh
```

## 📊 Saída Esperada

Quando bem-sucedido, você verá:

```
🚀 TESTE DE API DE AUTENTICAÇÃO MOBILE - MEALTIME
════════════════════════════════════════════════════════════

============================================================
  Teste 1: Login Mobile (POST /api/auth/mobile)
============================================================

ℹ️  Enviando requisição para: http://localhost:3000/api/auth/mobile
ℹ️  Email: usuario@exemplo.com
ℹ️  Password: ***********

Status Code: 200
✅ Login realizado com sucesso!

📦 Dados recebidos:
────────────────────────────────────────────────────────────
{
  "success": true,
  "user": {
    "id": 1,
    "auth_id": "uuid...",
    "full_name": "Nome do Usuário",
    "email": "usuario@exemplo.com",
    "household_id": 1,
    "household": {
      "id": 1,
      "name": "Casa da Família",
      "members": [...]
    }
  },
  "access_token": "eyJhbGciOi...",
  "refresh_token": "refresh_token...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
────────────────────────────────────────────────────────────

🔍 Validando resposta:
✅ Campo "success" está correto
✅ Campo "user" está correto
✅ Campo "user.id" está correto
...
✅ Todos os campos obrigatórios estão presentes!

🎉 TODOS OS TESTES PASSARAM! 🎉
```

## 🐛 Problema que Foi Corrigido

Antes da correção, a API retornava **erro 500** quando as credenciais eram válidas porque:

1. ❌ O código tentava acessar `member.role` na linha 118
2. ❌ Mas o campo `role` não estava sendo buscado do banco de dados
3. ❌ Isso causava um erro JavaScript resultando em 500

**Correção aplicada:**
- ✅ Adicionado `role: true` na query do Prisma (linha 74)
- ✅ Agora o campo é buscado corretamente e incluído na resposta

## 📝 Notas

- O script requer Node.js instalado (já incluído nas dependências do projeto)
- O servidor dev precisa estar rodando em `http://localhost:3000`
- Você precisa de um usuário válido cadastrado para testar login com sucesso
- O teste de credenciais inválidas sempre deve retornar 401 (isso valida que a API está funcionando corretamente)

## 🔗 Documentação Relacionada

- Documentação completa da API: `docs/api/mobile-api.md`
- Código da API: `app/api/auth/mobile/route.ts`
- Middleware de autenticação: `lib/middleware/mobile-auth.ts`

