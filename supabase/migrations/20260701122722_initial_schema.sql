-- Bénévoles+ — Phase 1 initial schema
-- Enums, tables, RLS policies, GRANTs, platform_settings seed.
-- See doc/data-model.md and doc/architecture.md for the design rationale.
--
-- Ordering note: tables referenced by SECURITY DEFINER helper functions
-- (manifestations, manifestation_admins) must be created BEFORE those
-- functions -- Postgres validates LANGUAGE SQL function bodies against
-- existing relations at CREATE FUNCTION time, so a forward reference
-- fails with "relation does not exist" even though the function isn't
-- called yet.

-- =========================================================================
-- ENUMS
-- =========================================================================

CREATE TYPE public.app_role AS ENUM ('super_admin', 'user');
CREATE TYPE public.manifestation_admin_role AS ENUM ('owner', 'admin');
CREATE TYPE public.shift_signup_mode AS ENUM ('auto_confirm', 'admin_approval');
CREATE TYPE public.engagement_status AS ENUM ('interested', 'active', 'withdrawn');
CREATE TYPE public.shift_signup_status AS ENUM ('applied', 'confirmed', 'declined', 'completed', 'no_show');
CREATE TYPE public.points_event_type AS ENUM ('signup', 'shift_completed', 'manual_adjustment');
CREATE TYPE public.newsletter_audience_scope AS ENUM ('all_platform', 'manifestation_engaged');

-- =========================================================================
-- profiles (extends auth.users)
-- =========================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  platform_role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.profiles TO authenticated;
-- Column-level GRANT: authenticated users may only ever update these three
-- columns on their own row. platform_role is deliberately excluded here
-- (not just gated by a WITH CHECK) so no UPDATE statement referencing it
-- can succeed for a non-super_admin, regardless of RLS policy wording.
GRANT UPDATE (full_name, phone, avatar_url) ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
-- no anon grant: profiles are never publicly readable

-- =========================================================================
-- manifestations
-- =========================================================================

CREATE TABLE public.manifestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  color_hex TEXT NOT NULL DEFAULT '#6366f1',
  start_date DATE,
  end_date DATE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  shift_signup_mode public.shift_signup_mode NOT NULL DEFAULT 'auto_confirm',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.manifestations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.manifestations TO anon;               -- public landing page
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manifestations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manifestations TO service_role;

-- =========================================================================
-- manifestation_admins (join table, drives RLS scoping)
-- =========================================================================

CREATE TABLE public.manifestation_admins (
  manifestation_id UUID NOT NULL REFERENCES public.manifestations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.manifestation_admin_role NOT NULL DEFAULT 'admin',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (manifestation_id, user_id)
);

ALTER TABLE public.manifestation_admins ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manifestation_admins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manifestation_admins TO service_role;
-- no anon grant: internal admin-management table

-- =========================================================================
-- RLS helper functions (SECURITY DEFINER, pattern from Economat FDV)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND platform_role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_administrator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- Scoped ownership check, analogous to is_org_member(user_id, org_id) used
-- in sibling projects — NOT a global role, one row of manifestation_admins.
CREATE OR REPLACE FUNCTION public.is_manifestation_admin(_user_id UUID, _manifestation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.manifestation_admins
    WHERE user_id = _user_id AND manifestation_id = _manifestation_id
  )
$$;

-- Stricter variant: must hold the 'owner' role on that manifestation, not
-- just any admin role. SECURITY DEFINER here is load-bearing, not just
-- convention: a policy on manifestation_admins that subqueried
-- manifestation_admins directly (instead of going through this function)
-- would trigger "infinite recursion detected in policy" in Postgres,
-- since the subquery would itself be subject to RLS on the same table.
-- Routing through a SECURITY DEFINER function avoids that recursion
-- (the function runs as its owner, which is exempt from RLS).
CREATE OR REPLACE FUNCTION public.is_manifestation_owner(_user_id UUID, _manifestation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.manifestation_admins
    WHERE user_id = _user_id AND manifestation_id = _manifestation_id AND role = 'owner'
  )
$$;

-- =========================================================================
-- profiles policies (now that has_role/is_administrator exist)
-- =========================================================================

CREATE POLICY "users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "super_admin can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_administrator(auth.uid()));

CREATE POLICY "super_admin can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_administrator(auth.uid()));

-- =========================================================================
-- manifestations policies
-- =========================================================================

CREATE POLICY "public can view published manifestations"
  ON public.manifestations FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "manifestation admins can view their own manifestation"
  ON public.manifestations FOR SELECT TO authenticated
  USING (public.is_manifestation_admin(auth.uid(), id));

CREATE POLICY "manifestation admins can update their own manifestation"
  ON public.manifestations FOR UPDATE TO authenticated
  USING (public.is_manifestation_admin(auth.uid(), id))
  WITH CHECK (public.is_manifestation_admin(auth.uid(), id));

CREATE POLICY "super_admin can manage all manifestations"
  ON public.manifestations FOR ALL TO authenticated
  USING (public.is_administrator(auth.uid()))
  WITH CHECK (public.is_administrator(auth.uid()));

-- =========================================================================
-- manifestation_admins policies
-- =========================================================================

CREATE POLICY "admins can view their manifestation's admin list"
  ON public.manifestation_admins FOR SELECT TO authenticated
  USING (public.is_manifestation_admin(auth.uid(), manifestation_id));

CREATE POLICY "super_admin can manage manifestation_admins"
  ON public.manifestation_admins FOR ALL TO authenticated
  USING (public.is_administrator(auth.uid()))
  WITH CHECK (public.is_administrator(auth.uid()));

CREATE POLICY "owner admin can invite/remove admins on own manifestation"
  ON public.manifestation_admins FOR ALL TO authenticated
  USING (public.is_manifestation_owner(auth.uid(), manifestation_id))
  WITH CHECK (public.is_manifestation_owner(auth.uid(), manifestation_id));

-- =========================================================================
-- secteurs
-- =========================================================================

CREATE TABLE public.secteurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifestation_id UUID NOT NULL REFERENCES public.manifestations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color_hex TEXT,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.secteurs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.secteurs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secteurs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secteurs TO service_role;

CREATE POLICY "public can view secteurs of published manifestations"
  ON public.secteurs FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manifestations m
      WHERE m.id = secteurs.manifestation_id AND m.is_published = true
    )
  );

CREATE POLICY "manifestation admins manage their secteurs"
  ON public.secteurs FOR ALL TO authenticated
  USING (public.is_manifestation_admin(auth.uid(), manifestation_id))
  WITH CHECK (public.is_manifestation_admin(auth.uid(), manifestation_id));

CREATE POLICY "super_admin manages all secteurs"
  ON public.secteurs FOR ALL TO authenticated
  USING (public.is_administrator(auth.uid()))
  WITH CHECK (public.is_administrator(auth.uid()));

-- =========================================================================
-- shifts
-- =========================================================================

CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secteur_id UUID NOT NULL REFERENCES public.secteurs(id) ON DELETE CASCADE,
  manifestation_id UUID NOT NULL REFERENCES public.manifestations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  capacity INT NOT NULL CHECK (capacity > 0),
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.shifts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO service_role;

CREATE POLICY "public can view shifts of published manifestations"
  ON public.shifts FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manifestations m
      WHERE m.id = shifts.manifestation_id AND m.is_published = true
    )
  );

CREATE POLICY "manifestation admins manage their shifts"
  ON public.shifts FOR ALL TO authenticated
  USING (public.is_manifestation_admin(auth.uid(), manifestation_id))
  WITH CHECK (public.is_manifestation_admin(auth.uid(), manifestation_id));

CREATE POLICY "super_admin manages all shifts"
  ON public.shifts FOR ALL TO authenticated
  USING (public.is_administrator(auth.uid()))
  WITH CHECK (public.is_administrator(auth.uid()));

-- =========================================================================
-- manifestation_engagements
-- =========================================================================

CREATE TABLE public.manifestation_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifestation_id UUID NOT NULL REFERENCES public.manifestations(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.engagement_status NOT NULL DEFAULT 'interested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (manifestation_id, volunteer_id)
);

ALTER TABLE public.manifestation_engagements ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manifestation_engagements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manifestation_engagements TO service_role;
-- no anon: requires an authenticated volunteer

CREATE POLICY "volunteers manage their own engagements"
  ON public.manifestation_engagements FOR ALL TO authenticated
  USING (auth.uid() = volunteer_id)
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "manifestation admins view engagements on their manifestation"
  ON public.manifestation_engagements FOR SELECT TO authenticated
  USING (public.is_manifestation_admin(auth.uid(), manifestation_id));

CREATE POLICY "super_admin manages all engagements"
  ON public.manifestation_engagements FOR ALL TO authenticated
  USING (public.is_administrator(auth.uid()))
  WITH CHECK (public.is_administrator(auth.uid()));

-- Now that manifestation_engagements exists: admins may view profiles of
-- volunteers engaged with their manifestation (name/email for rosters).
CREATE POLICY "manifestation admins view engaged volunteer profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manifestation_engagements me
      WHERE me.volunteer_id = profiles.id
        AND public.is_manifestation_admin(auth.uid(), me.manifestation_id)
    )
  );

-- =========================================================================
-- shift_signups
-- =========================================================================

CREATE TABLE public.shift_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.shift_signup_status NOT NULL DEFAULT 'applied',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shift_id, volunteer_id)
);

ALTER TABLE public.shift_signups ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_signups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_signups TO service_role;
-- no anon: signup requires an account

-- NOTE: the initial status (applied vs confirmed per
-- manifestations.shift_signup_mode) and the shift-capacity check are
-- application-layer logic, not expressed here as bare RLS/CHECK
-- constraints — see create_shift_signup() planned for Phase 3/5
-- (doc/roadmap.md). This scaffold migration only sets up ownership RLS.
CREATE POLICY "volunteers manage their own signups"
  ON public.shift_signups FOR ALL TO authenticated
  USING (auth.uid() = volunteer_id)
  WITH CHECK (auth.uid() = volunteer_id);

CREATE POLICY "manifestation admins manage signups on their shifts"
  ON public.shift_signups FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_signups.shift_id
        AND public.is_manifestation_admin(auth.uid(), s.manifestation_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_signups.shift_id
        AND public.is_manifestation_admin(auth.uid(), s.manifestation_id)
    )
  );

CREATE POLICY "super_admin manages all signups"
  ON public.shift_signups FOR ALL TO authenticated
  USING (public.is_administrator(auth.uid()))
  WITH CHECK (public.is_administrator(auth.uid()));

-- =========================================================================
-- points_ledger (append-only, no UPDATE/DELETE policy for anyone)
-- =========================================================================

CREATE TABLE public.points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  manifestation_id UUID REFERENCES public.manifestations(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  event_type public.points_event_type NOT NULL,
  points INT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

-- No UPDATE/DELETE grant at all -- append-only per data-model.md.
GRANT SELECT, INSERT ON public.points_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.points_ledger TO service_role; -- corrections via service_role/Edge Function only

CREATE POLICY "volunteers view their own points"
  ON public.points_ledger FOR SELECT TO authenticated
  USING (auth.uid() = volunteer_id);

CREATE POLICY "manifestation admins insert shift_completed points for their manifestation"
  ON public.points_ledger FOR INSERT TO authenticated
  WITH CHECK (
    event_type = 'shift_completed'
    AND manifestation_id IS NOT NULL
    AND public.is_manifestation_admin(auth.uid(), manifestation_id)
  );

CREATE POLICY "manifestation admins view points for their manifestation"
  ON public.points_ledger FOR SELECT TO authenticated
  USING (
    manifestation_id IS NOT NULL
    AND public.is_manifestation_admin(auth.uid(), manifestation_id)
  );

CREATE POLICY "super_admin manages all points"
  ON public.points_ledger FOR ALL TO authenticated
  USING (public.is_administrator(auth.uid()))
  WITH CHECK (public.is_administrator(auth.uid()));

-- =========================================================================
-- newsletter_sends
-- =========================================================================

CREATE TABLE public.newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifestation_id UUID REFERENCES public.manifestations(id) ON DELETE SET NULL,
  sent_by UUID NOT NULL REFERENCES public.profiles(id),
  subject TEXT NOT NULL,
  resend_broadcast_id TEXT,
  audience_scope public.newsletter_audience_scope NOT NULL,
  recipient_count INT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.newsletter_sends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_sends TO service_role;

-- Locked decision (roadmap.md Décision #2): ANY manifestation_admin (of ANY
-- manifestation) may set audience_scope = 'all_platform'. No approval
-- queue. is_manifestation_admin here has no manifestation_id tie-in on
-- purpose for the all_platform branch -- any row in manifestation_admins
-- for this user, regardless of which manifestation, is sufficient.
CREATE POLICY "manifestation admins can send platform or own-manifestation newsletters"
  ON public.newsletter_sends FOR INSERT TO authenticated
  WITH CHECK (
    sent_by = auth.uid()
    AND (
      (audience_scope = 'all_platform'
        AND EXISTS (SELECT 1 FROM public.manifestation_admins ma WHERE ma.user_id = auth.uid()))
      OR
      (audience_scope = 'manifestation_engaged'
        AND manifestation_id IS NOT NULL
        AND public.is_manifestation_admin(auth.uid(), manifestation_id))
    )
  );

CREATE POLICY "manifestation admins view sends relevant to them"
  ON public.newsletter_sends FOR SELECT TO authenticated
  USING (
    sent_by = auth.uid()
    OR (manifestation_id IS NOT NULL AND public.is_manifestation_admin(auth.uid(), manifestation_id))
  );

CREATE POLICY "super_admin manages all newsletter_sends"
  ON public.newsletter_sends FOR ALL TO authenticated
  USING (public.is_administrator(auth.uid()))
  WITH CHECK (public.is_administrator(auth.uid()));

-- =========================================================================
-- platform_settings (singleton, pattern copied from Economat FDV site_settings)
-- =========================================================================

CREATE TABLE public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  points_per_signup INT NOT NULL DEFAULT 5,
  points_per_shift_completed INT NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT platform_settings_singleton CHECK (id = 'main')
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.platform_settings TO anon;
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT UPDATE ON public.platform_settings TO authenticated;     -- filtered to super_admin only by the policy below
GRANT SELECT, UPDATE ON public.platform_settings TO service_role;

CREATE POLICY "anyone can read platform settings"
  ON public.platform_settings FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "only super_admin can update platform settings"
  ON public.platform_settings FOR UPDATE TO authenticated
  USING (public.is_administrator(auth.uid()))
  WITH CHECK (public.is_administrator(auth.uid()));

INSERT INTO public.platform_settings (id, points_per_signup, points_per_shift_completed)
VALUES ('main', 5, 20);

-- =========================================================================
-- auth.users -> profiles bootstrap trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
