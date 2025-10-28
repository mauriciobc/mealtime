# 🔄 Rotas que Precisam Migrar para Autenticação JWT

## 📊 Resumo Executivo

**Total de arquivos identificados**: 16 arquivos  
**Arquivos .bak (backups)**: 3 arquivos (podem ser ignorados)  
**Rotas reais para migrar**: **13 arquivos**

---

## 🎯 Prioridade de Migração

### 🔴 **PRIORIDADE ALTA** - Rotas Críticas de Negócio

#### 1. `/api/feedings` - Sistema de Alimentação
**Arquivo**: `app/api/feedings/route.ts`
- **POST** `/api/feedings` (criar registro de alimentação)
- **GET** `/api/feedings` (listar alimentações)
- **Impacto**: CRÍTICO - funcionalidade principal do app
- **Complexidade**: MÉDIA

#### 2. `/api/feedings/[id]` - Operações em Alimentação Individual
**Arquivo**: `app/api/feedings/[id]/route.ts`
- **GET** `/api/feedings/[id]` (buscar alimentação específica)
- **DELETE** `/api/feedings/[id]` (deletar alimentação)
- **Impacto**: CRÍTICO
- **Complexidade**: MÉDIA

#### 3. `/api/feedings/stats` - Estatísticas de Alimentação
**Arquivo**: `app/api/feedings/stats/route.ts`
- **GET** `/api/feedings/stats` (estatísticas)
- **Impacto**: ALTO
- **Complexidade**: BAIXA

#### 4. `/api/cats` - Gerenciamento de Gatos
**Arquivo**: `app/api/cats/route.ts`
- **GET** `/api/cats` (listar gatos)
- **POST** `/api/cats` (criar gato)
- **Impacto**: CRÍTICO
- **Complexidade**: MÉDIA

#### 5. `/api/cats/[catId]/next-feeding` - Próxima Alimentação
**Arquivo**: `app/api/cats/[catId]/next-feeding/route.ts`
- **GET** `/api/cats/[catId]/next-feeding`
- **Impacto**: ALTO
- **Complexidade**: BAIXA

---

### 🟡 **PRIORIDADE MÉDIA** - Rotas Importantes

#### 6. `/api/weight-logs` - Registros de Peso
**Arquivo**: `app/api/weight-logs/route.ts`
- **POST** `/api/weight-logs` (criar registro)
- **GET** `/api/weight-logs` (listar registros)
- **PUT** `/api/weight-logs` (atualizar registro)
- **DELETE** `/api/weight-logs` (deletar registro)
- **Impacto**: MÉDIO
- **Complexidade**: ALTA (4 métodos HTTP)

#### 7. `/api/weight/logs` - Sistema de Peso (alternativo?)
**Arquivo**: `app/api/weight/logs/route.ts`
- **GET** `/api/weight/logs`
- **Impacto**: MÉDIO
- **Complexidade**: BAIXA
- **Nota**: Parece duplicado com `/api/weight-logs`

#### 8. `/api/goals` - Metas/Objetivos
**Arquivo**: `app/api/goals/route.ts`
- **GET** `/api/goals` (listar metas)
- **POST** `/api/goals` (criar meta)
- **Impacto**: MÉDIO
- **Complexidade**: MÉDIA

#### 9. `/api/feeding-logs` - Logs de Alimentação
**Arquivo**: `app/api/feeding-logs/route.ts`
- **GET** `/api/feeding-logs`
- **Impacto**: MÉDIO
- **Complexidade**: BAIXA
- **Nota**: Parece duplicado com `/api/feedings`

#### 10. `/api/schedules` - Agendamentos
**Arquivo**: `app/api/schedules/route.ts`
- **GET/POST** `/api/schedules`
- **Impacto**: MÉDIO
- **Complexidade**: MÉDIA

---

### 🟢 **PRIORIDADE BAIXA** - Rotas de Household (Multi-tenant)

#### 11. `/api/households/[id]/cats` - Gatos por Household
**Arquivo**: `app/api/households/[id]/cats/route.ts`
- **GET** `/api/households/[id]/cats`
- **POST** `/api/households/[id]/cats`
- **Impacto**: BAIXO (duplicado com `/api/cats`)
- **Complexidade**: MÉDIA

#### 12. `/api/households/[id]/invite` - Convites para Household
**Arquivo**: `app/api/households/[id]/invite/route.ts`
- **POST** `/api/households/[id]/invite`
- **Impacto**: BAIXO
- **Complexidade**: MÉDIA

#### 13. `/api/households/[id]/invite-code` - Código de Convite
**Arquivo**: `app/api/households/[id]/invite-code/route.ts`
- **GET** `/api/households/[id]/invite-code`
- **Impacto**: BAIXO
- **Complexidade**: BAIXA

---

## 🗂️ Arquivos Backup (Ignorar)

Estes arquivos são backups e não precisam ser migrados:
- `app/api/households/[id]/cats/route.ts.bak`
- `app/api/households/[id]/invite/route.ts.bak`
- `app/api/households/[id]/invite-code/route.ts.bak`

---

## 📋 Checklist de Migração

### Para cada rota, seguir estes passos:

- [ ] **1. Importar o middleware**
  ```typescript
  import { withMobileAuth, MobileAuthUser } from '@/lib/middleware/mobile-auth';
  ```

- [ ] **2. Remover leitura de `X-User-ID`**
  ```typescript
  // REMOVER:
  const authUserId = request.headers.get('X-User-ID');
  ```

- [ ] **3. Envolver handler com `withMobileAuth`**
  ```typescript
  // ANTES:
  export async function GET(request: NextRequest) {
    const authUserId = request.headers.get('X-User-ID');
    // ...
  }
  
  // DEPOIS:
  export const GET = withMobileAuth(async (request: NextRequest, user: MobileAuthUser) => {
    // user.id contém o ID do usuário
    // user.household_id contém o ID do household
    // ...
  });
  ```

- [ ] **4. Substituir `authUserId` por `user.id`**
  ```typescript
  // ANTES:
  where: { user_id: authUserId }
  
  // DEPOIS:
  where: { user_id: user.id }
  ```

- [ ] **5. Usar `user.household_id` quando necessário**
  ```typescript
  if (!user.household_id) {
    return NextResponse.json(
      { error: 'Usuário não está associado a um household' },
      { status: 403 }
    );
  }
  ```

- [ ] **6. Testar a rota**
  ```bash
  # Obter JWT
  TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/mobile \
    -H "Content-Type: application/json" \
    -d '{"email":"teste@mealtime.dev","password":"teste123456"}' \
    | jq -r '.access_token')
  
  # Testar rota
  curl http://localhost:3000/api/rota-migrada \
    -H "Authorization: Bearer $TOKEN"
  ```

---

## 🎓 Exemplo Completo de Migração

### ANTES (usando X-User-ID):

```typescript
// app/api/cats/route.ts
export async function GET(request: NextRequest) {
  const authUserId = request.headers.get('X-User-ID');
  
  if (!authUserId) {
    return NextResponse.json(
      { error: 'Não autorizado' }, 
      { status: 401 }
    );
  }

  const cats = await prisma.cats.findMany({
    where: {
      household_members: {
        some: { user_id: authUserId }
      }
    }
  });

  return NextResponse.json(cats);
}
```

### DEPOIS (usando JWT):

```typescript
// app/api/cats/route.ts
import { withMobileAuth, MobileAuthUser } from '@/lib/middleware/mobile-auth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withMobileAuth(async (request: NextRequest, user: MobileAuthUser) => {
  // Verificar se usuário tem household
  if (!user.household_id) {
    return NextResponse.json(
      { error: 'Usuário não está associado a um household' },
      { status: 403 }
    );
  }

  // Buscar gatos do household
  const cats = await prisma.cats.findMany({
    where: {
      household_id: user.household_id
    }
  });

  return NextResponse.json({
    success: true,
    data: cats,
    count: cats.length
  });
});
```

---

## 🧪 Script de Teste para Cada Rota

Criar arquivo `scripts/test-route-migration.sh`:

```bash
#!/bin/bash

# Configuração
EMAIL="teste@mealtime.dev"
PASSWORD="teste123456"
BASE_URL="http://localhost:3000"

# Fazer login e obter token
echo "🔐 Fazendo login..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/mobile" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $RESPONSE | jq -r '.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Falha ao obter token"
  exit 1
fi

echo "✅ Token obtido: ${TOKEN:0:40}..."

# Testar rota (passar como argumento)
ROUTE=$1

if [ -z "$ROUTE" ]; then
  echo "❌ Uso: $0 <rota>"
  echo "   Exemplo: $0 /api/cats"
  exit 1
fi

echo ""
echo "🧪 Testando rota: $ROUTE"
echo ""

curl -s "$BASE_URL$ROUTE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
```

**Uso**:
```bash
chmod +x scripts/test-route-migration.sh
./scripts/test-route-migration.sh /api/cats
```

---

## 📊 Estatísticas

| Prioridade | Quantidade | % do Total |
|------------|------------|------------|
| 🔴 ALTA    | 5 rotas    | 38%        |
| 🟡 MÉDIA   | 5 rotas    | 38%        |
| 🟢 BAIXA   | 3 rotas    | 24%        |
| **TOTAL**  | **13 rotas** | **100%**   |

---

## 🚀 Plano de Execução Recomendado

### Fase 1 - Rotas Críticas (1-2 dias)
1. `/api/feedings` e `/api/feedings/[id]`
2. `/api/feedings/stats`
3. `/api/cats` e `/api/cats/[catId]/next-feeding`

### Fase 2 - Rotas Importantes (1-2 dias)
4. `/api/weight-logs`
5. `/api/goals`
6. `/api/schedules`

### Fase 3 - Rotas Secundárias (1 dia)
7. `/api/feeding-logs` e `/api/weight/logs` (verificar se são duplicados)
8. Rotas de household

### Fase 4 - Testes e Validação (1 dia)
9. Testar todas as rotas migradas
10. Atualizar documentação
11. Remover código antigo

**Total estimado**: 5-6 dias

---

## ✅ Benefícios da Migração

1. **Segurança**: JWT validado pelo Supabase (não pode ser falsificado)
2. **Consistência**: Todas as rotas usam o mesmo método de autenticação
3. **Manutenção**: Código mais limpo e fácil de manter
4. **Auditoria**: Logs automáticos pelo middleware
5. **Performance**: Cache de validação pode ser implementado

---

## 📚 Documentação Relacionada

- **Middleware**: `lib/middleware/mobile-auth.ts`
- **Exemplo de uso**: `app/api/mobile/cats/route.ts`
- **Testes**: `scripts/test-jwt-auth.js`
- **Documentação**: `docs/TESTE-JWT-AUTHENTICATION.md`

---

## 🆘 Ajuda e Suporte

Se encontrar problemas durante a migração:

1. Verifique o console para erros
2. Teste o JWT com: `node scripts/test-jwt-auth.js`
3. Compare com o exemplo em: `app/api/mobile/cats/route.ts`
4. Consulte a documentação em: `docs/TESTE-JWT-AUTHENTICATION.md`

