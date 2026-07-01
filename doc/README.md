# Documentation — Bénévoles+

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

## État au 2026-07-01

Projet à l'état de conception. Aucun code applicatif n'existe encore.
Décisions actées à ce stade (voir `roadmap.md` pour le détail) :

- Stack : Next.js + Supabase.
- Multi-tenance : un seul projet Supabase, isolation par RLS par
  manifestation (pas un projet Supabase par manifestation).
- Le projet repart de zéro ; seul le *modèle* de données d'Economat FDV
  (shifts, secteurs, cycle de statut) sert d'inspiration — pas de code
  réutilisé tel quel.
- Newsletter : Resend retenu (couvre transactionnel + envois de masse via
  Audiences/Broadcasts ; déjà utilisé côté Economat FDV pour le
  transactionnel, cohérence d'écosystème).
