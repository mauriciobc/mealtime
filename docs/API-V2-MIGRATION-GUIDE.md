# 📘 Guia de Migração: API v1 → v2

**Versão**: 1.0  
**Data**: 2025-01-28  
**Sunset Date v1**: 2025-07-28 (6 meses)

---

## 🎯 Visão Geral

A API Mealtime foi migrada para v2 com melhorias significativas em segurança e consistência.

### Principais Mudanças

1. **Autenticação Híbrida**: Suporta JWT (mobile) e Supabase Session (web)
2. **Rotas Versionadas**: Novas rotas em `/api/v2/*`
3. **Respostas Padronizadas**: Formato consistente `{ success, data, count }`
4. **Deprecation de v1**: Rotas antigas serão removidas em 2025-07-28

---

## 🔐 Autenticação

### V1 (Deprecated)

```http
GET /api/cats
X-User-ID: uuid-do-usuario
```

**Problema**: Header `X-User-ID` pode ser falsificado! ⚠️

### V2 (Recomendado)

#### Mobile (JWT)
```http
GET /api/v2/cats
Authorization: Bearer eyJhbGci...
```

#### Web (Supabase Session)
```http
GET /api/v2/cats
Cookie: sb-access-token=...
```

---

## 📋 Mapeamento de Rotas

| V1 (Deprecated) | V2 (Novo) | Status |
|----------------|-----------|--------|
| `/api/cats` | `/api/v2/cats` | ✅ Migrado |
| `/api/feedings` | `/api/v2/feedings` | ✅ Migrado |
| `/api/feedings/[id]` | `/api/v2/feedings/[id]` | ✅ Migrado |
| `/api/feedings/stats` | `/api/v2/feedings/stats` | ✅ Migrado |
| `/api/cats/[catId]/next-feeding` | `/api/v2/cats/[catId]/next-feeding` | ✅ Migrado |
| `/api/weight-logs` | `/api/v2/weight-logs` | ✅ Migrado |
| `/api/goals` | `/api/v2/goals` | ✅ Migrado |
| `/api/schedules` | `/api/v2/schedules` | ✅ Migrado |
| `/api/schedules/[id]` | `/api/v2/schedules/[id]` | ✅ Migrado |
| `/api/households/[id]/cats` | `/api/v2/households/[id]/cats` | ✅ Migrado |
| `/api/households/[id]/invite` | `/api/v2/households/[id]/invite` | ✅ Migrado |
| `/api/households/[id]/invite-code` | `/api/v2/households/[id]/invite-code` | ✅ Migrado |
| `/api/weight/logs` | `/api/v2/weight-logs` | ⚠️ Duplicada |
| `/api/feeding-logs` | `/api/v2/feedings` | ⚠️ Duplicada |

---

## 🔄 Mudanças no Formato de Resposta

### V1

```json
{
  "id": "uuid",
  "name": "Miau",
  "weight": 4.5
}
```

ou

```json
[
  { "id": "uuid", "name": "Miau" }
]
```

### V2

**Sucesso**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Miau",
    "weight": 4.5
  }
}
```

**Lista**:
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Miau" }
  ],
  "count": 1
}
```

**Erro**:
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "details": { /* opcional */ }
}
```

---

## 📱 Migração para Apps Mobile

### Antes (V1)

```dart
// Flutter/Dart
Future<List<Cat>> getCats(String userId) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/cats'),
    headers: {'X-User-ID': userId},
  );
  
  return (jsonDecode(response.body) as List)
    .map((cat) => Cat.fromJson(cat))
    .toList();
}
```

### Depois (V2)

```dart
// Flutter/Dart
Future<List<Cat>> getCats(String token) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/v2/cats'),
    headers: {'Authorization': 'Bearer $token'},
  );
  
  final data = jsonDecode(response.body);
  
  if (data['success'] != true) {
    throw Exception(data['error']);
  }
  
  return (data['data'] as List)
    .map((cat) => Cat.fromJson(cat))
    .toList();
}
```

---

## 🌐 Migração para Apps Web

### Antes (V1)

```typescript
// React/TypeScript
const cats = await fetch('/api/cats').then(r => r.json());
```

### Depois (V2)

```typescript
// React/TypeScript
const response = await fetch('/api/v2/cats').then(r => r.json());

if (!response.success) {
  throw new Error(response.error);
}

const cats = response.data;
```

**Nota**: O app web continua funcionando com cookies de sessão do Supabase. Nenhuma mudança de autenticação necessária!

---

## 🔑 Obtendo JWT Token (Mobile)

### Login

```http
POST /api/auth/mobile
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Resposta**:
```json
{
  "success": true,
  "user": { /* dados do usuario */ },
  "access_token": "eyJhbGci...",
  "refresh_token": "refresh_...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### Refresh Token

```http
PUT /api/auth/mobile
Content-Type: application/json

{
  "refresh_token": "refresh_..."
}
```

---

## 📊 Exemplos de Migração por Rota

### Listar Gatos

#### V1
```bash
curl http://localhost:3000/api/cats \
  -H "X-User-ID: uuid-do-usuario"
```

#### V2
```bash
curl http://localhost:3000/api/v2/cats \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Criar Alimentação

#### V1
```bash
curl -X POST http://localhost:3000/api/feedings \
  -H "X-User-ID: uuid-do-usuario" \
  -H "Content-Type: application/json" \
  -d '{"catId":"uuid","amount":100}'
```

#### V2
```bash
curl -X POST http://localhost:3000/api/v2/feedings \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"catId":"uuid","amount":100}'
```

### Estatísticas de Alimentação

#### V1
```bash
curl "http://localhost:3000/api/feedings/stats?days=7" \
  -H "X-User-ID: uuid-do-usuario"
```

#### V2
```bash
curl "http://localhost:3000/api/v2/feedings/stats?days=7" \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## ⚠️ Breaking Changes

### 1. Formato de Resposta

**V1**: Retorna dados diretamente
**V2**: Retorna `{ success, data, count }`

**Ação necessária**: Atualizar parsing de resposta no cliente

### 2. Autenticação

**V1**: Header `X-User-ID`  
**V2**: JWT via `Authorization: Bearer`

**Ação necessária**: 
- Implementar fluxo de login JWT
- Armazenar tokens de forma segura
- Implementar refresh de tokens

### 3. Códigos de Status

**V1**: Variados  
**V2**: Consistente + campo `success`

**Ação necessária**: Verificar `success` antes de status code

---

## 📅 Timeline de Deprecação

| Data | Evento |
|------|--------|
| **2025-01-28** | ✅ V2 lançado |
| **2025-02-28** | ⚠️ Avisos de deprecation ativos |
| **2025-04-28** | 📢 Anúncio de remoção de v1 |
| **2025-07-28** | 🚫 V1 removido (sunset) |

**Você tem 6 meses para migrar!**

---

## 🧪 Como Testar a Migração

### 1. Obter Token JWT

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/mobile \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"suaSenha"}' \
  | jq -r '.access_token')
```

### 2. Testar Rotas V2

```bash
# Listar gatos
curl http://localhost:3000/api/v2/cats \
  -H "Authorization: Bearer $TOKEN"

# Criar alimentação
curl -X POST http://localhost:3000/api/v2/feedings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"catId":"uuid","amount":100}'
```

### 3. Verificar Warnings em V1

```bash
curl -I http://localhost:3000/api/cats \
  -H "X-User-ID: uuid" \
  | grep X-API
```

**Esperado**:
```
X-API-Version: v1
X-API-Deprecated: true
X-API-Sunset-Date: 2025-07-28
```

---

## 🛠️ Ferramentas de Teste

### Script Automatizado

```bash
# Testar JWT e rotas v2
node scripts/test-api-v2.js seu@email.com suaSenha

# Testar apenas autenticação
node scripts/test-jwt-auth.js seu@email.com suaSenha
```

---

## 💡 Melhores Práticas

### 1. Tratamento de Erros

```typescript
const response = await fetch('/api/v2/cats', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();

if (!data.success) {
  // Tratar erro
  console.error(data.error);
  throw new Error(data.error);
}

// Usar dados
const cats = data.data;
```

### 2. Refresh de Token

```typescript
async function refreshToken(refreshToken: string) {
  const response = await fetch('/api/auth/mobile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  
  const data = await response.json();
  
  if (data.success) {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    };
  }
  
  throw new Error('Failed to refresh token');
}
```

### 3. Armazenamento Seguro de Tokens

**Mobile (Flutter)**:
```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final storage = FlutterSecureStorage();

// Salvar
await storage.write(key: 'access_token', value: token);

// Ler
final token = await storage.read(key: 'access_token');
```

**Web (JavaScript)**:
```javascript
// Use cookies HTTP-only para máxima segurança
// ou localStorage com cuidado
localStorage.setItem('access_token', token);
```

---

## 🚨 Avisos Importantes

### 1. Segurança

- ⚠️ **Nunca** compartilhe seu access_token
- ⚠️ **Nunca** armazene tokens em logs
- ⚠️ Use HTTPS em produção
- ⚠️ Implemente refresh de tokens

### 2. Compatibilidade

- ✅ V2 funciona com JWT e Session
- ✅ Web apps não precisam mudar autenticação
- ⚠️ Mobile apps DEVEM migrar para JWT
- ⚠️ Headers `X-User-ID` serão removidos em 2025-07-28

### 3. Rate Limiting

V2 implementará rate limiting por JWT no futuro. Prepare seu código para tratar erro 429.

---

## 📚 Recursos Adicionais

### Documentação
- **Teste de JWT**: `docs/TESTE-JWT-AUTHENTICATION.md`
- **Lista de Rotas**: `ROTAS-PARA-MIGRACAO-JWT.md`
- **Status**: `MIGRACAO-JWT-RESUMO-EXECUTIVO.md`

### Scripts de Teste
- `scripts/test-api-v2.js` - Teste completo
- `scripts/test-jwt-auth.js` - Teste de autenticação
- `scripts/test-mobile-auth.js` - Teste de login mobile

### Exemplos de Código
- **Middleware**: `lib/middleware/hybrid-auth.ts`
- **Rota exemplo**: `app/api/v2/cats/route.ts`

---

## ❓ FAQ

### P: Preciso migrar imediatamente?
**R**: Não. Você tem 6 meses (até 2025-07-28). Mas recomendamos migrar o quanto antes.

### P: Meu app web vai quebrar?
**R**: Não! As rotas v2 funcionam automaticamente com Supabase Session. Só precisa atualizar as URLs.

### P: Como migro gradualmente?
**R**: Migre rota por rota. V1 e v2 funcionam em paralelo durante o período de transição.

### P: V1 ainda funciona?
**R**: Sim, até 2025-07-28. Mas retorna headers de warning.

### P: Como sei se estou usando v1?
**R**: Verifique os headers da resposta. Se tiver `X-API-Deprecated: true`, está usando v1.

### P: Qual a vantagem de v2?
**R**:
- ✅ Mais seguro (JWT validado)
- ✅ Respostas consistentes
- ✅ Melhor logging
- ✅ Suporte a mobile e web

---

## 🎓 Tutorial Passo a Passo

### Para App Mobile (Flutter)

#### Passo 1: Implementar Login

```dart
class AuthService {
  static const String baseUrl = 'https://api.mealtime.com';
  
  Future<AuthResponse> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/auth/mobile'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );
    
    final data = jsonDecode(response.body);
    
    if (data['success'] == true) {
      return AuthResponse(
        accessToken: data['access_token'],
        refreshToken: data['refresh_token'],
        user: User.fromJson(data['user']),
      );
    }
    
    throw Exception(data['error']);
  }
}
```

#### Passo 2: Usar Token nas Requisições

```dart
class ApiService {
  final String token;
  
  ApiService(this.token);
  
  Future<List<Cat>> getCats() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v2/cats'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );
    
    final data = jsonDecode(response.body);
    
    if (data['success'] != true) {
      throw Exception(data['error']);
    }
    
    return (data['data'] as List)
      .map((cat) => Cat.fromJson(cat))
      .toList();
  }
}
```

#### Passo 3: Atualizar Todas as Chamadas

```dart
// ANTES (v1)
headers: {'X-User-ID': userId}

// DEPOIS (v2)
headers: {'Authorization': 'Bearer $token'}
```

### Para App Web (React/Next.js)

#### Passo 1: Atualizar URLs

```typescript
// ANTES (v1)
const cats = await fetch('/api/cats').then(r => r.json());

// DEPOIS (v2)
const response = await fetch('/api/v2/cats').then(r => r.json());
const cats = response.data;
```

#### Passo 2: Criar Helper de API

```typescript
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v2${endpoint}`, options);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data.data as T;
}

// Uso:
const cats = await apiRequest<Cat[]>('/cats');
const stats = await apiRequest<Stats>('/feedings/stats?days=7');
```

---

## ✅ Checklist de Migração

### Para Desenvolvedores Mobile

- [ ] Implementar fluxo de login JWT
- [ ] Armazenar tokens de forma segura
- [ ] Implementar refresh de tokens
- [ ] Atualizar todas as chamadas de API para v2
- [ ] Atualizar parsing de respostas (adicionar `.data`)
- [ ] Testar fluxo completo
- [ ] Atualizar tratamento de erros

### Para Desenvolvedores Web

- [ ] Atualizar URLs: `/api/*` → `/api/v2/*`
- [ ] Atualizar parsing de respostas
- [ ] Testar com Supabase Session
- [ ] Verificar que não há quebras
- [ ] Atualizar tratamento de erros

### Para Backend/DevOps

- [ ] Monitorar uso de v1 vs v2
- [ ] Configurar alertas para uso de v1
- [ ] Planejar remoção de v1
- [ ] Atualizar documentação
- [ ] Comunicar timeline aos usuários

---

## 🆘 Suporte

Se encontrar problemas durante a migração:

1. **Verificar logs**: Console do navegador ou logs do app
2. **Testar token**: Use `scripts/test-jwt-auth.js`
3. **Consultar docs**: `docs/TESTE-JWT-AUTHENTICATION.md`
4. **Verificar exemplo**: `app/api/v2/cats/route.ts`
5. **Abrir issue**: GitHub issues

---

## 📌 Resumo

### O Que Muda
- ✅ URLs: `/api/*` → `/api/v2/*`
- ✅ Auth: `X-User-ID` → `Authorization: Bearer`
- ✅ Resposta: `data` → `{ success, data }`

### O Que NÃO Muda
- ✅ Autenticação web (Supabase Session)
- ✅ Lógica de negócio
- ✅ Estrutura de dados

### Benefícios
- ✅ Mais seguro
- ✅ Mais consistente
- ✅ Melhor experiência de desenvolvimento

---

**Última atualização**: 2025-01-28  
**Versão do guia**: 1.0

