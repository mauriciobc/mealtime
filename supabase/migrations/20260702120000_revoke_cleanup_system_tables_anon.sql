-- Revoke execute on cleanup_system_tables from anon/authenticated (TD-009)
REVOKE ALL ON FUNCTION public.cleanup_system_tables() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_system_tables() FROM authenticated;
