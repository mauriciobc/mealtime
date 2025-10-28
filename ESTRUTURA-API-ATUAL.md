# 📁 Estrutura da API - Mealtime

## 🔍 Análise: Não Há Versionamento Explícito

O projeto **não utiliza versionamento de API** com prefixos como `/v1/`, `/v2/`, etc.

Todas as rotas estão diretamente em `/app/api/` sem prefixos de versão.

---

## 📊 Estrutura Atual da API

### Base URL
```
/api/
```

### Estrutura de Diretórios

```
app/api/
├── auth/                     # Autenticação
│   ├── callback/            # Callback OAuth
│   └── mobile/              # Auth mobile (JWT)
│       ├── route.ts         # POST/PUT (login/refresh)
│       └── register/        # POST (registro)
│
├── cats/                     # Gerenciamento de gatos
│   ├── route.ts             # GET/POST (listar/criar)
│   └── [catId]/             # Operações por ID
│       ├── route.ts         # GET/PUT/DELETE
│       └── next-feeding/    # Próxima alimentação
│
├── feedings/                 # Sistema de alimentação
│   ├── route.ts             # GET/POST (listar/criar)
│   ├── [id]/                # GET/DELETE por ID
│   ├── batch/               # Operações em lote
│   ├── cats/                # Alimentações por gato
│   ├── last/[catId]/        # Última alimentação
│   └── stats/               # Estatísticas
│
├── households/               # Gerenciamento de casas
│   ├── route.ts             # GET/POST
│   ├── [id]/                # Operações por ID
│   │   ├── cats/            # Gatos da casa
│   │   ├── feeding-logs/    # Logs de alimentação
│   │   ├── invite/          # Convites
│   │   ├── invite-code/     # Códigos de convite
│   │   └── members/         # Membros
│   └── join/                # Entrar em casa
│
├── mobile/                   # Rotas otimizadas mobile
│   └── cats/                # GET/POST gatos (com JWT)
│
├── weight/                   # Sistema de peso
│   ├── goals/               # Metas de peso
│   └── logs/                # Registros de peso
│
├── weight-logs/              # Logs de peso (alternativo?)
│
├── goals/                    # Metas gerais
│
├── schedules/                # Agendamentos
│   ├── route.ts             # GET/POST
│   └── [id]/                # GET/PUT/DELETE
│
├── notifications/            # Sistema de notificações
│   └── (não listado aqui)
│
├── scheduled-notifications/  # Notificações agendadas
│   ├── route.ts
│   └── deliver/
│
├── statistics/               # Estatísticas gerais
│
├── profile/                  # Perfis de usuário
│   └── [idOrUsername]/
│
├── users/                    # Gerenciamento de usuários
│   └── [id]/
│
├── upload/                   # Upload de arquivos
│
├── monitoring/               # Monitoramento
│   └── errors/
│
├── test-prisma/              # Testes Prisma
│
└── swagger/                  # Documentação Swagger
```

---

## 🎯 Tipos de Rotas

### 1. Rotas Web (Autenticação via Supabase Cookies)
- Usadas pelo aplicativo Next.js web
- Autenticação: Session cookies do Supabase
- Exemplos: `/api/cats`, `/api/feedings`, etc.

### 2. Rotas Mobile (Autenticação via JWT)
- Usadas por aplicativos Android/iOS
- Autenticação: `Authorization: Bearer <token>`
- Exemplos: `/api/mobile/cats`, `/api/auth/mobile`

### 3. Rotas Antigas (Autenticação via X-User-ID) ⚠️
- **DESCONTINUADAS** - Precisam migrar para JWT
- Autenticação: Header customizado `X-User-ID`
- Ver: `ROTAS-PARA-MIGRACAO-JWT.md`

---

## 🔐 Métodos de Autenticação por Rota

### ✅ Usando JWT (Middleware `withMobileAuth`)
```typescript
app/api/mobile/cats/route.ts
```

### ❌ Usando X-User-ID (Método antigo)
```typescript
app/api/cats/route.ts
app/api/feedings/route.ts
app/api/weight-logs/route.ts
// ... (ver lista completa em ROTAS-PARA-MIGRACAO-JWT.md)
```

### 🌐 Usando Supabase Session (Web)
```typescript
// Maioria das rotas usa createClient() do Supabase
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

---

## 📝 Inconsistências Identificadas

### 1. Rotas Duplicadas

**Peso**:
- `/api/weight/logs` 
- `/api/weight-logs`

**Alimentação**:
- `/api/feedings`
- `/api/feeding-logs`

**Recomendação**: Consolidar em uma única rota para cada recurso.

### 2. Rotas de Household vs. Diretas

**Gatos**:
- `/api/cats` (direto)
- `/api/households/[id]/cats` (por household)
- `/api/mobile/cats` (mobile)

**Recomendação**: Padronizar acesso por household.

### 3. Métodos de Autenticação Misturados

- Algumas rotas usam JWT (`/api/mobile/*`)
- Outras usam `X-User-ID` (rotas antigas)
- Outras usam Supabase Session (web)

**Recomendação**: Migrar todas para JWT (ver `ROTAS-PARA-MIGRACAO-JWT.md`)

---

## 🎯 Proposta: Implementar Versionamento

### Estrutura Proposta (Futuro)

```
app/api/
├── v1/                       # Versão 1 (atual, em migração)
│   ├── cats/
│   ├── feedings/
│   └── ...
│
└── v2/                       # Versão 2 (futura, com JWT)
    ├── auth/
    │   └── mobile/
    ├── cats/
    ├── feedings/
    └── ...
```

### Benefícios do Versionamento

1. **Compatibilidade**: Apps antigos continuam funcionando
2. **Migração gradual**: Tempo para atualizar clientes
3. **Breaking changes**: Mudanças sem quebrar apps existentes
4. **Clareza**: Versão explícita nos endpoints

### Como Implementar

```typescript
// app/api/v2/cats/route.ts
import { withMobileAuth } from '@/lib/middleware/mobile-auth';

export const GET = withMobileAuth(async (request, user) => {
  // Nova implementação com JWT
});

// app/api/v1/cats/route.ts (deprecado)
export async function GET(request: NextRequest) {
  // Implementação antiga com X-User-ID
  // + Warning header: "X-API-Version-Deprecated: true"
}
```

---

## 📊 Status Atual vs. Proposto

| Aspecto | Status Atual | Proposto |
|---------|--------------|----------|
| **Versionamento** | ❌ Não existe | ✅ /v1/ e /v2/ |
| **Autenticação** | ⚠️ Mista (3 métodos) | ✅ JWT padronizado |
| **Rotas duplicadas** | ⚠️ Existem | ✅ Consolidadas |
| **Documentação** | ⚠️ Parcial | ✅ Completa |
| **Consistência** | ⚠️ Baixa | ✅ Alta |

---

## 🚀 Plano de Ação Recomendado

### Fase 1: Migração JWT (Sem Versionamento)
1. Migrar rotas de prioridade alta para JWT
2. Manter estrutura atual `/api/*`
3. Documentar mudanças

### Fase 2: Implementar V2 (Com Versionamento)
1. Criar `/api/v2/` com rotas migradas
2. Marcar `/api/v1/` como deprecated
3. Adicionar headers de versão

### Fase 3: Deprecação V1
1. Avisar clientes sobre deprecação
2. Período de transição (3-6 meses)
3. Remover V1

---

## 📚 Documentação Relacionada

- **Estrutura atual**: `app/api/` (este documento)
- **Rotas para migrar**: `ROTAS-PARA-MIGRACAO-JWT.md`
- **Testes JWT**: `docs/TESTE-JWT-AUTHENTICATION.md`
- **API Mobile**: `docs/api/mobile-api.md`
- **Swagger**: `/api/swagger.yaml`

---

## 📌 Conclusão

### Resposta à Pergunta: "Verificar implementações em /V1"

**Não há implementações em `/V1`** no projeto. O sistema atual:

1. ❌ **Não usa versionamento de API**
2. ⚠️ **Tem 3 métodos de autenticação diferentes**
3. ⚠️ **Tem rotas duplicadas**
4. ✅ **Tem estrutura funcional, mas precisa de padronização**

### Recomendação

Se você está procurando por uma "versão 1" da API ou querendo implementar versionamento:

1. **Curto prazo**: Migre as 13 rotas para JWT (ver `ROTAS-PARA-MIGRACAO-JWT.md`)
2. **Médio prazo**: Implemente `/api/v2/` com as rotas migradas
3. **Longo prazo**: Deprecie rotas antigas e consolide duplicadas

---

**Última atualização**: 2025-01-28

