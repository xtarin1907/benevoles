-- Bénévoles+ — Phase 5: volunteer-facing shift signup.
--
-- Deferred since the Phase 1 scaffold (see initial_schema.sql comment):
-- the capacity check + initial-status-per-shift_signup_mode logic can't
-- be expressed as bare RLS/CHECK constraints, and needs to be atomic
-- against concurrent signups on the same shift. SECURITY DEFINER +
-- `FOR UPDATE` on the shift row serializes concurrent callers so the
-- capacity count they see is consistent.
--
-- Point-awarding on signup (doc/roadmap.md Phase 6) is deliberately NOT
-- done here -- this function only creates the signup row.

CREATE OR REPLACE FUNCTION public.create_shift_signup(_shift_id UUID)
RETURNS public.shift_signups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _volunteer_id UUID := auth.uid();
  _manifestation_id UUID;
  _capacity INT;
  _mode public.shift_signup_mode;
  _confirmed_count INT;
  _initial_status public.shift_signup_status;
  _result public.shift_signups;
BEGIN
  IF _volunteer_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Locks the shift row so two concurrent signups on the same shift
  -- serialize instead of both reading the same confirmed_count.
  SELECT s.manifestation_id, s.capacity INTO _manifestation_id, _capacity
  FROM public.shifts s
  WHERE s.id = _shift_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'shift not found';
  END IF;

  SELECT m.shift_signup_mode INTO _mode
  FROM public.manifestations m
  WHERE m.id = _manifestation_id;

  SELECT count(*) INTO _confirmed_count
  FROM public.shift_signups
  WHERE shift_id = _shift_id AND status = 'confirmed';

  IF _mode = 'auto_confirm' THEN
    IF _confirmed_count >= _capacity THEN
      RAISE EXCEPTION 'shift is full';
    END IF;
    _initial_status := 'confirmed';
  ELSE
    _initial_status := 'applied';
  END IF;

  INSERT INTO public.shift_signups (shift_id, volunteer_id, status)
  VALUES (_shift_id, _volunteer_id, _initial_status)
  RETURNING * INTO _result;

  RETURN _result;
END;
$$;

-- Intentionally in `public` (not `private`) and granted to `authenticated`
-- only: unlike the RLS helper functions, this one IS meant to be called
-- directly via PostgREST RPC from the client.
GRANT EXECUTE ON FUNCTION public.create_shift_signup(UUID) TO authenticated;
