-- Décision Xavier 2026-07-03 : le super_admin doit pouvoir masquer un
-- partenaire de la page publique sans le supprimer définitivement.
ALTER TABLE public.partners ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true;
