# Scripts de Teste de Notificações

Este diretório contém scripts úteis para testar o sistema de notificações do MealTime.

## 📋 Scripts Disponíveis

### 1. `create-notification-current-user.ts`

Script flexível para criar notificações de teste para o usuário atual.

#### Uso Básico

```bash
# Criar uma notificação padrão (tipo info)
npx tsx scripts/create-notification-current-user.ts
```

#### Criar Notificação com Tipo Específico

```bash
# Criar notificação de alimentação
npx tsx scripts/create-notification-current-user.ts feeding

# Criar notificação de lembrete
npx tsx scripts/create-notification-current-user.ts reminder

# Criar notificação de aviso
npx tsx scripts/create-notification-current-user.ts warning

# Criar notificação de erro
npx tsx scripts/create-notification-current-user.ts error

# Criar notificação de domicílio
npx tsx scripts/create-notification-current-user.ts household

# Criar notificação do sistema
npx tsx scripts/create-notification-current-user.ts system

# Criar notificação informativa
npx tsx scripts/create-notification-current-user.ts info
```

#### Criar Notificações de Todos os Tipos

```bash
# Criar 7 notificações (uma de cada tipo)
npx tsx scripts/create-notification-current-user.ts all
```

#### Criar Notificação Já Lida

```bash
# Criar notificação já marcada como lida
npx tsx scripts/create-notification-current-user.ts read
```

---

### 2. `create-all-notification-types.ts`

Script que cria uma coleção completa de notificações cobrindo todos os casos de uso.

#### Uso

```bash
# Criar ~15 notificações cobrindo todos os cenários
npx tsx scripts/create-all-notification-types.ts
```

#### O que este script cria:

1. **FEEDING** (2 notificações)
   - Nova alimentação registrada
   - Alimentação atrasada

2. **REMINDER** (2 notificações)
   - Lembrete de hora da alimentação
   - Alimentação programada em breve

3. **WARNING** (2 notificações)
   - Possível alimentação duplicada
   - Gato não alimentado

4. **INFO** (2 notificações)
   - Relatório semanal
   - Mensagem de boas-vindas

5. **HOUSEHOLD** (2 notificações)
   - Novo membro adicionado
   - Membro saiu do domicílio

6. **SYSTEM** (2 notificações)
   - Atualização do sistema
   - Configurações atualizadas

7. **ERROR** (2 notificações)
   - Erro ao registrar alimentação
   - Erro de sincronização

---

## 🎯 Casos de Uso de Notificações

### Tipos de Notificações

| Tipo | Descrição | Quando é usada |
|------|-----------|----------------|
| `feeding` | Notificações de alimentação | Novo registro de alimentação, alimentação atrasada |
| `reminder` | Lembretes de alimentação | Hora da alimentação, alimentação programada |
| `warning` | Avisos | Alimentação duplicada, gato não alimentado |
| `info` | Informações gerais | Relatórios, mensagens informativas |
| `household` | Notificações de domicílio | Membro adicionado/removido |
| `system` | Notificações do sistema | Atualizações, configurações |
| `error` | Erros | Falhas de registro, sincronização |

---

## 📝 Exemplos de Uso

### Cenário 1: Teste Básico

```bash
# Criar uma notificação simples
npx tsx scripts/create-notification-current-user.ts info "Teste" "Esta é uma mensagem de teste"
```

### Cenário 2: Teste Completo

```bash
# Criar todas as notificações de uma vez
npx tsx scripts/create-all-notification-types.ts
```

### Cenário 3: Teste Progressivo

```bash
# Criar notificação de cada tipo uma por uma
npx tsx scripts/create-notification-current-user.ts feeding
npx tsx scripts/create-notification-current-user.ts reminder
npx tsx scripts/create-notification-current-user.ts warning
npx tsx scripts/create-notification-current-user.ts info
npx tsx scripts/create-notification-current-user.ts household
npx tsx scripts/create-notification-current-user.ts system
npx tsx scripts/create-notification-current-user.ts error
```

---

## 🔍 Verificando as Notificações

Após executar os scripts, você pode verificar as notificações de duas formas:

### 1. No Navegador

- Abra `http://localhost:3000`
- Clique no ícone de sino no header
- Veja as notificações no popover ou navegue para `/notifications`

### 2. No Banco de Dados

```bash
# Usar Prisma Studio para ver as notificações
npx prisma studio
```

---

## 🧪 Casos de Teste Recomendados

### 1. Badge de Notificação
```bash
npx tsx scripts/create-notification-current-user.ts feeding
```
**Verificar**: Badge "1" deve aparecer no ícone de sino

### 2. Múltiplas Notificações
```bash
npx tsx scripts/create-all-notification-types.ts
```
**Verificar**: Badge deve mostrar o número total de notificações não lidas

### 3. Notificações Lidas
```bash
npx tsx scripts/create-notification-current-user.ts read
```
**Verificar**: Notificação aparece mas não incrementa o badge

### 4. Estado Vazio
Remova todas as notificações e verifique a UI de estado vazio

### 5. Realtime
Execute o script enquanto a página está aberta
```bash
npx tsx scripts/create-notification-current-user.ts
```
**Verificar**: Notificação deve aparecer instantaneamente via realtime

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"

Certifique-se de estar no diretório raiz do projeto:
```bash
cd "d:\Mauricio\Code\new code\mealtime"
```

### Erro: "User not found"

Verifique se o ID do usuário está correto no script:
```typescript
const currentUserId = '2e94b809-cc45-4dfb-80e1-a67365d2e714';
```

### Erro: "Database connection"

Certifique-se de que o banco de dados está rodando:
```bash
npx prisma migrate dev
```

---

## 📊 Metadados das Notificações

Cada notificação inclui metadados ricos no campo `metadata`:

```typescript
{
  source: string;          // Origem da notificação
  timestamp: string;       // Timestamp ISO
  testMode: boolean;      // Flag de teste
  targetUser: string;     // ID do usuário
  // ... campos específicos do tipo
}
```

Exemplos:
- `catId`, `catName` (feeding, reminder, warning)
- `householdId`, `memberName` (household)
- `version`, `features` (system)
- `errorCode`, `errorMessage` (error)

---

## 🚀 Próximos Passos

1. **Teste Interativo**: Use o script `create-all-notification-types.ts` para gerar todas as notificações
2. **Validar UI**: Verifique todos os cenários na interface
3. **Verificar Performance**: Teste com muitas notificações (100+)
4. **Testar Realtime**: Deixe a página aberta e execute o script
5. **Validar Cache**: Recarregue a página e verifique se o cache funciona

---

**Última atualização**: 26/10/2025

