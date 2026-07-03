-- Liste noire des bénévoles (no-show / départ anticipé), avec commentaire.
-- Décision Xavier 2026-07-03 : partagée entre organisateurs (déroge
-- délibérément à l'isolation stricte par manifestation, cf.
-- doc/roadmap.md) ; signal visuel uniquement, aucun blocage automatique
-- à l'inscription (create_shift_signup() n'est pas modifiée).
-- Append-only façon points_ledger : plusieurs entrées possibles par
-- bénévole, pas un simple booléen -- garde l'historique et le contexte.
CREATE TABLE public.volunteer_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  manifestation_id UUID NOT NULL REFERENCES public.manifestations(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteer_blacklist ENABLE ROW LEVEL SECURITY;

-- Visible à tout admin de manifestation (n'importe laquelle -- c'est la
-- dérogation actée) ou au super_admin ; jamais à un bénévole simple.
CREATE POLICY "any manifestation admin can view the shared blacklist"
  ON public.volunteer_blacklist FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.manifestation_admins ma WHERE ma.user_id = (select auth.uid()))
    OR private.is_administrator((select auth.uid()))
  );

CREATE POLICY "manifestation admins can add blacklist entries for their manifestation"
  ON public.volunteer_blacklist FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND private.is_manifestation_admin((select auth.uid()), manifestation_id)
  );

CREATE POLICY "super_admin can manage all blacklist entries"
  ON public.volunteer_blacklist FOR ALL TO authenticated
  USING (private.is_administrator((select auth.uid())))
  WITH CHECK (private.is_administrator((select auth.uid())));

-- Seule la manifestation à l'origine du signalement peut le retirer
-- (empêche un autre organisateur d'effacer le signalement d'un tiers).
CREATE POLICY "manifestation admins can delete their own blacklist entries"
  ON public.volunteer_blacklist FOR DELETE TO authenticated
  USING (private.is_manifestation_admin((select auth.uid()), manifestation_id));
