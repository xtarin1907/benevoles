-- Self-serve manifestation creation (§16): any authenticated user may
-- create a manifestation, but it starts unpublished and pending, and only
-- a super_admin can approve it. A guard trigger blocks publishing before
-- approval even via the existing "manifestation admins can update their own
-- manifestation" policy, which has no notion of this rule.
CREATE TYPE manifestation_approval_status AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE public.manifestations
  ADD COLUMN approval_status manifestation_approval_status NOT NULL DEFAULT 'approved';

-- Existing rows were all created by the super_admin -- backfill keeps the
-- default 'approved' for them; only new self-serve inserts start 'pending'.

CREATE POLICY "authenticated users can create a pending manifestation"
  ON public.manifestations FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND approval_status = 'pending'
    AND is_published = false
  );

CREATE OR REPLACE FUNCTION private.guard_manifestation_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.is_published = true
     AND NEW.approval_status != 'approved'
     AND NOT private.is_administrator((select auth.uid()))
  THEN
    RAISE EXCEPTION 'Cette manifestation doit être validée par le groupement avant publication.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_manifestation_publish
  BEFORE INSERT OR UPDATE ON public.manifestations
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_manifestation_publish();

REVOKE EXECUTE ON FUNCTION private.guard_manifestation_publish() FROM PUBLIC;
