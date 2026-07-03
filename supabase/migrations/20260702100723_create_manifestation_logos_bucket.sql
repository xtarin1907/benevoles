INSERT INTO storage.buckets (id, name, public)
VALUES ('manifestation-logos', 'manifestation-logos', true);

-- Public read (logos shown on the public landing page).
CREATE POLICY "manifestation_logos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'manifestation-logos');

-- Write restricted to admins of the manifestation whose id is the first
-- path segment (e.g. "<manifestation_id>/logo.png"), or the super_admin --
-- same authorization functions used by the manifestations RLS policies.
CREATE POLICY "manifestation_logos_admin_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'manifestation-logos'
    AND (
      private.is_administrator((select auth.uid()))
      OR private.is_manifestation_admin((select auth.uid()), (storage.foldername(name))[1]::uuid)
    )
  );

CREATE POLICY "manifestation_logos_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'manifestation-logos'
    AND (
      private.is_administrator((select auth.uid()))
      OR private.is_manifestation_admin((select auth.uid()), (storage.foldername(name))[1]::uuid)
    )
  );

CREATE POLICY "manifestation_logos_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'manifestation-logos'
    AND (
      private.is_administrator((select auth.uid()))
      OR private.is_manifestation_admin((select auth.uid()), (storage.foldername(name))[1]::uuid)
    )
  );
