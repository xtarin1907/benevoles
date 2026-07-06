# Bénévoles Lavaux

Plateforme de gestion de bénévoles pour un groupement d'associations
(Vite + React + React Router, Supabase). Voir `doc/` pour l'architecture,
le schéma de données et la roadmap, et `CLAUDE.md` pour le contrat de
travail du projet.

## Développement

```bash
bun install
bun run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173).

## Build

```bash
bun run build
```

Génère `dist/` — un dossier statique à déposer tel quel sur l'hébergement
(Infomaniak, upload manuel). `public/.htaccess` (réécriture SPA) est copié
automatiquement dans `dist/` au build.

## Variables d'environnement

Voir `.env.example`. `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` et
`RESEND_FROM_EMAIL` ne sont utilisés que par les Supabase Edge Functions
(`supabase/functions/`), jamais par le frontend — à configurer via
`supabase secrets set`, pas dans `.env`.
