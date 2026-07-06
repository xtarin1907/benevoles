-- Public-safe impact aggregates for the landing page ("bandeau statistiques").
-- Returns ONLY grand totals -- no per-manifestation breakdown, no PII, no
-- per-bénévole identity -- so exposing it to anon does not leak any admin
-- data and respects the inter-manifestation isolation non-negotiable.
-- SECURITY DEFINER because anon has no SELECT on profiles/shift_signups; the
-- function itself only ever emits three scalar counts.
CREATE OR REPLACE FUNCTION public.platform_impact_stats()
RETURNS TABLE(
  manifestations_count bigint,
  volunteers_count bigint,
  volunteer_hours numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM manifestations WHERE is_published = true),
    (SELECT count(*) FROM profiles WHERE platform_role = 'user'),
    -- Hours actually delivered: sum of shift durations over completed signups.
    COALESCE((
      SELECT sum(EXTRACT(EPOCH FROM (s.end_at - s.start_at)) / 3600.0)
      FROM shift_signups ss
      JOIN shifts s ON s.id = ss.shift_id
      WHERE ss.status = 'completed'
    ), 0)::numeric;
$$;

GRANT EXECUTE ON FUNCTION public.platform_impact_stats() TO anon, authenticated;
