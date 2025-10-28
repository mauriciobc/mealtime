# 🔒 Correção Crítica: Sistema de Convites com Consentimento

## 🎯 Problema Identificado

**Violação de Privacidade Crítica**: Usuários existentes eram adicionados automaticamente a households sem seu consentimento quando recebiam um convite por email.

### Fluxo Anterior (PROBLEMÁTICO)
```
Admin convida user@example.com
    ↓
Se usuário já existe → ❌ ADICIONADO AUTOMATICAMENTE (sem consentimento)
Se usuário não existe → ✅ Recebe email de convite (requer aceitação)
```

### Inconsistência
- **Novo usuário**: Email → Cria conta → Aceita convite
- **Usuário existente**: Adicionado imediatamente → ❌ Sem opção de recusar

## ✅ Solução Implementada

### Novo Fluxo Consistente
```
Admin convida user@example.com
    ↓
Se usuário já existe → 📧 Notificação in-app (requer aceitação/rejeição)
Se usuário não existe → 📧 Email de convite (requer aceitação)
```

### Arquitetura da Solução

#### 1. Sistema de Notificações (Sem mudanças no Schema!)
Utilizamos a tabela `notifications` existente com metadados especiais:

```typescript
// Notificação de convite
{
  type: 'household_invite',
  title: 'Convite para [Nome do Household]',
  message: '[Inviter] convidou você...',
  is_read: false,
  metadata: {
    householdId: 'uuid',
    householdName: 'string',
    invitedBy: 'uuid',
    inviterName: 'string',
    invitedAt: 'ISO timestamp',
    status?: 'accepted' | 'rejected' | 'expired'
  }
}
```

#### 2. Novos Endpoints

**Aceitar Convite**
```
POST /api/v2/households/invites/[notificationId]/accept

Resposta (200):
{
  "success": true,
  "message": "Successfully joined household",
  "household": { ... }
}
```

**Rejeitar Convite**
```
POST /api/v2/households/invites/[notificationId]/reject

Resposta (200):
{
  "success": true,
  "message": "Invitation rejected successfully"
}
```

#### 3. Proteções Implementadas

**Validação de Propriedade**
```typescript
if (notification.user_id !== user.id) {
  return 403 // Não pode aceitar convite de outro usuário
}
```

**Verificação de Duplicatas**
```typescript
// Antes de criar notificação
const existingInvite = await prisma.notifications.findFirst({
  where: {
    user_id: targetUser.id,
    type: 'household_invite',
    is_read: false,
    metadata: { path: ['householdId'], equals: householdId }
  }
});
```

**Verificação de Membership**
```typescript
// Antes de aceitar convite
const existingMembership = await prisma.household_members.findFirst({
  where: { user_id, household_id }
});
```

**Validação de Household**
```typescript
// Household pode ter sido deletado
const household = await prisma.households.findUnique({
  where: { id: householdId }
});

if (!household) {
  // Marca convite como expirado
  metadata.status = 'expired';
}
```

## 🔄 Fluxo Completo

### Para Usuários Existentes

1. **Admin envia convite**
   ```typescript
   POST /api/v2/households/[id]/invite
   Body: { email: "existing@user.com" }
   ```

2. **Sistema verifica usuário**
   - Usuário encontrado no Supabase Auth
   - Não é membro do household
   - Não tem convite pendente

3. **Notificação criada**
   ```typescript
   await prisma.notifications.create({
     data: {
       user_id: existingUser.id,
       type: 'household_invite',
       title: `Convite para ${household.name}`,
       message: `${inviterName} convidou você...`,
       metadata: { householdId, ... }
     }
   });
   ```

4. **Usuário vê notificação**
   - Frontend detecta `type: 'household_invite'`
   - Exibe botões "Aceitar" / "Rejeitar"

5. **Usuário decide**
   
   **Se aceitar:**
   ```typescript
   POST /api/v2/households/invites/[notificationId]/accept
   
   → Cria household_members
   → Marca notificação como lida
   → Atualiza metadata.status = 'accepted'
   → Notifica o admin que convidou
   ```

   **Se rejeitar:**
   ```typescript
   POST /api/v2/households/invites/[notificationId]/reject
   
   → Marca notificação como lida
   → Atualiza metadata.status = 'rejected'
   ```

### Para Novos Usuários

1. **Admin envia convite**
2. **Sistema não encontra usuário**
3. **Email enviado via Supabase**
   ```typescript
   await supabaseAdmin.auth.admin.inviteUserByEmail(
     email,
     { redirectTo: '/join?householdId=...' }
   );
   ```
4. **Usuário cria conta**
5. **Redirecionado para aceitar convite**

## 📊 Comparação

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Consentimento | ❌ Não | ✅ Sim |
| Consistência | ❌ Fluxos diferentes | ✅ Mesma experiência |
| Notificação ao convidado | ❌ Não | ✅ Sim |
| Notificação ao admin | ❌ Não | ✅ Sim (ao aceitar) |
| Convites duplicados | ❌ Permitido | ✅ Bloqueado |
| Households deletados | ❌ Não verificado | ✅ Tratado |
| Schema changes | N/A | ✅ Zero mudanças |

## 🎨 Frontend (TODO)

### Componente de Notificação de Convite

```typescript
interface HouseholdInviteNotification {
  id: string;
  title: string;
  message: string;
  metadata: {
    householdId: string;
    householdName: string;
    inviterName: string;
  };
}

function InviteNotificationCard({ notification }: Props) {
  const handleAccept = async () => {
    await fetch(`/api/v2/households/invites/${notification.id}/accept`, {
      method: 'POST'
    });
    // Refresh user context and notifications
  };

  const handleReject = async () => {
    await fetch(`/api/v2/households/invites/${notification.id}/reject`, {
      method: 'POST'
    });
    // Refresh notifications
  };

  return (
    <Card>
      <CardHeader>
        <Home className="h-5 w-5" />
        <CardTitle>{notification.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{notification.message}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAccept} variant="default">
          Aceitar
        </Button>
        <Button onClick={handleReject} variant="outline">
          Rejeitar
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### Integração com Sistema de Notificações

```typescript
// Em notifications/page.tsx ou componente similar
const renderNotification = (notification: Notification) => {
  switch (notification.type) {
    case 'household_invite':
      return <HouseholdInviteNotificationCard notification={notification} />;
    case 'feeding':
      return <FeedingNotificationCard notification={notification} />;
    // ... outros tipos
  }
};
```

## 🔐 Segurança

### Validações Implementadas

1. **Autenticação**: Todos os endpoints usam `withHybridAuth`
2. **Autorização**: Usuário só pode aceitar/rejeitar seus próprios convites
3. **Ownership**: Apenas admins/owners podem enviar convites
4. **Idempotência**: Aceitar convite múltiplas vezes não cria múltiplos memberships
5. **Estado**: Household pode ter sido deletado entre convite e aceitação

### Logs e Monitoramento

```typescript
// Todos os endpoints têm logs detalhados
logger.info('[POST /api/v2/households/invite] Invite notification sent', {
  userId: targetUser.id,
  householdId,
  notificationId
});

logger.warn('[POST /api/v2/households/invites/accept] User attempted unauthorized access', {
  userId: user.id,
  notificationOwnerId: notification.user_id
});
```

## 📝 Tipos de Notificação

Agora temos um novo tipo oficial:

```typescript
type NotificationType = 
  | 'feeding'      // Alimentação registrada/pendente
  | 'reminder'     // Lembrete de horário
  | 'warning'      // Aviso de atraso/duplicata
  | 'household'    // Evento geral do household
  | 'household_invite'  // 🆕 Convite pendente
  | 'system'       // Atualização do sistema
  | 'info'         // Informação geral
  | 'error';       // Erro/falha
```

## 🧪 Testes Sugeridos

### Cenário 1: Usuário Existente Aceita
```
1. Admin A convida user@test.com (usuário existente B)
2. Verificar notificação criada para B
3. B aceita convite via /accept
4. Verificar B é membro do household
5. Verificar notificação marcada como lida
6. Verificar A recebe confirmação
```

### Cenário 2: Usuário Existente Rejeita
```
1. Admin A convida user@test.com (usuário existente B)
2. B rejeita convite via /reject
3. Verificar B NÃO é membro
4. Verificar notificação marcada como lida
```

### Cenário 3: Convite Duplicado
```
1. Admin A convida user@test.com
2. Admin A convida user@test.com novamente
3. Verificar apenas 1 notificação existe
4. Verificar resposta: "Invitation already sent"
```

### Cenário 4: Household Deletado
```
1. Admin A convida user@test.com
2. Household é deletado
3. User tenta aceitar convite
4. Verificar erro 404: "Household no longer exists"
5. Verificar notificação marcada como expirada
```

### Cenário 5: Usuário Já É Membro
```
1. User B é adicionado ao household manualmente
2. Admin A convida user@test.com (email de B)
3. Verificar resposta: "User is already a member"
```

## 🚀 Próximos Passos

1. ✅ Backend: Sistema de notificações implementado
2. ✅ Backend: Endpoints de aceitar/rejeitar criados
3. ⏳ Frontend: Componente de convite pendente
4. ⏳ Frontend: Integração com lista de notificações
5. ⏳ Testes: Casos de uso completos
6. ⏳ Docs: Atualizar Swagger/OpenAPI

## 📖 Referências

- Arquivo modificado: `app/api/v2/households/[id]/invite/route.ts`
- Novos arquivos:
  - `app/api/v2/households/invites/[notificationId]/accept/route.ts`
  - `app/api/v2/households/invites/[notificationId]/reject/route.ts`
- Schema: `prisma/schema.prisma` (notifications table)
- Autenticação: `lib/middleware/hybrid-auth.ts`

## 💡 Decisões de Design

### Por que não mudar o schema?
- **Simplicidade**: Usar tabela existente evita migrations
- **Flexibilidade**: Campo JSON `metadata` permite extensibilidade
- **Performance**: Índices existentes já cobrem queries necessárias
- **Consistência**: Sistema de notificações já é usado para outros eventos

### Por que notificação em vez de tabela de convites?
- **UX**: Usuário vê convite onde já olha notificações
- **Unificação**: Todos os eventos importantes em um lugar
- **Manutenção**: Menos código, menos complexidade
- **Escalabilidade**: Sistema de notificações já é escalável

### Por que não enviar email para usuário existente?
- **Imediatismo**: Notificação in-app é mais rápida
- **Contexto**: Usuário está logado, vê imediatamente
- **Flexibilidade**: Pode aceitar/rejeitar com um clique
- **Opção futura**: Podemos adicionar email + notificação depois

## ⚠️ Considerações

1. **Limpeza**: Considerar adicionar cron job para limpar convites antigos não respondidos
2. **Expiração**: Adicionar campo `expiresAt` nos metadados
3. **Rate Limiting**: Limitar quantos convites um admin pode enviar
4. **Batch Invites**: Considerar endpoint para convidar múltiplos usuários
5. **Email Opcional**: Opção de enviar email + notificação para usuários existentes

---

**Status**: ✅ Backend Completo | ⏳ Frontend Pendente
**Prioridade**: 🔴 Crítica (Privacidade/Consentimento)
**Impacto**: ✅ Zero breaking changes

