# 🚀 Mealtime API V2 - README

**Versão**: 2.0  
**Data**: 2025-01-28  
**Status**: ✅ Production Ready

---

## 📖 Índice Rápido

1. [**Guia de Migração**](#guia-de-migracao) ⭐ LEIA PRIMEIRO
2. [**Como Usar**](#como-usar)
3. [**Rotas Disponíveis**](#rotas-disponiveis)
4. [**Testes**](#testes)
5. [**Documentação Completa**](#documentacao-completa)

---

## 📘 Guia de Migração

**👉 LEIA ESTE DOCUMENTO PRIMEIRO**: [`docs/API-V2-MIGRATION-GUIDE.md`](docs/API-V2-MIGRATION-GUIDE.md)

Contém:
- ✅ Diferenças entre v1 e v2
- ✅ Exemplos de código (Dart/Flutter e TypeScript)
- ✅ Timeline de deprecation
- ✅ FAQ e troubleshooting

---

## 🎯 Como Usar

### Mobile (JWT)

```dart
// 1. Login
final response = await http.post(
  Uri.parse('https://api.mealtime.com/api/auth/mobile'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'email': 'usuario@exemplo.com',
    'password': 'senha123',
  }),
);

final data = jsonDecode(response.body);
final token = data['access_token'];

// 2. Usar em qualquer rota v2
final catsResponse = await http.get(
  Uri.parse('https://api.mealtime.com/api/v2/cats'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  },
);

final catsData = jsonDecode(catsResponse.body);
if (catsData['success'] == true) {
  final cats = catsData['data'];
  // ...
}
```

### Web (Session)

```typescript
// Funciona automaticamente com cookies de sessão do Supabase
const response = await fetch('/api/v2/cats');
const { success, data, count } = await response.json();

if (success) {
  setCats(data);
}
```

---

## 📋 Rotas Disponíveis

### Cats (Gatos)

- `GET /api/v2/cats` - Listar gatos
- `POST /api/v2/cats` - Criar gato
- `GET /api/v2/cats/[catId]/next-feeding` - Próxima alimentação

### Feedings (Alimentações)

- `GET /api/v2/feedings` - Listar alimentações
- `POST /api/v2/feedings` - Registrar alimentação
- `GET /api/v2/feedings/[id]` - Buscar alimentação
- `DELETE /api/v2/feedings/[id]` - Deletar alimentação
- `GET /api/v2/feedings/stats` - Estatísticas

### Weight (Peso)

- `GET /api/v2/weight-logs` - Listar registros
- `POST /api/v2/weight-logs` - Criar registro
- `PUT /api/v2/weight-logs` - Atualizar registro
- `DELETE /api/v2/weight-logs` - Deletar registro

### Goals (Metas)

- `GET /api/v2/goals` - Listar metas
- `POST /api/v2/goals` - Criar meta

### Schedules (Agendamentos)

- `GET /api/v2/schedules` - Listar agendamentos
- `POST /api/v2/schedules` - Criar agendamento
- `GET /api/v2/schedules/[id]` - Buscar agendamento
- `PATCH /api/v2/schedules/[id]` - Atualizar agendamento
- `DELETE /api/v2/schedules/[id]` - Deletar agendamento

### Households (Casas)

- `GET /api/v2/households/[id]/cats` - Gatos da casa
- `POST /api/v2/households/[id]/cats` - Adicionar gato
- `POST /api/v2/households/[id]/invite` - Convidar membro
- `PATCH /api/v2/households/[id]/invite-code` - Regenerar código

**Total**: 26 endpoints em 13 rotas

---

## 🧪 Testes

### Scripts Disponíveis

```bash
# Teste completo da API v2
node scripts/test-api-v2.js seu@email.com suaSenha

# Teste específico de JWT
node scripts/test-jwt-auth.js seu@email.com suaSenha

# Teste de login mobile
node scripts/test-mobile-auth.js seu@email.com suaSenha
```

### Exemplo de Teste Manual

```bash
# Ver documentação completa de testes
cat docs/TESTE-JWT-AUTHENTICATION.md
```

---

## 📚 Documentação Completa

### 🌟 Documentos Principais (Leia Estes)

1. **[`docs/API-V2-MIGRATION-GUIDE.md`](docs/API-V2-MIGRATION-GUIDE.md)** ⭐⭐⭐
   - Guia completo de migração
   - Exemplos práticos
   - FAQ

2. **[`MIGRACAO-JWT-COMPLETA.md`](MIGRACAO-JWT-COMPLETA.md)** ⭐⭐
   - Resumo da migração
   - Estatísticas finais
   - Conquistas

3. **[`RELATORIO-FINAL-MIGRACAO-JWT.md`](RELATORIO-FINAL-MIGRACAO-JWT.md)** ⭐
   - Relatório técnico completo
   - Métricas detalhadas
   - Status de todas as tarefas

### 📖 Documentos de Referência

4. [`docs/TESTE-JWT-AUTHENTICATION.md`](docs/TESTE-JWT-AUTHENTICATION.md) - Como testar JWT
5. [`ROTAS-PARA-MIGRACAO-JWT.md`](ROTAS-PARA-MIGRACAO-JWT.md) - Lista de rotas
6. [`VERIFICACAO-JWT-AUTH.md`](VERIFICACAO-JWT-AUTH.md) - Verificação inicial
7. [`ESTRUTURA-API-ATUAL.md`](ESTRUTURA-API-ATUAL.md) - Estrutura completa

### 🔧 Documentos Técnicos

8. [`MIGRACAO-JWT-RESUMO-EXECUTIVO.md`](MIGRACAO-JWT-RESUMO-EXECUTIVO.md) - Resumo executivo
9. [`WARNINGS-V1-STATUS.md`](WARNINGS-V1-STATUS.md) - Status dos warnings
10. [`CONSOLIDACAO-ROTAS-DUPLICADAS.md`](CONSOLIDACAO-ROTAS-DUPLICADAS.md) - Rotas duplicadas
11. [`app/api/swagger-v2.yaml`](app/api/swagger-v2.yaml) - OpenAPI spec

---

## ⚠️ Avisos Importantes

### V1 Está Deprecated!

As rotas antigas (`/api/cats`, `/api/feedings`, etc.) ainda funcionam mas:

- ⚠️ Serão removidas em **2025-07-28** (6 meses)
- ⚠️ Retornam headers de warning
- ⚠️ Usam autenticação insegura (`X-User-ID`)
- ⚠️ **MIGRE O QUANTO ANTES!**

### Você Tem 6 Meses

```
2025-01-28  ✅ V2 lançado
2025-02-28  ⚠️  Warnings ativos
2025-04-28  📢 Anúncio de remoção
2025-07-28  🚫 V1 removido
```

---

## 🔑 Autenticação

### Obter Token JWT

```bash
curl -X POST http://localhost:3000/api/auth/mobile \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"suaSenha"}'
```

**Resposta**:
```json
{
  "success": true,
  "access_token": "eyJhbGci...",
  "refresh_token": "refresh_...",
  "expires_in": 3600
}
```

### Usar Token

```bash
curl http://localhost:3000/api/v2/cats \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 💡 Formato de Resposta

### Sucesso

```json
{
  "success": true,
  "data": { /* ou array */ },
  "count": 1
}
```

### Erro

```json
{
  "success": false,
  "error": "Mensagem de erro",
  "details": { /* opcional */ }
}
```

**SEMPRE verifique `success` antes de usar `data`!**

---

## 🆘 Troubleshooting

### Erro 401 (Não autorizado)

- Verifique se o token está correto
- Verifique se não expirou (renove se necessário)
- Certifique-se do header `Authorization: Bearer`

### Erro 403 (Acesso negado)

- Você não tem permissão para acessar esse recurso
- Verifique se pertence ao household correto
- Verifique suas roles (admin/owner)

### Erro 400 (Dados inválidos)

- Verifique o corpo da requisição
- Consulte o Swagger para campos obrigatórios
- Veja `details` na resposta para mais informações

---

## 📊 Status

- **V1**: ⚠️ Deprecated (remove em 2025-07-28)
- **V2**: ✅ Recomendado (production ready)
- **Rotas migradas**: 13/13 (100%)
- **Documentação**: 13 documentos
- **Testes**: 3 scripts automatizados

---

## 🎯 Quick Start

```bash
# 1. Clone e instale
git clone ...
npm install

# 2. Configure .env
# (Supabase URL e keys)

# 3. Inicie servidor
npm run dev

# 4. Teste a API
node scripts/test-api-v2.js seu@email.com suaSenha

# 5. Leia a documentação
cat docs/API-V2-MIGRATION-GUIDE.md
```

---

## 📞 Suporte

- **Documentação**: Consulte os 13 guias disponíveis
- **Exemplos**: Veja `app/api/v2/cats/route.ts`
- **Testes**: Execute `scripts/test-api-v2.js`
- **Issues**: Abra uma issue no GitHub

---

## 🎉 Pronto Para Usar!

A API v2 está completa, documentada e pronta para produção.

**Comece agora**: [`docs/API-V2-MIGRATION-GUIDE.md`](docs/API-V2-MIGRATION-GUIDE.md)

---

**Versão**: 2.0  
**Última atualização**: 2025-01-28

