-- Bénévoles+ — fix: set_newsletter_consent_at() was missing
-- `SET search_path = public`, flagged by get_advisors as a mutable
-- search_path (a function without a fixed search_path can be tricked
-- into resolving unqualified names against a schema the caller controls).
CREATE OR REPLACE FUNCTION public.set_newsletter_consent_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.newsletter_consent IS DISTINCT FROM OLD.newsletter_consent THEN
    NEW.newsletter_consent_at := CASE WHEN NEW.newsletter_consent THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END;
$$;
