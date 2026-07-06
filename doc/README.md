# Documentation — Bénévoles Lavaux

Index de la documentation du projet. **Ces documents sont l'état de travail
courant, à relire en entier avant toute modification** (voir `CLAUDE.md`
§Règle d'or à la racine du projet).

## Contenu

- [architecture.md](architecture.md) — stack technique, multi-tenance,
  rôles, ce qui est repris d'Economat FDV et pourquoi.
- [data-model.md](data-model.md) — schéma de données proposé (tables,
  colonnes, RLS).
- [roadmap.md](roadmap.md) — phases de développement + décisions ouvertes
  qui doivent être tranchées par Xavier avant d'être codées.
- [changelog.md](changelog.md) — journal chronologique des évolutions
  (décisions actées, changements de schéma, sessions de travail).

## État au 2026-07-03

Application fonctionnelle, Phases 0 à 8 terminées (voir `roadmap.md` pour
le détail phase par phase et `changelog.md` pour l'historique complet) :
manifestations (super_admin + auto-création organisateur avec validation),
secteurs/shifts (dont staffing par postes sans horaire), inscriptions
bénévoles (auto-confirmées ou validées, avec liste de réserve et
annulation self-service), points, newsletter, séries/éditions
récurrentes, notification email au responsable des bénévoles, rappels SMS
(schéma + Edge Function en place, envoi Twilio réel non testé faute
d'identifiants). Landing publique différenciée bénévoles (`/`) et
organisateurs (`/organisateurs`), avec page "Nos partenaires"
(`/partenaires`, gérée par le super_admin) et bandeau défilant "cherche
des bénévoles". Liste noire des bénévoles no-show/partis avant la fin,
partagée entre organisateurs (signal visuel, pas de blocage automatique —
voir `roadmap.md` Décision #9). Error Boundary React global (filet de
sécurité contre les pages blanches en cas d'exception non interceptée).

- Stack : **Vite + React Router (SPA statique) + Supabase**, révisée le
  2026-07-02 depuis Next.js pour un hébergement Infomaniak à l'identique
  des autres sites de Xavier (voir `architecture.md` §Stack technique et
  `roadmap.md` décision ouverte #6 pour le compromis SEO accepté).
- Multi-tenance : un seul projet Supabase (`xxmmitlrvzdxrwulyebz`),
  isolation par RLS par manifestation (pas un projet Supabase par
  manifestation) — **une exception documentée et assumée** : la liste
  noire des bénévoles est volontairement partagée entre toutes les
  manifestations (`roadmap.md` Décision #9).
- Le projet est reparti de zéro ; seul le *modèle* de données initial
  d'Economat FDV (shifts, secteurs, cycle de statut) a servi
  d'inspiration — les évolutions depuis sont propres à Bénévoles+.
- Newsletter : Resend (envoi direct par lot, pas d'intégration Audiences/
  Broadcasts — voir `roadmap.md` Phase 7).
- Rappels SMS : Twilio (voir `roadmap.md` Phase 8 et décision ouverte #8
  pour le module payant qui doit à terme les gater).
- **Module payant (abonnement par compte organisateur) : décision
  ouverte, non implémentée** — voir `roadmap.md` §Décisions encore
  ouvertes #8.
