-- The inline NOT EXISTS subquery on manifestation_admins inside its own
-- INSERT policy re-triggers RLS on manifestation_admins for that subquery,
-- causing "infinite recursion detected in policy". Fix: move the check into
-- a SECURITY DEFINER function (same pattern as is_manifestation_admin/
-- is_manifestation_owner), which runs as the function owner and bypasses
-- RLS on the table it reads, exactly like those two already do.
DROP POLICY "creator can bootstrap themselves as owner admin" ON public.manifestation_admins;

CREATE OR REPLACE FUNCTION private.can_bootstrap_manifestation_admin(_user_id UUID, _manifestation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.manifestations m
    WHERE m.id = _manifestation_id AND m.created_by = _user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.manifestation_admins ma WHERE ma.manifestation_id = _manifestation_id
  );
$$;

REVOKE EXECUTE ON FUNCTION private.can_bootstrap_manifestation_admin(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_bootstrap_manifestation_admin(UUID, UUID) TO authenticated;

CREATE POLICY "creator can bootstrap themselves as owner admin"
  ON public.manifestation_admins FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND role = 'owner'
    AND private.can_bootstrap_manifestation_admin((select auth.uid()), manifestation_id)
  );
