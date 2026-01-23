-- RemoveUnusedIndexes
-- Remove índices não utilizados identificados pelo linter do Supabase para melhorar performance

-- Remover índices não utilizados de feeding_logs
DROP INDEX IF EXISTS "public"."feeding_logs_cat_id_fed_at_idx";

-- Remover índices não utilizados de household_members
DROP INDEX IF EXISTS "public"."household_members_household_id_idx";
DROP INDEX IF EXISTS "public"."household_members_role_idx";

-- Remover índices não utilizados de cats
DROP INDEX IF EXISTS "public"."cats_created_at_idx";
DROP INDEX IF EXISTS "public"."cats_name_idx";
DROP INDEX IF EXISTS "public"."cats_updated_at_idx";
DROP INDEX IF EXISTS "public"."cats_weight_idx";

-- Remover índices não utilizados de households
DROP INDEX IF EXISTS "public"."households_created_at_idx";

-- Remover índices não utilizados de profiles
DROP INDEX IF EXISTS "public"."profiles_username_idx";

-- Remover índices não utilizados de schedules
DROP INDEX IF EXISTS "public"."schedules_enabled_idx";

-- Remover índices não utilizados de cat_weight_logs
DROP INDEX IF EXISTS "public"."cat_weight_logs_cat_id_idx";

-- Remover índices não utilizados de weight_goals
DROP INDEX IF EXISTS "public"."weight_goals_cat_id_idx";
DROP INDEX IF EXISTS "public"."weight_goals_target_date_idx";
DROP INDEX IF EXISTS "public"."weight_goals_status_idx";

-- Remover índices não utilizados de weight_goal_milestones
DROP INDEX IF EXISTS "public"."weight_goal_milestones_goal_id_idx";
DROP INDEX IF EXISTS "public"."weight_goal_milestones_date_idx";

-- Remover índices não utilizados de notifications
DROP INDEX IF EXISTS "public"."notifications_user_id_type_created_at_idx";

