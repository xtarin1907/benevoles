-- Bénévoles+ — fix a bug the RLS isolation test caught on first real run.
--
-- harden_rls_helpers moved has_role/is_administrator/is_manifestation_admin/
-- is_manifestation_owner from `public` to `private`, but is_administrator's
-- body still contained the literal text "public.has_role(...)" -- ALTER
-- FUNCTION ... SET SCHEMA relocates the function itself, it does NOT
-- rewrite schema-qualified references inside OTHER functions' source text.
-- Since has_role no longer exists at `public.has_role`, every policy that
-- calls is_administrator() started failing with:
--   "function public.has_role(uuid, unknown) does not exist"
--
-- Fix: redefine is_administrator to call private.has_role.

CREATE OR REPLACE FUNCTION private.is_administrator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role(_user_id, 'super_admin')
$$;
