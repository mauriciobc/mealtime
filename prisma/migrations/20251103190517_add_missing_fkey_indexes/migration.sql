-- AddMissingFkeyIndexes
-- Adiciona índices nas foreign keys que estão faltando para melhorar performance

-- Adicionar índice para cat_weight_logs.measured_by
CREATE INDEX IF NOT EXISTS "cat_weight_logs_measured_by_idx" ON "public"."cat_weight_logs"("measured_by");

-- Adicionar índice para weight_goals.created_by
CREATE INDEX IF NOT EXISTS "weight_goals_created_by_idx" ON "public"."weight_goals"("created_by");

