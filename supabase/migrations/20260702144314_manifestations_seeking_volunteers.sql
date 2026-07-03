-- Public-safe aggregate: which published manifestations have at least one
-- under-capacity shift. Deliberately coarser than "X places restantes" per
-- shift (data-model.md v1 simplification) -- only a boolean-ish signal per
-- manifestation, no per-bénévole identity exposed. Explicitly granted to
-- anon: this is the one function in the project meant for public RPC use.
CREATE OR REPLACE FUNCTION public.manifestations_seeking_volunteers()
RETURNS TABLE(manifestation_id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT m.id, m.name
  FROM manifestations m
  JOIN shifts s ON s.manifestation_id = m.id
  WHERE m.is_published = true
    AND s.capacity > (
      SELECT count(*) FROM shift_signups ss WHERE ss.shift_id = s.id AND ss.status = 'confirmed'
    );
$$;

GRANT EXECUTE ON FUNCTION public.manifestations_seeking_volunteers() TO anon, authenticated;
