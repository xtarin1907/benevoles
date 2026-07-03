-- Behavior change: capacity is now enforced regardless of shift_signup_mode
-- (previously only auto_confirm checked capacity at all; admin_approval let
-- 'applied' signups accumulate past capacity with no signal). A shift at
-- capacity now waitlists new signups in either mode, promoted manually by
-- an admin (no auto-promotion, decided with Xavier).
CREATE OR REPLACE FUNCTION public.create_shift_signup(_shift_id uuid)
RETURNS shift_signups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF _confirmed_count >= _capacity THEN
    _initial_status := 'waitlisted';
  ELSIF _mode = 'auto_confirm' THEN
    _initial_status := 'confirmed';
  ELSE
    _initial_status := 'applied';
  END IF;

  INSERT INTO public.shift_signups (shift_id, volunteer_id, status)
  VALUES (_shift_id, _volunteer_id, _initial_status)
  RETURNING * INTO _result;

  RETURN _result;
END;
$function$;
