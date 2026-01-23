# Implementação de Correções de Performance

## ⚠️ Limitações

As tabelas `cron`, `net` e `realtime` são gerenciadas pelo Supabase e não podem ser modificadas diretamente via migrations. As correções devem ser aplicadas via:

1. **Supabase Dashboard** → SQL Editor (para índices e VACUUM)
2. **Supabase Support** (para configurações avançadas)
3. **Ajustes no código da aplicação** (para otimizações que podemos controlar)

---

## 🔧 Correções que Podem Ser Aplicadas no Supabase Dashboard

### 1. Adicionar Índice em `cron.job_run_details`

**Executar no Supabase SQL Editor:**

```sql
-- Índice para otimizar queries de limpeza e análise
CREATE INDEX IF NOT EXISTS job_run_details_start_time_idx 
ON cron.job_run_details(start_time);

-- Atualizar estatísticas
ANALYZE cron.job_run_details;
```

**Impacto Esperado:**
- Redução de 90%+ no tempo de queries com filtro por `start_time`
- Melhoria significativa na query de limpeza automática

---

### 2. Executar VACUUM na Tabela `net._http_response`

**Executar no Supabase SQL Editor (durante janela de manutenção):**

```sql
-- VACUUM ANALYZE (sem downtime)
VACUUM ANALYZE net._http_response;

-- OU VACUUM FULL (requer downtime, mas remove bloat completamente)
-- VACUUM FULL net._http_response;
```

**Quando executar:**
- `VACUUM ANALYZE`: Sempre que possível, pode rodar em produção
- `VACUUM FULL`: Apenas durante janela de manutenção agendada

---

### 3. Verificar e Limpar Subscriptions Órfãs do Realtime

**Executar no Supabase SQL Editor:**

```sql
-- Verificar subscriptions ativas
SELECT 
    subscription_id,
    entity::text,
    created_at,
    COUNT(*) OVER (PARTITION BY subscription_id) as subscription_count
FROM realtime.subscription
ORDER BY created_at DESC
LIMIT 50;

-- Nota: Não deletar subscriptions sem entender o impacto
-- Se houver muitas subscriptions antigas, considere contatar Supabase Support
```

---

## 💻 Otimizações no Código da Aplicação

### 1. Usar Estimativas ao Invés de COUNT Exato

**Problema:** A query `SELECT COUNT(*) FROM cron.job_run_details` leva 10+ segundos.

**Solução:** Usar estimativas do planner do PostgreSQL quando possível.

**Exemplo de implementação:**

```typescript
// lib/db/monitoring.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Obtém estimativa rápida do número de registros em uma tabela
 * Usa estatísticas do planner ao invés de COUNT(*) que é muito lento
 */
export async function getTableEstimate(
  schema: string,
  tableName: string
): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ estimate: bigint }>>`
    SELECT 
      reltuples::bigint AS estimate
    FROM pg_class
    WHERE relname = ${tableName}
      AND relnamespace = (
        SELECT oid FROM pg_namespace WHERE nspname = ${schema}
      )
  `;
  
  return Number(result[0]?.estimate || 0);
}

/**
 * Obtém estatísticas detalhadas de job_run_details sem COUNT exato
 */
export async function getJobRunDetailsStats() {
  // Usar estimativa ao invés de COUNT exato
  const estimate = await getTableEstimate('cron', 'job_run_details');
  
  // Para estatísticas detalhadas, usar queries com filtros que usam índices
  const [oldest, newest, stats] = await Promise.all([
    prisma.$queryRaw<Array<{ min: Date }>>`
      SELECT MIN(start_time) as min 
      FROM cron.job_run_details
    `,
    prisma.$queryRaw<Array<{ max: Date }>>`
      SELECT MAX(start_time) as max 
      FROM cron.job_run_details
    `,
    prisma.$queryRaw<Array<{
      older_than_7_days: bigint;
      older_than_30_days: bigint;
    }>>`
      SELECT 
        COUNT(*) FILTER (WHERE start_time < NOW() - INTERVAL '7 days') as older_than_7_days,
        COUNT(*) FILTER (WHERE start_time < NOW() - INTERVAL '30 days') as older_than_30_days
      FROM cron.job_run_details
      WHERE start_time < NOW() - INTERVAL '7 days'
    `
  ]);
  
  return {
    estimate,
    oldest: oldest[0]?.min,
    newest: newest[0]?.max,
    ...stats[0]
  };
}
```

---

### 2. Otimizar Limpeza de `cron.job_run_details`

**Problema:** DELETE completo sem WHERE bloqueia a tabela.

**Solução:** Sempre usar filtros de data e considerar processamento em lotes.

**Implementação recomendada:**

```typescript
// scripts/cleanup-job-details.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Limpa registros antigos de job_run_details em lotes
 * Processa em batches para evitar bloqueios longos
 */
export async function cleanupJobRunDetails(
  daysToKeep: number = 7,
  batchSize: number = 1000
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  let totalDeleted = 0;
  let deletedInBatch: number;
  
  do {
    // Usar transação para garantir atomicidade
    const result = await prisma.$executeRaw`
      DELETE FROM cron.job_run_details
      WHERE start_time < ${cutoffDate}
        AND runid IN (
          SELECT runid 
          FROM cron.job_run_details
          WHERE start_time < ${cutoffDate}
          ORDER BY runid
          LIMIT ${batchSize}
        )
    `;
    
    deletedInBatch = result;
    totalDeleted += deletedInBatch;
    
    // Pequeno delay entre batches para reduzir contenção
    if (deletedInBatch > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } while (deletedInBatch === batchSize);
  
  console.log(`Limpeza concluída: ${totalDeleted} registros removidos`);
  return totalDeleted;
}

// Executar se chamado diretamente
if (require.main === module) {
  cleanupJobRunDetails()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erro na limpeza:', error);
      process.exit(1);
    });
}
```

**Adicionar ao package.json:**

```json
{
  "scripts": {
    "cleanup:job-details": "ts-node scripts/cleanup-job-details.ts"
  }
}
```

---

### 3. Monitorar Performance do Realtime

**Problema:** `realtime.list_changes` tem picos de 3+ segundos.

**Solução:** Implementar monitoramento e alertas para detectar degradação.

**Implementação:**

```typescript
// lib/monitoring/realtime-monitor.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RealtimeMetrics {
  subscriptionCount: number;
  activeConnections: number;
  avgResponseTime: number;
  maxResponseTime: number;
}

/**
 * Monitora métricas do Realtime
 * Deve ser chamado periodicamente (ex: a cada 5 minutos)
 */
export async function monitorRealtime(): Promise<RealtimeMetrics> {
  const startTime = Date.now();
  
  try {
    // Verificar número de subscriptions (pode ser lento, então usar timeout)
    const { data: subscriptions, error } = await Promise.race([
      supabase
        .from('realtime.subscription')
        .select('id', { count: 'exact', head: true }),
      new Promise<{ error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]) as any;
    
    if (error) {
      console.error('Erro ao monitorar Realtime:', error);
      throw error;
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      subscriptionCount: subscriptions?.count || 0,
      activeConnections: 0, // Requer acesso ao pg_stat_activity
      avgResponseTime: responseTime,
      maxResponseTime: responseTime
    };
  } catch (error) {
    console.error('Erro no monitoramento do Realtime:', error);
    throw error;
  }
}

/**
 * Verifica se há bloqueios no Realtime
 */
export async function checkRealtimeLocks() {
  // Esta query requer acesso ao pg_locks, pode não funcionar sem permissões adequadas
  const { data, error } = await supabase.rpc('check_realtime_locks');
  
  if (error) {
    console.warn('Não foi possível verificar locks do Realtime:', error);
    return null;
  }
  
  return data;
}
```

---

## 📋 Checklist de Implementação

### Imediato (Hoje)
- [ ] Executar `CREATE INDEX` no Supabase SQL Editor para `cron.job_run_details`
- [ ] Executar `VACUUM ANALYZE net._http_response` no Supabase SQL Editor
- [ ] Verificar subscriptions órfãs do Realtime

### Esta Semana
- [ ] Implementar função `getTableEstimate()` para evitar COUNT exato
- [ ] Criar script de limpeza em lotes para `job_run_details`
- [ ] Configurar job automático de limpeza (via cron ou Netlify Scheduled Functions)

### Próximas 2 Semanas
- [ ] Implementar monitoramento do Realtime
- [ ] Adicionar alertas para degradação de performance
- [ ] Revisar e otimizar uso do Realtime na aplicação

---

## 🔍 Queries de Monitoramento Pós-Implementação

### Verificar Uso dos Índices

```sql
-- Verificar se o índice está sendo usado
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'cron'
  AND tablename = 'job_run_details'
ORDER BY idx_scan DESC;
```

### Monitorar Bloat da Tabela

```sql
-- Verificar bloat após VACUUM
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    n_dead_tup,
    n_live_tup,
    CASE 
      WHEN n_live_tup > 0 
      THEN ROUND(100.0 * n_dead_tup / n_live_tup, 2) 
      ELSE 0 
    END AS dead_tuple_percent
FROM pg_stat_user_tables
WHERE schemaname IN ('net', 'cron')
ORDER BY dead_tuple_percent DESC;
```

---

## 📞 Contato com Supabase Support

Se os problemas persistirem após implementar estas correções, considere contatar o Supabase Support com:

1. **Detalhes do problema:** Queries lentas identificadas
2. **Estatísticas:** Métricas de performance dos logs
3. **Tentativas de correção:** O que já foi tentado
4. **Solicitações específicas:**
   - Ajustes de configuração do Realtime
   - Otimizações de índices em tabelas do sistema
   - Revisão de configurações de autovacuum

---

## 📚 Referências

- [PostgreSQL Indexing Best Practices](https://www.postgresql.org/docs/current/indexes-types.html)
- [Supabase Performance Optimization](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL VACUUM Documentation](https://www.postgresql.org/docs/current/sql-vacuum.html)
