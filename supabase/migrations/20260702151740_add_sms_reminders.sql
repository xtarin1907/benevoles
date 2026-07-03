-- Rappels SMS Twilio aux bénévoles avant leur shift (roadmap §4). Décision
-- Xavier 2026-07-02 : pas d'attente du module payant complet (organizations/
-- subscriptions non tranché) -- `sms_enabled` est un simple interrupteur
-- contrôlé par le super_admin au cas par cas, en attendant une vraie grille
-- tarifaire. pg_cron + pg_net pour rester autonome (pas de scheduler tiers).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TYPE reminder_send_mode AS ENUM ('automatic', 'manual');

CREATE TABLE public.manifestation_reminder_settings (
  manifestation_id UUID PRIMARY KEY REFERENCES public.manifestations(id) ON DELETE CASCADE,
  send_mode reminder_send_mode NOT NULL DEFAULT 'automatic',
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifestation_id UUID NOT NULL REFERENCES public.manifestations(id) ON DELETE CASCADE,
  offset_minutes INT NOT NULL,
  message_template TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- manifestation_id dénormalisé depuis reminder_rules pour simplifier les
-- policies RLS de reminder_sends (même pattern que shifts.manifestation_id,
-- data-model.md).
CREATE TABLE public.reminder_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifestation_id UUID NOT NULL REFERENCES public.manifestations(id) ON DELETE CASCADE,
  shift_signup_id UUID NOT NULL REFERENCES public.shift_signups(id) ON DELETE CASCADE,
  reminder_rule_id UUID NOT NULL REFERENCES public.reminder_rules(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shift_signup_id, reminder_rule_id)
);

ALTER TABLE public.manifestation_reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_sends ENABLE ROW LEVEL SECURITY;

-- --- manifestation_reminder_settings ---

CREATE POLICY "manifestation admins can view their reminder settings"
  ON public.manifestation_reminder_settings FOR SELECT TO authenticated
  USING (private.is_manifestation_admin((select auth.uid()), manifestation_id));

CREATE POLICY "manifestation admins can insert their reminder settings"
  ON public.manifestation_reminder_settings FOR INSERT TO authenticated
  WITH CHECK (private.is_manifestation_admin((select auth.uid()), manifestation_id));

CREATE POLICY "manifestation admins can update their reminder settings"
  ON public.manifestation_reminder_settings FOR UPDATE TO authenticated
  USING (private.is_manifestation_admin((select auth.uid()), manifestation_id))
  WITH CHECK (private.is_manifestation_admin((select auth.uid()), manifestation_id));

CREATE POLICY "super_admin can manage reminder settings"
  ON public.manifestation_reminder_settings FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

-- sms_enabled is the billing-surrogate gate (roadmap §19) -- only a
-- super_admin may flip it, even though manifestation admins can otherwise
-- manage their own settings row (send_mode). Same guard-trigger pattern as
-- guard_manifestation_publish.
CREATE OR REPLACE FUNCTION private.guard_sms_enabled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.sms_enabled IS DISTINCT FROM COALESCE(OLD.sms_enabled, false)
     AND NOT private.is_administrator((select auth.uid()))
  THEN
    RAISE EXCEPTION 'Seul le groupement peut activer les rappels SMS (fonctionnalité payante).';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_sms_enabled
  BEFORE INSERT OR UPDATE ON public.manifestation_reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_sms_enabled();

REVOKE EXECUTE ON FUNCTION private.guard_sms_enabled() FROM PUBLIC;

-- Seed two default rules (J-1, H-1) the first time a manifestation's
-- reminder settings are created.
CREATE OR REPLACE FUNCTION private.seed_default_reminder_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  INSERT INTO public.reminder_rules (manifestation_id, offset_minutes, message_template)
  VALUES
    (NEW.manifestation_id, 1440, 'Rappel : tu es inscrit(e) demain pour ton shift. À bientôt !'),
    (NEW.manifestation_id, 60, 'Rappel : ton shift commence dans 1 heure.');
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_default_reminder_rules
  AFTER INSERT ON public.manifestation_reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION private.seed_default_reminder_rules();

REVOKE EXECUTE ON FUNCTION private.seed_default_reminder_rules() FROM PUBLIC;

-- --- reminder_rules ---

CREATE POLICY "manifestation admins can manage their reminder rules"
  ON public.reminder_rules FOR ALL TO authenticated
  USING (private.is_manifestation_admin((select auth.uid()), manifestation_id))
  WITH CHECK (private.is_manifestation_admin((select auth.uid()), manifestation_id));

CREATE POLICY "super_admin can manage all reminder rules"
  ON public.reminder_rules FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

-- --- reminder_sends (audit log, written only by the service-role Edge Function) ---

CREATE POLICY "manifestation admins can view their reminder sends"
  ON public.reminder_sends FOR SELECT TO authenticated
  USING (private.is_manifestation_admin((select auth.uid()), manifestation_id));

CREATE POLICY "super_admin can view all reminder sends"
  ON public.reminder_sends FOR SELECT TO authenticated
  USING (private.is_administrator((select auth.uid())));
