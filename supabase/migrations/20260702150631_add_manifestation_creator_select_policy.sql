-- Without this, a self-serve creator can't see the manifestation they just
-- created (not yet published, not yet in manifestation_admins -- that insert
-- happens as a second step right after) -- breaks the INSERT ... RETURNING
-- that every Supabase client .insert().select() call relies on, since
-- Postgres RLS checks RETURNING visibility against SELECT policies too.
CREATE POLICY "creator can view their own manifestation"
  ON public.manifestations FOR SELECT TO authenticated
  USING (created_by = (select auth.uid()));
