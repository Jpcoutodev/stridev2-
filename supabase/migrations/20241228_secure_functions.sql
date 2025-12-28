-- Security Improvements: Set fixed search_path for functions
-- Addresses Supabase Security Warning: Function Search Path Mutable

-- 1. update_updated_at_column (Trigger function)
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 2. get_user_stats (RPC)
ALTER FUNCTION public.get_user_stats(uuid) SET search_path = public;

-- 3. increment_clap_count (RPC)
ALTER FUNCTION public.increment_clap_count(uuid) SET search_path = public;

-- 4. decrement_clap_count (RPC)
ALTER FUNCTION public.decrement_clap_count(uuid) SET search_path = public;
