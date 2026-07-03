CREATE TABLE public.manifestation_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manifestations
  ADD COLUMN series_id uuid REFERENCES public.manifestation_series(id) ON DELETE SET NULL,
  ADD COLUMN edition_year int,
  ADD COLUMN website_url text,
  ADD COLUMN contact_email text;

ALTER TABLE public.manifestation_series ENABLE ROW LEVEL SECURITY;

-- Same visibility rule as manifestations: a series is only worth reading
-- publicly if it groups at least one published edition; admins of any
-- edition in the series (or super_admin) can always read/manage it.
CREATE POLICY "manifestation_series_public_read"
  ON public.manifestation_series FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manifestations m
      WHERE m.series_id = manifestation_series.id AND m.is_published = true
    )
    OR private.is_administrator((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.manifestations m
      WHERE m.series_id = manifestation_series.id
        AND private.is_manifestation_admin((select auth.uid()), m.id)
    )
  );

CREATE POLICY "manifestation_series_admin_write"
  ON public.manifestation_series FOR INSERT
  TO authenticated
  WITH CHECK (private.is_administrator((select auth.uid())));

CREATE POLICY "manifestation_series_admin_update"
  ON public.manifestation_series FOR UPDATE
  TO authenticated
  USING (private.is_administrator((select auth.uid())));

GRANT SELECT ON public.manifestation_series TO anon, authenticated;
GRANT INSERT, UPDATE ON public.manifestation_series TO authenticated;
