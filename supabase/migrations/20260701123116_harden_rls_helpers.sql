-- Bénévoles+ — Phase 1 hardening pass
-- Fixes two WARN-level findings from get_advisors(security/performance)
-- after the initial_schema migration:
--
-- 1. anon/authenticated_security_definer_function_executable: has_role,
--    is_administrator, is_manifestation_admin, is_manifestation_owner were
--    reachable as public PostgREST RPC endpoints (/rest/v1/rpc/<fn>) since
--    they lived in the `public` schema, which PostgREST exposes by
--    default. Fix: relocate them to a `private` schema, which is NOT in
--    PostgREST's exposed schema list. This is transparent to existing
--    policies -- Postgres tracks function references by OID, not by
--    schema-qualified text, so ALTER FUNCTION ... SET SCHEMA does not
--    break any policy that already calls them.
--
-- 2. auth_rls_initplan: every policy below called auth.uid() directly,
--    which Postgres/PostgREST's planner re-evaluates per row instead of
--    once per query. Fix: wrap as (select auth.uid()) so the planner can
--    treat it as an InitPlan. This requires recreating every policy that
--    references auth.uid() (this migration also re-points them at the
--    newly-relocated private.* functions).

-- =========================================================================
-- 1. Relocate RLS helper functions to a non-exposed schema
-- =========================================================================

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_administrator(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_manifestation_admin(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_manifestation_owner(uuid, uuid) SET SCHEMA private;

-- handle_new_user() is intentionally left in `public`: it is a trigger
-- function, and Postgres refuses to execute trigger functions outside of
-- a trigger context ("trigger functions can only be called as triggers"),
-- so the RPC-exposure warning for it is a false positive -- moving it
-- would add nothing.

-- =========================================================================
-- 2. Recreate every policy with (select auth.uid()) + private.* functions
-- =========================================================================

-- --- profiles ---

DROP POLICY "users can view their own profile" ON public.profiles;
CREATE POLICY "users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY "users can update their own profile" ON public.profiles;
CREATE POLICY "users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY "users can insert their own profile" ON public.profiles;
CREATE POLICY "users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY "super_admin can view all profiles" ON public.profiles;
CREATE POLICY "super_admin can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (private.is_administrator((select auth.uid())));

DROP POLICY "super_admin can update all profiles" ON public.profiles;
CREATE POLICY "super_admin can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (private.is_administrator((select auth.uid())));

DROP POLICY "manifestation admins view engaged volunteer profiles" ON public.profiles;
CREATE POLICY "manifestation admins view engaged volunteer profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manifestation_engagements me
      WHERE me.volunteer_id = profiles.id
        AND private.is_manifestation_admin((select auth.uid()), me.manifestation_id)
    )
  );

-- --- manifestations ---
-- ("public can view published manifestations" has no auth.uid() call -- untouched)

DROP POLICY "manifestation admins can view their own manifestation" ON public.manifestations;
CREATE POLICY "manifestation admins can view their own manifestation"
  ON public.manifestations FOR SELECT TO authenticated
  USING (private.is_manifestation_admin((select auth.uid()), id));

DROP POLICY "manifestation admins can update their own manifestation" ON public.manifestations;
CREATE POLICY "manifestation admins can update their own manifestation"
  ON public.manifestations FOR UPDATE TO authenticated
  USING (private.is_manifestation_admin((select auth.uid()), id))
  WITH CHECK (private.is_manifestation_admin((select auth.uid()), id));

DROP POLICY "super_admin can manage all manifestations" ON public.manifestations;
CREATE POLICY "super_admin can manage all manifestations"
  ON public.manifestations FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

-- --- manifestation_admins ---

DROP POLICY "admins can view their manifestation's admin list" ON public.manifestation_admins;
CREATE POLICY "admins can view their manifestation's admin list"
  ON public.manifestation_admins FOR SELECT TO authenticated
  USING (private.is_manifestation_admin((select auth.uid()), manifestation_id));

DROP POLICY "super_admin can manage manifestation_admins" ON public.manifestation_admins;
CREATE POLICY "super_admin can manage manifestation_admins"
  ON public.manifestation_admins FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

DROP POLICY "owner admin can invite/remove admins on own manifestation" ON public.manifestation_admins;
CREATE POLICY "owner admin can invite/remove admins on own manifestation"
  ON public.manifestation_admins FOR ALL TO authenticated
  USING (private.is_manifestation_owner((select auth.uid()), manifestation_id))
  WITH CHECK (private.is_manifestation_owner((select auth.uid()), manifestation_id));

-- --- secteurs ---
-- ("public can view secteurs of published manifestations" has no auth.uid() -- untouched)

DROP POLICY "manifestation admins manage their secteurs" ON public.secteurs;
CREATE POLICY "manifestation admins manage their secteurs"
  ON public.secteurs FOR ALL TO authenticated
  USING (private.is_manifestation_admin((select auth.uid()), manifestation_id))
  WITH CHECK (private.is_manifestation_admin((select auth.uid()), manifestation_id));

DROP POLICY "super_admin manages all secteurs" ON public.secteurs;
CREATE POLICY "super_admin manages all secteurs"
  ON public.secteurs FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

-- --- shifts ---
-- ("public can view shifts of published manifestations" has no auth.uid() -- untouched)

DROP POLICY "manifestation admins manage their shifts" ON public.shifts;
CREATE POLICY "manifestation admins manage their shifts"
  ON public.shifts FOR ALL TO authenticated
  USING (private.is_manifestation_admin((select auth.uid()), manifestation_id))
  WITH CHECK (private.is_manifestation_admin((select auth.uid()), manifestation_id));

DROP POLICY "super_admin manages all shifts" ON public.shifts;
CREATE POLICY "super_admin manages all shifts"
  ON public.shifts FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

-- --- manifestation_engagements ---

DROP POLICY "volunteers manage their own engagements" ON public.manifestation_engagements;
CREATE POLICY "volunteers manage their own engagements"
  ON public.manifestation_engagements FOR ALL TO authenticated
  USING ((select auth.uid()) = volunteer_id)
  WITH CHECK ((select auth.uid()) = volunteer_id);

DROP POLICY "manifestation admins view engagements on their manifestation" ON public.manifestation_engagements;
CREATE POLICY "manifestation admins view engagements on their manifestation"
  ON public.manifestation_engagements FOR SELECT TO authenticated
  USING (private.is_manifestation_admin((select auth.uid()), manifestation_id));

DROP POLICY "super_admin manages all engagements" ON public.manifestation_engagements;
CREATE POLICY "super_admin manages all engagements"
  ON public.manifestation_engagements FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

-- --- shift_signups ---

DROP POLICY "volunteers manage their own signups" ON public.shift_signups;
CREATE POLICY "volunteers manage their own signups"
  ON public.shift_signups FOR ALL TO authenticated
  USING ((select auth.uid()) = volunteer_id)
  WITH CHECK ((select auth.uid()) = volunteer_id);

DROP POLICY "manifestation admins manage signups on their shifts" ON public.shift_signups;
CREATE POLICY "manifestation admins manage signups on their shifts"
  ON public.shift_signups FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_signups.shift_id
        AND private.is_manifestation_admin((select auth.uid()), s.manifestation_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_signups.shift_id
        AND private.is_manifestation_admin((select auth.uid()), s.manifestation_id)
    )
  );

DROP POLICY "super_admin manages all signups" ON public.shift_signups;
CREATE POLICY "super_admin manages all signups"
  ON public.shift_signups FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

-- --- points_ledger ---

DROP POLICY "volunteers view their own points" ON public.points_ledger;
CREATE POLICY "volunteers view their own points"
  ON public.points_ledger FOR SELECT TO authenticated
  USING ((select auth.uid()) = volunteer_id);

DROP POLICY "manifestation admins insert shift_completed points for their manifestation" ON public.points_ledger;
CREATE POLICY "manifestation admins insert shift_completed points for their manifestation"
  ON public.points_ledger FOR INSERT TO authenticated
  WITH CHECK (
    event_type = 'shift_completed'
    AND manifestation_id IS NOT NULL
    AND private.is_manifestation_admin((select auth.uid()), manifestation_id)
  );

DROP POLICY "manifestation admins view points for their manifestation" ON public.points_ledger;
CREATE POLICY "manifestation admins view points for their manifestation"
  ON public.points_ledger FOR SELECT TO authenticated
  USING (
    manifestation_id IS NOT NULL
    AND private.is_manifestation_admin((select auth.uid()), manifestation_id)
  );

DROP POLICY "super_admin manages all points" ON public.points_ledger;
CREATE POLICY "super_admin manages all points"
  ON public.points_ledger FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

-- --- newsletter_sends ---

DROP POLICY "manifestation admins can send platform or own-manifestation newsletters" ON public.newsletter_sends;
CREATE POLICY "manifestation admins can send platform or own-manifestation newsletters"
  ON public.newsletter_sends FOR INSERT TO authenticated
  WITH CHECK (
    sent_by = (select auth.uid())
    AND (
      (audience_scope = 'all_platform'
        AND EXISTS (SELECT 1 FROM public.manifestation_admins ma WHERE ma.user_id = (select auth.uid())))
      OR
      (audience_scope = 'manifestation_engaged'
        AND manifestation_id IS NOT NULL
        AND private.is_manifestation_admin((select auth.uid()), manifestation_id))
    )
  );

DROP POLICY "manifestation admins view sends relevant to them" ON public.newsletter_sends;
CREATE POLICY "manifestation admins view sends relevant to them"
  ON public.newsletter_sends FOR SELECT TO authenticated
  USING (
    sent_by = (select auth.uid())
    OR (manifestation_id IS NOT NULL AND private.is_manifestation_admin((select auth.uid()), manifestation_id))
  );

DROP POLICY "super_admin manages all newsletter_sends" ON public.newsletter_sends;
CREATE POLICY "super_admin manages all newsletter_sends"
  ON public.newsletter_sends FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

-- --- platform_settings ---
-- ("anyone can read platform settings" has no auth.uid() -- untouched)

DROP POLICY "only super_admin can update platform settings" ON public.platform_settings;
CREATE POLICY "only super_admin can update platform settings"
  ON public.platform_settings FOR UPDATE TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));
