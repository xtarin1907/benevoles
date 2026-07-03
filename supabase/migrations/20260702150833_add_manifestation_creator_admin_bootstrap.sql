-- Self-serve creation (§16) needs a way to seed the very first admin row:
-- "owner admin can invite/remove admins on own manifestation" requires
-- already BEING an owner (is_manifestation_owner), which is circular for a
-- freshly created manifestation with no admins yet. Scope narrowly: only the
-- manifestation's creator, only as themselves, only as 'owner', and only
-- while no admin exists yet -- can't be used to re-seed or hijack a
-- manifestation that already has admins.
CREATE POLICY "creator can bootstrap themselves as owner admin"
  ON public.manifestation_admins FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.manifestations m
      WHERE m.id = manifestation_id AND m.created_by = (select auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.manifestation_admins ma WHERE ma.manifestation_id = manifestation_admins.manifestation_id
    )
  );
