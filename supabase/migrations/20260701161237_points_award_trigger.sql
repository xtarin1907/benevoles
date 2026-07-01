-- Bénévoles+ — Phase 6: points engine.
--
-- Decision (roadmap.md Décision #3, already locked): fixed platform-wide
-- barème via platform_settings, no per-manifestation points_rules table.
--
-- Design choice: award points via a trigger on shift_signups, not
-- scattered across every code path that can change a signup's status
-- (create_shift_signup() RPC for auto_confirm, the admin accept action
-- for admin_approval, and a future "mark completed" admin action). A
-- trigger is the single source of truth regardless of which path fired
-- the status change -- can't be bypassed by a future call site
-- forgetting to award points.
--
-- 'signup' points are awarded when a signup reaches 'confirmed'
-- (immediately for auto_confirm, or when an admin accepts an 'applied'
-- one) -- NOT on 'applied' itself, to avoid needing to reverse the
-- ledger entry if an admin later declines it (points_ledger is
-- append-only by design, see data-model.md).
-- 'shift_completed' points are awarded when a signup reaches 'completed'.
-- Each event type is awarded at most once per signup (idempotency guard),
-- since a signup could in principle bounce in and out of a status.

CREATE OR REPLACE FUNCTION public.award_points_on_signup_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _points_per_signup INT;
  _points_per_shift_completed INT;
BEGIN
  SELECT points_per_signup, points_per_shift_completed
  INTO _points_per_signup, _points_per_shift_completed
  FROM public.platform_settings WHERE id = 'main';

  IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.points_ledger
      WHERE shift_id = NEW.shift_id AND volunteer_id = NEW.volunteer_id AND event_type = 'signup'
    ) THEN
      INSERT INTO public.points_ledger (volunteer_id, manifestation_id, shift_id, event_type, points)
      SELECT NEW.volunteer_id, s.manifestation_id, NEW.shift_id, 'signup', _points_per_signup
      FROM public.shifts s WHERE s.id = NEW.shift_id;
    END IF;
  END IF;

  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.points_ledger
      WHERE shift_id = NEW.shift_id AND volunteer_id = NEW.volunteer_id AND event_type = 'shift_completed'
    ) THEN
      INSERT INTO public.points_ledger (volunteer_id, manifestation_id, shift_id, event_type, points)
      SELECT NEW.volunteer_id, s.manifestation_id, NEW.shift_id, 'shift_completed', _points_per_shift_completed
      FROM public.shifts s WHERE s.id = NEW.shift_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_shift_signup_status_change
  AFTER INSERT OR UPDATE OF status ON public.shift_signups
  FOR EACH ROW EXECUTE FUNCTION public.award_points_on_signup_status_change();
