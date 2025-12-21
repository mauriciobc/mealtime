# Análise de Performance de Queries - Supabase

**Data da Análise:** 03/11/2025  
**Período dos Logs:** Últimas 24 horas

## 📊 Resumo Executivo

Foram identificados **3 problemas críticos** que consomem **85.8%** do tempo total de execução do banco:

1. **DELETE FROM net._http_response** - 44.5% do tempo total
2. **realtime.list_changes** - 41.3% do tempo total  
3. **net.http_post** - 8.3% do tempo total

---

## 🔴 Problema #1: DELETE FROM net._http_response (CRÍTICO)

### Estatísticas
- **Calls:** 13.7 milhões
- **Tempo Total:** 8.975.009 segundos (44.5% do sistema)
- **Mean Time:** 0.65ms
- **Max Time:** 92.09ms
- **Cache Hit Rate:** 99.99%

### Query Problemática
```sql
WITH rows AS (
  SELECT ctid
  FROM net._http_response
  WHERE created < now() - $1
  ORDER BY created
  LIMIT $2
)
DELETE FROM net._http_response r
USING rows WHERE r.ctid = rows.ctid
```

### Análise
- ✅ **Positivo:** Índice em `created` existe (`_http_response_created_idx`)
- ❌ **Problema:** Tabela com **excessive bloat** (detectado pelo advisor)
- ❌ **Problema:** Volume extremamente alto de execuções (13.7M)
- ⚠️ **Risco:** Bloat causa I/O excessivo e desperdício de espaço

### Soluções Recomendadas

#### 1. Adicionar Índice Composto (Imediato)
```sql
-- Criar índice para otimizar a query de DELETE
CREATE INDEX IF NOT EXISTS _http_response_created_id_idx 
ON net._http_response(created, id);
```

#### 2. Executar VACUUM FULL (Manutenção)
```sql
-- Executar durante janela de manutenção
VACUUM FULL net._http_response;
```

#### 3. Otimizar Frequência de Limpeza
- Reduzir frequência das execuções de DELETE
- Aumentar o LIMIT por execução para processar mais registros de uma vez
- Considerar limpeza em lote em horários de baixo tráfego

#### 4. Implementar Particionamento (Longo Prazo)
```sql
-- Particionar por data para facilitar limpeza
-- Esta é uma mudança arquitetural maior que deve ser planejada
```

---

## 🔴 Problema #2: realtime.list_changes (CRÍTICO)

### Estatísticas
- **Calls:** 1.78 milhões
- **Tempo Total:** 8.335.770 segundos (41.3% do sistema)
- **Mean Time:** 4.68ms
- **Max Time:** 3.241 segundos ⚠️ **EXTREMAMENTE ALTO**
- **Cache Hit Rate:** 99.99%

### Query Problemática
```sql
select * from realtime.list_changes($1, $2, $3, $4)
```

### Análise
- ❌ **Problema Crítico:** Max time de **3.241 segundos** indica bloqueios ou contenção
- ⚠️ **Risco:** Queries muito lentas podem causar timeouts e degradação do Realtime

### Soluções Recomendadas

#### 1. Investigar Bloqueios
```sql
-- Verificar locks ativos na tabela realtime.subscription
SELECT 
    locktype, 
    relation::regclass,
    mode,
    granted,
    pid,
    query
FROM pg_locks
WHERE relation::regclass::text LIKE 'realtime.%';
```

#### 2. Analisar Estatísticas do Realtime
- Revisar número de subscriptions ativas
- Verificar se há subscriptions órfãs ou não utilizadas
- Considerar implementar timeouts para subscriptions inativas

#### 3. Otimizar Configurações do Realtime
- Revisar configurações de `wal_level` e `max_replication_slots`
- Ajustar `realtime.max_changes_per_message` se aplicável
- Monitorar uso de memória do Realtime

---

## 🟡 Problema #3: net.http_post (MÉDIO)

### Estatísticas
- **Calls:** 481.191
- **Tempo Total:** 1.671.549 segundos (8.3% do sistema)
- **Mean Time:** 3.47ms
- **Max Time:** 115.09ms
- **Cache Hit Rate:** 100%

### Análise
- ✅ **Positivo:** Cache hit rate perfeita
- ⚠️ **Observação:** Max time de 115ms pode indicar timeouts de rede externa
- ℹ️ **Contexto:** Esta query faz chamadas HTTP externas, então latência é esperada

### Soluções Recomendadas
- Monitorar timeouts e ajustar `timeout_milliseconds` conforme necessário
- Considerar implementar retry logic com backoff exponencial
- Revisar se todas as chamadas HTTP são necessárias

---

## 🟡 Problema #4: cron.job_run_details (MÉDIO)

### Estatísticas da Tabela
- **Total de Registros:** 20.167
- **Registros > 7 dias:** 20
- **Registros > 30 dias:** 0

### Queries Problemáticas

#### 4.1: SELECT COUNT(*) (10.2 segundos!)
```sql
select (select count(*) from cron.job_run_details), $1 as is_estimate
```
- **Problema:** COUNT(*) em tabela sem índice adequado é muito lento
- **Solução:** Usar estimativa do planner ao invés de COUNT exato

#### 4.2: DELETE sem WHERE (13.7 segundos)
```sql
DELETE FROM cron.job_run_details
```
- **Problema:** DELETE completo sem WHERE causa bloqueio da tabela
- **Solução:** Sempre usar WHERE com filtro de data

### Soluções Recomendadas

#### 1. Adicionar Índice em start_time
```sql
CREATE INDEX IF NOT EXISTS job_run_details_start_time_idx 
ON cron.job_run_details(start_time);
```

#### 2. Usar Estimativas ao Invés de COUNT Exato
```sql
-- Ao invés de:
SELECT COUNT(*) FROM cron.job_run_details;

-- Usar:
SELECT 
    reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'job_run_details';
```

#### 3. Melhorar Limpeza Automática
A query de limpeza já existe e está funcionando, mas pode ser otimizada:
```sql
-- Query atual (já existe)
DELETE FROM cron.job_run_details
WHERE start_time < NOW() - INTERVAL '7 days';

-- Otimização: Usar DELETE em lotes
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    LOOP
        DELETE FROM cron.job_run_details
        WHERE start_time < NOW() - INTERVAL '7 days'
        LIMIT 1000;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        EXIT WHEN deleted_count = 0;
        
        COMMIT;
    END LOOP;
END $$;
```

#### 4. Criar Job de Limpeza Automática
```sql
-- Criar job para limpar automaticamente (se ainda não existir)
SELECT cron.schedule(
    'cleanup-job-run-details',
    '0 2 * * *', -- Diariamente às 2h
    $$
    DELETE FROM cron.job_run_details
    WHERE start_time < NOW() - INTERVAL '7 days';
    $$
);
```

---

## 📋 Outras Observações

### LOCK TABLE em realtime.schema_migrations
- **Mean Time:** 763ms
- **Max Time:** 4.7 segundos
- **Análise:** Locks são esperados durante migrações, mas duração alta indica contenção

### Queries do pg_catalog (Metadados)
- **SELECT FROM pg_timezone_names:** 215ms (cache hit: 0%)
- **Análise:** Primeira execução após restart do banco, normal

---

## ✅ Plano de Ação Prioritizado

### Imediato (Esta Semana)
1. ✅ Adicionar índice em `cron.job_run_details(start_time)`
2. ✅ Executar `VACUUM ANALYZE net._http_response` (não precisa de downtime)
3. ✅ Investigar bloqueios no Realtime

### Curto Prazo (Próximas 2 Semanas)
1. ⚙️ Otimizar frequência de limpeza de `net._http_response`
2. ⚙️ Implementar estimativas ao invés de COUNT exato em `job_run_details`
3. ⚙️ Criar job automático de limpeza se não existir

### Longo Prazo (Próximo Mês)
1. 📅 Avaliar particionamento de `net._http_response`
2. 📅 Revisar arquitetura do Realtime para reduzir contenção
3. 📅 Implementar monitoramento contínuo de performance

---

## 📈 Métricas de Sucesso

Após implementar as correções, esperamos:
- ✅ Redução de 30-50% no tempo total de `net._http_response` DELETE
- ✅ Redução de picos extremos em `realtime.list_changes` (max time < 100ms)
- ✅ Redução de 90%+ no tempo de COUNT em `job_run_details`

---

## 🔍 Queries de Monitoramento

### Verificar Progresso do VACUUM
```sql
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname IN ('net', 'cron')
ORDER BY n_dead_tup DESC;
```

### Monitorar Tamanho das Tabelas
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname IN ('net', 'cron', 'realtime')
ORDER BY size_bytes DESC;
```

### Verificar Bloqueios Ativos
```sql
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocking_locks.pid AS blocking_pid,
    blocked_activity.usename AS blocked_user,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```
