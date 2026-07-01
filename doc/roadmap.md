# Roadmap — Bénévoles+

## Décisions actées (2026-07-01)

- Stack : Next.js + Supabase.
- Multi-tenance : un seul projet Supabase, RLS par manifestation.
- Le projet repart de zéro (pas de fork d'Economat FDV) ; seul le modèle
  de données sert d'inspiration.
- Newsletter : Resend.

1. **Validation des inscriptions à un shift : configurable par
   manifestation.** Ajout d'une colonne `manifestations.shift_signup_mode`
   (`'auto_confirm' | 'admin_approval'`). En `auto_confirm`, une inscription
   passe directement en `confirmed` (sous réserve de capacité). En
   `admin_approval`, elle démarre en `applied` et un admin de la
   manifestation la fait transiter vers `confirmed`/`declined` — reprend
   alors le principe du Kanban de candidatures d'Economat FDV, mais
   seulement pour les manifestations qui choisissent ce mode. Voir
   `data-model.md`.

2. **Newsletter "plateforme entière" : n'importe quel admin de
   manifestation peut la déclencher**, pas seulement le super admin. Pas
   de file d'approbation. Risque de sur-sollicitation des bénévoles
   d'autres manifestations accepté explicitement par Xavier — à ne pas
   re-restreindre plus tard sans repasser par une décision documentée ici.

3. **Barème de points : fixe pour toute la plateforme.** Table singleton
   `platform_settings` (pattern repris de `site_settings` chez Economat
   FDV) plutôt qu'une table `points_rules` par manifestation. Réouvrir
   uniquement si une manifestation le demande réellement (YAGNI).

## Décisions encore ouvertes

4. **Nom de la plateforme.** "Bénévoles+" est un nom de travail utilisé
   dans cette documentation, pas un choix arrêté.

5. **Consentement newsletter (nLPD/LCD suisse).** Le bénévole doit
   consentir explicitement à recevoir des newsletters (opt-in), séparément
   de la création de compte. À formaliser (case à cocher dédiée, lien vers
   une politique de confidentialité) avant la mise en prod de la
   fonctionnalité newsletter — pas un blocage pour le MVP shifts/points,
   mais un blocage pour la phase Newsletter (Phase 7).

## Phases

### Phase 0 — Fondations (en cours, cette session)

- [x] Exploration du modèle Economat FDV.
- [x] Choix stack + multi-tenance avec Xavier.
- [x] `CLAUDE.md` adapté au projet.
- [x] `doc/` : architecture, modèle de données, roadmap.
- [x] Trancher les décisions #1, #2, #3 avec Xavier.
- [ ] Trancher #4 (nom) et #5 (consentement newsletter) — #4 avant mise en
      prod, #5 avant la Phase 7.

### Phase 1 — Scaffold technique (terminée le 2026-07-01, sauf 1 point bloqué)

- [x] Scaffold Next.js 16 (App Router, Turbopack, TypeScript strict) dans
      `/benevoles`, bun comme package manager, shadcn/ui configuré
      (style courant `base-nova`/Base UI — le CLI shadcn a migré depuis
      Radix depuis la version connue d'Economat FDV).
- [x] Projet Supabase cloud `benevoles` créé (ref `xxmmitlrvzdxrwulyebz`,
      org `xtarin1907's Org`, région `eu-west-1`, Postgres 17) — coût réel
      10 $/mois confirmé et validé par Xavier avant création (pas de tier
      gratuit disponible sur cette org).
- [x] Schéma complet appliqué (manifestations, secteurs, shifts,
      manifestation_admins, manifestation_engagements, shift_signups,
      points_ledger, newsletter_sends, platform_settings) + policies RLS
      + GRANTs explicites + trigger `handle_new_user`.
- [x] Durcissement post-`get_advisors` : fonctions RLS déplacées dans un
      schéma `private` non exposé par PostgREST (0 alerte sécurité), toutes
      les policies réécrites avec `(select auth.uid())` (0 alerte
      `auth_rls_initplan`).
- [x] Auth `@supabase/ssr` (client/serveur/`proxy.ts` — **pas**
      `middleware.ts`, renommé en Next.js 16) + pages de smoke-test
      signup/login/dashboard. `bun run build` + `tsc --noEmit` + `eslint`
      passent tous les trois sans erreur.
- [x] Test d'isolation RLS (`src/__tests__/rls-isolation.test.ts`) — 6/6
      passent. A immédiatement trouvé un vrai bug à son premier run réel :
      `is_administrator()` (déplacée dans `private` par la migration de
      durcissement) appelait encore `public.has_role(...)` en dur dans son
      corps — `ALTER FUNCTION ... SET SCHEMA` déplace la fonction mais ne
      réécrit pas les références textuelles internes des autres fonctions.
      Corrigé par `20260701124719_fix_is_administrator_stale_reference.sql`.
      Digression notable : `.env.local` est une convention Next.js, pas
      auto-chargée par vitest — `vitest.config.ts` charge maintenant les
      variables via `loadEnv()` de Vite explicitement.

**Phase 1 terminée.**

### Phase 2 — Super admin (terminée le 2026-07-01, sauf 1 point non vérifié)

Décisions tranchées avec Xavier avant de coder : invitation des admins de
manifestation par email (`auth.admin.inviteUserByEmail`, crée le compte
directement — limitation v1 connue : échoue si l'email a déjà un compte,
pas de fusion avec un compte bénévole existant, à revisiter seulement si
ça arrive réellement) ; bootstrap du premier super_admin
(`xavier@tarin.ch`) par création directe de compte plutôt que par
`/signup`.

- [x] `src/lib/supabase/admin.ts` — client `service_role`, strictement
      réservé aux opérations sans équivalent RLS (Auth Admin API pour les
      invitations). Toutes les écritures de données passent par le
      client RLS-scopé habituel, jamais par ce client.
- [x] `src/lib/auth/guards.ts` (`requireSuperAdmin()`) + `src/app/admin/layout.tsx`
      — garde-fou sur toutes les routes `/admin/*`.
- [x] CRUD `manifestations` (`/admin/manifestations`, `/new`, `/[id]`).
- [x] Gestion des `manifestation_admins` (invitation par email + retrait).
- [x] Vue globale bénévoles/points en lecture seule (`/admin/volunteers`).
- [x] `bun run build`, `bunx tsc --noEmit`, `bun run lint` : tous verts.
- [x] Bug shadcn/Base UI trouvé et corrigé par le typecheck avant tout
      run : le nouveau `Button` (Base UI, pas Radix) n'a pas de prop
      `asChild` — remplacé par le pattern Base UI `render={<Link .../>}`.
- [ ] **Non vérifié en conditions réelles** : le clic-par-clic complet
      dans un vrai navigateur (créer une manifestation, l'éditer, inviter
      un admin) n'a pas pu être automatisé — Chromium headless ne survit
      pas au sandbox de l'environnement d'exécution de cette session
      (le transport par pipe de Playwright est tué quelques centaines de
      ms après lancement ; confirmé indépendant du code de l'app :
      le même binaire lancé directement au shell fonctionne, mais spawné
      depuis un script Bun il est tué par SIGKILL). Les vérifications
      statiques (build/typecheck/lint) et la preuve bout-en-bout du
      Phase 1 (auth + RLS via Postgres réel) donnent un bon niveau de
      confiance, mais un vrai clic-par-clic par Xavier reste recommandé
      avant de considérer la Phase 2 définitivement close.

### Phase 3 — Admin de manifestation

- Branding manifestation (logo, couleur, description, dates,
  publication).
- CRUD `secteurs` / `shifts`.
- Vue des inscriptions à ses shifts + validation manuelle (accepter/
  refuser) pour les manifestations en mode `admin_approval` (Décision #1).

### Phase 4 — Landing page publique

- Liste des manifestations publiées + calendrier consolidé.
- Point d'entrée d'engagement (inscription compte bénévole → choix
  manifestation(s)).

### Phase 5 — Espace bénévole

- Mes inscriptions (par manifestation, par shift).
- Mes points (lecture du `points_ledger`).
- Gestion de mes engagements multi-manifestations.

### Phase 6 — Moteur de points

- Écriture dans `points_ledger` sur inscription + sur shift marqué
  "effectué" par un admin, valeurs lues depuis `platform_settings`
  (Décision #3, fixe plateforme).
- Affichage du total + historique côté bénévole.
- (Reporté sciemment) Barème paramétrable par manifestation — seulement si
  une manifestation le demande réellement (YAGNI, cf. Décision #3).

### Phase 7 — Newsletter

- Intégration Resend (Audiences/Broadcasts).
- UI de déclenchement d'envoi côté admin de manifestation — tout admin
  peut cibler `'all_platform'` ou `'manifestation_engaged'` (Décision #2,
  pas de file d'approbation à construire).
- Formalisation du consentement (Décision #5) avant activation en prod.

### Phase 8 — Mobile (différé)

Pas de version mobile tant que le web n'a pas de signal d'usage réel.
Precedent technique disponible si besoin (FDV-Mobile en Expo/React
Native connecté au même backend Supabase) — à réévaluer seulement si
Xavier constate un besoin réel côté bénévoles (pas anticipé maintenant).
