-- Bénévoles+ — Phase 7: newsletter consent (CLAUDE.md non-négociable:
-- opt-in explicite, pas de consentement implicite).
--
-- newsletter_consent lives on `profiles`, not per-manifestation: it's a
-- platform-wide preference, consistent with "un compte bénévole unique".
-- newsletter_consent_at is an audit timestamp, set only by a trigger
-- (never directly writable by the user) so it can't be backdated/faked.

ALTER TABLE public.profiles ADD COLUMN newsletter_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN newsletter_consent_at TIMESTAMPTZ;

-- handle_new_user() now also reads the signup form's consent checkbox
-- (passed through supabase.auth.signUp({ options: { data: { ... } } })).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _consent BOOLEAN := COALESCE((NEW.raw_user_meta_data ->> 'newsletter_consent')::boolean, false);
BEGIN
  INSERT INTO public.profiles (id, email, full_name, newsletter_consent, newsletter_consent_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    _consent,
    CASE WHEN _consent THEN now() ELSE NULL END
  );
  RETURN NEW;
END;
$$;

-- Auto-stamps newsletter_consent_at whenever newsletter_consent changes
-- (covers both signup and a later opt-in/opt-out from /dashboard) --
-- BEFORE-trigger field assignment isn't gated by column GRANTs, so this
-- works even though `authenticated` is never granted UPDATE on
-- newsletter_consent_at directly (see below).
CREATE OR REPLACE FUNCTION public.set_newsletter_consent_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.newsletter_consent IS DISTINCT FROM OLD.newsletter_consent THEN
    NEW.newsletter_consent_at := CASE WHEN NEW.newsletter_consent THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profiles_newsletter_consent_change
  BEFORE UPDATE OF newsletter_consent ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_newsletter_consent_at();

-- Lets a volunteer opt in/out later from /dashboard (additive to the
-- existing column-level grant from initial_schema.sql).
GRANT UPDATE (newsletter_consent) ON public.profiles TO authenticated;

-- Locked decision (roadmap.md Décision #2, already accepted): any
-- manifestation_admin can trigger an 'all_platform' newsletter, not just
-- super_admin -- building that recipient list requires reading consent
-- across all profiles, which no existing SELECT policy allows for a
-- non-super-admin. This is a direct, already-accepted consequence of
-- Décision #2, not a new risk category.
CREATE POLICY "manifestation admins can view all profiles for platform newsletters"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.manifestation_admins ma WHERE ma.user_id = (select auth.uid()))
  );
