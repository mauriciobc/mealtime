# Refatoração do Sistema de Notificações - API v2

## 📋 Sumário Executivo

A função `createNotification` foi refatorada de acesso direto ao banco de dados para uma arquitetura baseada em API REST, seguindo o padrão estabelecido no projeto com Next.js 16.

## 🎯 Objetivos da Refatoração

1. **Separação de Responsabilidades**: Mover a lógica de criação de notificações do cliente para o servidor
2. **Segurança**: Centralizar validação e autorização na camada de API
3. **Consistência**: Seguir o mesmo padrão das outras rotas v2 do projeto
4. **Manutenibilidade**: Facilitar testes e debugging com logs centralizados

## 🏗️ Arquitetura Implementada

### Antes da Refatoração

```
Cliente (Browser)
    ↓
SupabaseNotificationService
    ↓
Banco de Dados (Direto)
```

**Problemas:**
- Validação inconsistente
- Logs dispersos
- Difícil de testar
- Possíveis problemas de segurança

### Depois da Refatoração

```
Cliente (Browser)
    ↓
SupabaseNotificationService (Wrapper)
    ↓
API Route (/api/v2/notifications)
    ↓
Middleware de Autenticação (withHybridAuth)
    ↓
Validação (Zod Schema)
    ↓
Logger
    ↓
Prisma (Banco de Dados)
```

**Benefícios:**
- ✅ Validação centralizada e consistente
- ✅ Logs estruturados e rastreáveis
- ✅ Autenticação e autorização robustas
- ✅ Fácil de testar e debugar
- ✅ Compatível com deployment no Netlify

## 📁 Arquivos Criados/Modificados

### Novos Arquivos

#### 1. `/app/api/v2/notifications/route.ts`
**Rotas:** `POST /api/v2/notifications`, `GET /api/v2/notifications`

```typescript
// POST - Criar notificação
POST /api/v2/notifications
Body: {
  title: string,
  message: string,
  type: 'feeding' | 'reminder' | 'household' | 'system' | 'info' | 'warning' | 'error',
  isRead?: boolean,
  metadata?: Record<string, any>
}

// GET - Listar notificações
GET /api/v2/notifications?page=1&limit=10&unreadOnly=false
```

#### 2. `/app/api/v2/notifications/[id]/route.ts`
**Rotas:** `GET`, `PATCH`, `DELETE` para notificação específica

```typescript
// GET - Buscar notificação
GET /api/v2/notifications/[id]

// PATCH - Atualizar notificação (marcar como lida)
PATCH /api/v2/notifications/[id]
Body: {
  isRead: boolean
}

// DELETE - Deletar notificação
DELETE /api/v2/notifications/[id]
```

#### 3. `/app/api/v2/notifications/bulk/route.ts`
**Rotas:** Operações em lote

```typescript
// PATCH - Operações em lote
PATCH /api/v2/notifications/bulk
Body: {
  action: 'mark_as_read' | 'mark_all_as_read',
  ids?: string[]  // Requerido para 'mark_as_read'
}

// DELETE - Deletar múltiplas notificações
DELETE /api/v2/notifications/bulk
Body: {
  ids: string[]
}
```

### Arquivos Modificados

#### `/lib/services/supabase-notification-service.ts`
- ✅ Método `createNotification()` refatorado para chamar a API
- ✅ Usa `fetch()` com autenticação Bearer token
- ✅ Trata erros de forma consistente
- ✅ Mantém interface compatível

#### `/lib/services/notificationService.ts`
- ✅ Função `createNotification()` não mais lança erro
- ✅ Agora funciona como wrapper para o service real
- ✅ Mantém compatibilidade com código legado

## 🔧 Como Usar

### Exemplo 1: Criar Notificação (Recomendado)

```typescript
import { notificationService } from '@/lib/services/supabase-notification-service';

// Em um componente React ou função
async function criarNotificacao() {
  try {
    const notification = await notificationService.createNotification({
      title: '🎉 Gato alimentado!',
      message: 'Whiskers foi alimentado às 14:30',
      type: 'feeding',
      isRead: false,
      metadata: {
        catId: 'uuid-do-gato',
        actionUrl: '/cats/uuid-do-gato'
      }
    });
    
    console.log('Notificação criada:', notification);
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
  }
}
```

### Exemplo 2: Usar a API Diretamente

```typescript
// Útil para chamadas do servidor ou Edge Functions
async function criarNotificacaoDiretamente() {
  const response = await fetch('/api/v2/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Notificação de Teste',
      message: 'Esta é uma mensagem de teste',
      type: 'info',
      isRead: false,
      metadata: {}
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Notificação criada:', result.data);
  } else {
    console.error('Erro:', result.error);
  }
}
```

### Exemplo 3: Marcar Todas Como Lidas

```typescript
async function marcarTodasComoLidas() {
  const response = await fetch('/api/v2/notifications/bulk', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'mark_all_as_read'
    })
  });
  
  const result = await response.json();
  console.log(`${result.data.updatedCount} notificações marcadas como lidas`);
}
```

## 🔒 Segurança

### Autenticação
- ✅ Todas as rotas protegidas com `withHybridAuth`
- ✅ Token JWT validado em cada requisição
- ✅ Usuário extraído do token automaticamente

### Autorização
- ✅ Usuários só podem criar notificações para si mesmos
- ✅ Usuários só podem ver/modificar suas próprias notificações
- ✅ Validação de household/cat ownership nas rotas específicas

### Validação
- ✅ Schemas Zod para validação de entrada
- ✅ Sanitização automática de dados
- ✅ Limites de tamanho (título: 255 chars, mensagem: 1000 chars)
- ✅ Limites de operações em lote (máximo 100 IDs)

## 📊 Logging e Monitoramento

Todas as rotas incluem logs estruturados:

```typescript
// Logs de debug
logger.debug("[POST /api/v2/notifications] Received body:", body);

// Logs de info
logger.info("[POST /api/v2/notifications] Notification created: uuid");

// Logs de erro
logger.error("[POST /api/v2/notifications] Error:", error);

// Logs de warning
logger.warn("[POST /api/v2/notifications] Access denied");
```

## 🧪 Como Testar

### 1. Teste Manual via Página de Teste

```bash
# Acesse a página de teste
http://localhost:3000/test-notifications
```

### 2. Teste via cURL

```bash
# Criar notificação
curl -X POST http://localhost:3000/api/v2/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "title": "Teste",
    "message": "Mensagem de teste",
    "type": "info"
  }'

# Listar notificações
curl -X GET "http://localhost:3000/api/v2/notifications?page=1&limit=10" \
  -H "Authorization: Bearer SEU_TOKEN"

# Marcar como lida
curl -X PATCH http://localhost:3000/api/v2/notifications/UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"isRead": true}'

# Marcar todas como lidas
curl -X PATCH http://localhost:3000/api/v2/notifications/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"action": "mark_all_as_read"}'

# Deletar notificação
curl -X DELETE http://localhost:3000/api/v2/notifications/UUID \
  -H "Authorization: Bearer SEU_TOKEN"
```

### 3. Teste via Script Node.js

```javascript
// scripts/test-notification-api.js
const TOKEN = 'seu-token-aqui';

async function testarAPI() {
  // Criar notificação
  const response = await fetch('http://localhost:3000/api/v2/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      title: 'Teste via Script',
      message: 'Esta notificação foi criada via script de teste',
      type: 'info'
    })
  });
  
  const result = await response.json();
  console.log('Resultado:', result);
}

testarAPI();
```

## 📈 Métricas de Resposta

Baseado nos padrões do projeto:

| Operação | Endpoint | Tempo Esperado | Status HTTP |
|----------|----------|----------------|-------------|
| Criar notificação | POST /api/v2/notifications | < 200ms | 201 |
| Listar notificações | GET /api/v2/notifications | < 150ms | 200 |
| Buscar notificação | GET /api/v2/notifications/[id] | < 100ms | 200 |
| Atualizar notificação | PATCH /api/v2/notifications/[id] | < 150ms | 200 |
| Deletar notificação | DELETE /api/v2/notifications/[id] | < 150ms | 200 |
| Operações em lote | PATCH/DELETE /bulk | < 300ms | 200 |

## 🚀 Deploy no Netlify

As rotas são compatíveis com Netlify OpenNext:

```toml
# netlify.toml (já configurado)
[build]
  command = "npm run build -- --webpack"
  publish = ".next"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/___netlify-handler/:splat"
  status = 200
```

## 🔄 Compatibilidade com Código Legado

A refatoração mantém **100% de compatibilidade** com código existente:

```typescript
// ✅ Código legado continua funcionando
import { createNotification } from '@/lib/services/notificationService';

await createNotification({
  title: 'Teste',
  message: 'Mensagem',
  type: 'info',
  metadata: {}
});
```

Internamente, ele chama `notificationService.createNotification()` que agora usa a API.

## 🐛 Debugging

### Logs no Servidor

```bash
# Ver logs em desenvolvimento
npm run dev

# Logs aparecem no terminal:
# [SupabaseNotificationService] createNotification via API
# [POST /api/v2/notifications] Received body: {...}
# [POST /api/v2/notifications] Creating notification for user uuid
# [POST /api/v2/notifications] Notification created successfully: uuid
```

### Logs no Cliente

```javascript
// Abra o DevTools Console
// Você verá:
// [SupabaseNotificationService] createNotification via API
// [SupabaseNotificationService] Notification created successfully: uuid
```

## 📝 Próximos Passos

1. ✅ **Implementado**: Rotas CRUD completas
2. ✅ **Implementado**: Operações em lote
3. 🔄 **Sugerido**: Adicionar rate limiting
4. 🔄 **Sugerido**: Implementar cache de notificações
5. 🔄 **Sugerido**: Adicionar webhooks para notificações em tempo real
6. 🔄 **Sugerido**: Implementar notificações push (PWA)

## 🎓 Aprendizados e Boas Práticas

### ✅ O que fizemos certo

1. **Validação com Zod**: Garante type-safety e validação robusta
2. **Logging estruturado**: Facilita debugging em produção
3. **Autenticação centralizada**: Middleware reutilizável
4. **Compatibilidade retroativa**: Código legado continua funcionando
5. **Padrão consistente**: Segue arquitetura do resto do projeto

### 🎯 Padrão de Respostas

Todas as respostas seguem o padrão:

```typescript
// Sucesso
{
  success: true,
  data: { /* dados */ },
  message?: string  // Opcional
}

// Erro
{
  success: false,
  error: string,
  details?: any  // Apenas em validação
}
```

## 📚 Referências

- [Next.js 16 API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Zod Validation](https://zod.dev/)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
- [Netlify OpenNext](https://github.com/netlify/opennext)

---

**Autor**: AI Assistant  
**Data**: 28 de Outubro de 2025  
**Versão**: 1.0.0  
**Status**: ✅ Implementado e Testado

