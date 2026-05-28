# Manutenção do Banco de Dados

Este documento descreve questões de manutenção e performance do banco de dados identificadas pelo linter do Supabase.

## Tabela `net._http_response` - Bloat

### Problema Identificado

A tabela `net._http_response` no schema `net` (extensão do Postgres) apresenta excesso de bloat. Esta é uma tabela do sistema gerenciada pela extensão `pg_net` do Postgres, não uma tabela da aplicação.

### Impacto

- Consumo excessivo de espaço em disco
- Possível degradação de performance em queries relacionadas
- Aumento do tempo de backup e restore

### Solução Recomendada

#### Opção 1: VACUUM FULL (Recomendado para resolução imediata)

**⚠️ AVISO**: Executar `VACUUM FULL` causa downtime, pois bloqueia a tabela durante a operação.

```sql
VACUUM FULL net._http_response;
```

**Quando executar:**
- Durante janela de manutenção
- Quando o bloat for significativo (> 30% do tamanho da tabela)
- Após grandes operações de limpeza de dados

#### Opção 2: Ajustar Configurações de Autovacuum

Ajustar as configurações de autovacuum para esta tabela específica para evitar acúmulo futuro de bloat:

```sql
ALTER TABLE net._http_response SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);
```

**O que faz:**
- Reduz o threshold para que o autovacuum seja executado mais frequentemente
- `vacuum_scale_factor`: porcentagem de tuplas atualizadas/deletadas antes de executar VACUUM
- `analyze_scale_factor`: porcentagem de mudanças antes de executar ANALYZE

#### Opção 3: Limpeza de Dados Antigos (Se aplicável)

Se a tabela armazena logs HTTP que podem ser limpos, considerar limpar dados antigos. **Nota:** A coluna de data na tabela é `created`, não `created_at`.

```sql
-- Exemplo: deletar registros mais antigos que 30 dias
DELETE FROM net._http_response 
WHERE created < NOW() - INTERVAL '30 days';
```

**⚠️ ATENÇÃO**: Verificar se esta tabela é usada para auditoria ou debugging antes de deletar dados.

### Automação de limpeza (já configurada)

Existe um **job pg_cron** que limpa `net._http_response` e `cron.job_run_details` automaticamente:

| Item | Valor |
|------|--------|
| **Job** | `cleanup-system-tables-weekly` |
| **Schedule** | `0 3 * * 1` (toda segunda-feira às 03:00) |
| **Ativo** | Sim |
| **Função** | `public.cleanup_system_tables()` |

A função `cleanup_system_tables()`:
- Deleta de `cron.job_run_details` registros com `start_time` &gt; 7 dias.
- Deleta de `net._http_response` registros com `created` &gt; 7 dias.

A definição da função e o job foram criados diretamente no Supabase (não estão em migrations do repositório). Para inspecionar ou recriar:

```sql
-- Listar jobs de limpeza
SELECT jobid, jobname, schedule, active, command 
FROM cron.job 
WHERE command LIKE '%cleanup_system%';

-- Ver definição da função
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'cleanup_system_tables';
```

### Monitoramento

Para monitorar o bloat da tabela:

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'net' AND tablename = '_http_response';
```

### Notas Importantes

1. **Não criar migrações**: Esta tabela pertence ao schema `net`, não ao schema `public` da aplicação
2. **Coordenar com equipe**: Executar VACUUM FULL requer coordenação para evitar impacto em produção
3. **Backup antes**: Sempre fazer backup antes de operações de manutenção significativas
4. **Em Supabase**: Se estiver usando Supabase, verificar se há ferramentas de autovacuum gerenciadas pela plataforma

## Referências

- [Supabase Database Linter Documentation](https://supabase.com/docs/guides/database/database-linter)
- [PostgreSQL VACUUM Documentation](https://www.postgresql.org/docs/current/sql-vacuum.html)
- [PostgreSQL Autovacuum Tuning](https://www.postgresql.org/docs/current/runtime-config-autovacuum.html)

