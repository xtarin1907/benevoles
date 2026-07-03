-- "Nos partenaires" (roadmap : page publique liée depuis la landing,
-- gérée par le super_admin, logos façon page "qui sommes-nous" de
-- Maximus Discotecus).
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Page publique -- même pattern de lecture publique que platform_settings.
CREATE POLICY "public can view partners"
  ON public.partners FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "super_admin can manage partners"
  ON public.partners FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

-- Bucket de logos, même principe que manifestation-logos : bucket.public
-- = true sert déjà les fichiers via l'URL publique sans passer par la RLS
-- storage.objects -- pas de policy SELECT ici (ajouterait seulement la
-- capacité de lister le bucket via l'API authentifiée, cf. leçon retenue
-- sur manifestation-logos / get_advisors "public_bucket_allows_listing").
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-logos', 'partner-logos', true);

CREATE POLICY "partner_logos_admin_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'partner-logos' AND private.is_administrator((select auth.uid())));

CREATE POLICY "partner_logos_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'partner-logos' AND private.is_administrator((select auth.uid())));

CREATE POLICY "partner_logos_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'partner-logos' AND private.is_administrator((select auth.uid())));
