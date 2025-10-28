# 🔄 Consolidação de Rotas Duplicadas

## Rotas Duplicadas Identificadas

### 1. Weight Logs (Registros de Peso)

**Rotas duplicadas**:
- `/api/weight-logs` ✅ (Migrada para `/api/v2/weight-logs`)
- `/api/weight/logs` ⚠️ (Rota alternativa)

**Decisão**: Usar `/api/v2/weight-logs` como rota oficial

**Ação**:
- ✅ `/api/v2/weight-logs` criado (4 métodos HTTP)
- ⏳ `/api/weight/logs` -> Redirecionar para `/api/v2/weight-logs`
- ⏳ Marcar `/api/weight/logs` como deprecated

### 2. Feeding Logs (Registros de Alimentação)

**Rotas duplicadas**:
- `/api/feedings` ✅ (Migrada para `/api/v2/feedings`)
- `/api/feeding-logs` ⚠️ (Rota alternativa)

**Decisão**: Usar `/api/v2/feedings` como rota oficial

**Ação**:
- ✅ `/api/v2/feedings` criado
- ⏳ `/api/feeding-logs` -> Redirecionar para `/api/v2/feedings`
- ⏳ Marcar `/api/feeding-logs` como deprecated

---

## Implementação de Redirecionamentos

### /api/weight/logs -> /api/v2/weight-logs

```typescript
// app/api/weight/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { addDeprecatedWarning } from '@/lib/middleware/deprecated-warning';

export async function GET(request: NextRequest) {
  // Redirecionar para v2
  const { searchParams } = new URL(request.url);
  const v2Url = `/api/v2/weight-logs?${searchParams.toString()}`;
  
  const response = NextResponse.redirect(new URL(v2Url, request.url), 308);
  return addDeprecatedWarning(response);
}

// Repetir para POST, PUT, DELETE se necessário
```

### /api/feeding-logs -> /api/v2/feedings

```typescript
// app/api/feeding-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { addDeprecatedWarning } from '@/lib/middleware/deprecated-warning';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const v2Url = `/api/v2/feedings?${searchParams.toString()}`;
  
  const response = NextResponse.redirect(new URL(v2Url, request.url), 308);
  return addDeprecatedWarning(response);
}
```

---

## Status

- ✅ Rotas v2 criadas (oficiais)
- ⏳ Redirecionamentos pendentes
- ⏳ Rotas antigas marcadas como deprecated

**Decisão**: Manter ambas funcionando por período de transição (6 meses) com redirecionamentos.

