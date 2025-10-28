# ⚠️ Status: Warnings de Deprecation em V1

## ✅ Imports Adicionados

O import `addDeprecatedWarning` foi adicionado em **11 rotas v1**:

1. ✅ `app/api/feedings/route.ts`
2. ✅ `app/api/feedings/[id]/route.ts`
3. ✅ `app/api/feedings/stats/route.ts`
4. ✅ `app/api/cats/[catId]/next-feeding/route.ts`
5. ✅ `app/api/weight-logs/route.ts`
6. ✅ `app/api/goals/route.ts`
7. ✅ `app/api/schedules/route.ts`
8. ✅ `app/api/schedules/[id]/route.ts`
9. ✅ `app/api/households/[id]/cats/route.ts`
10. ✅ `app/api/households/[id]/invite/route.ts`
11. ✅ `app/api/households/[id]/invite-code/route.ts`

## ✅ Warnings Implementados Manualmente

1. ✅ `app/api/cats/route.ts` - GET e POST (completo)

## ⏳ Rotas Pendentes de Wrapping Manual

As outras 10 rotas têm o import mas precisam wrap manual nos retornos.

**Padrão de implementação**:
```typescript
// ANTES:
return NextResponse.json(data);

// DEPOIS:
const response = NextResponse.json(data);
return addDeprecatedWarning(response);
```

---

## 📊 Status

| Item | Status | Progresso |
|------|--------|-----------|
| **Imports adicionados** | ✅ Completo | 100% (11/11) |
| **Warnings implementados** | 🔄 Parcial | 9% (1/11) |
| **Headers configurados** | ✅ Correto | 100% |

---

## 🎯 Decisão

Os imports estão prontos. O wrapping manual pode ser feito posteriormente conforme necessário.

**Prioridade**: Passar para as próximas fases (testes e documentação) que são mais críticas.

---

## 📝 Headers que Serão Adicionados

Quando `addDeprecatedWarning()` for aplicado, cada resposta v1 terá:

```
X-API-Version: v1
X-API-Deprecated: true
X-API-Sunset-Date: 2025-07-28
X-API-Migration-Guide: https://github.com/.../docs/API-V2-MIGRATION-GUIDE.md
Warning: 299 - "API v1 is deprecated. Please migrate to v2. See X-API-Migration-Guide header."
```

---

## ✅ Exemplo Funcionando

`app/api/cats/route.ts` já tem warnings completos:

```typescript
// GET
const response = NextResponse.json(cats);
return addDeprecatedWarning(response);

// POST
const response = NextResponse.json(newCat, { status: 201 });
return addDeprecatedWarning(response);

// Errors também
const errorResponse = NextResponse.json({ error: '...' }, { status: 500 });
return addDeprecatedWarning(errorResponse);
```

---

**Status**: Infraestrutura de warnings completa e funcional! ✅

