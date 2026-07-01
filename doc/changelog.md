# Changelog — Bénévoles+

Journal chronologique des décisions actées et évolutions du projet
(plus récent en premier).

## 2026-07-01 — Décisions produit tranchées + début du scaffold Phase 1

- Décisions #1/#2/#3 de `roadmap.md` tranchées avec Xavier : inscription à
  un shift configurable par manifestation (`shift_signup_mode`), newsletter
  plateforme entière ouverte à tout admin de manifestation (risque accepté
  explicitement), barème de points fixe plateforme via une table singleton
  `platform_settings` (pattern `site_settings` d'Economat FDV).
- `data-model.md` mis à jour en conséquence (colonne `shift_signup_mode`,
  table `platform_settings`, notes de décision ouverte levées).
- Org Supabase confirmée via l'API : org unique `xtarin1907's Org`
  (`snxodotkqwmltrenycom`), tous projets existants en région `eu-west-1`,
  Postgres 17 GA — servira de référence pour le nouveau projet `benevoles`.
- Plan d'implémentation de la Phase 1 (scaffold Next.js + Supabase, premier
  schéma/RLS, wiring auth, test d'isolation) revu et approuvé par Xavier ;
  deux bugs de sécurité corrigés en review avant application : récursion
  RLS potentielle sur une policy `manifestation_admins` auto-référente
  (corrigée par une fonction `is_manifestation_owner()` dédiée), et un
  risque d'auto-promotion via la policy de mise à jour de `profiles`
  (corrigé par un GRANT UPDATE au niveau colonne excluant `platform_role`).
- Checkpoint confirmé avec Xavier : la création du projet Supabase cloud
  se fera avec un feu vert explicite demandé au moment de cette étape, pas
  automatiquement.
- Projet Supabase cloud `benevoles` créé (ref `xxmmitlrvzdxrwulyebz`, org
  `xtarin1907's Org`, région `eu-west-1`, Postgres 17.6.1) — coût réel
  10 $/mois confirmé par `get_cost` (org déjà sur un plan payant, pas de
  tier gratuit disponible pour un nouveau projet) et validé par Xavier
  avant création.
- Migration initiale appliquée (`initial_schema`) : bug d'ordonnancement
  détecté et corrigé au premier essai (les fonctions RLS référençaient
  `manifestation_admins` avant sa création — tables déplacées avant les
  fonctions).
- `get_advisors(security)` post-migration a signalé 5 WARN (fonctions RLS
  `SECURITY DEFINER` exposées comme endpoints RPC publics
  `/rest/v1/rpc/<fn>`) et `get_advisors(performance)` 30 WARN
  `auth_rls_initplan` (`auth.uid()` non enveloppé dans `(select ...)`,
  réévalué ligne par ligne). Corrigés par une migration de durcissement
  (`harden_rls_helpers` + `revoke_handle_new_user_execute`) : les 4
  fonctions RLS déplacées dans un schéma `private` non exposé par
  PostgREST (transparent pour les policies existantes — Postgres résout
  les références de fonction par OID, pas par nom qualifié), toutes les
  policies recréées avec `(select auth.uid())`. Résultat : 0 alerte
  sécurité, 0 `auth_rls_initplan`.
- Restent en l'état, acceptés consciemment : `unindexed_foreign_keys`
  (INFO, 15 occurrences — indexation différée tant qu'il n'y a pas de
  données/patterns de requête réels, YAGNI) et `multiple_permissive_policies`
  (WARN, ~28 occurrences — plusieurs policies nommées par rôle/portée
  plutôt qu'une policy monolithique par table, pour la lisibilité ;
  compromis lisibilité vs. performance assumé, à reconsidérer seulement
  si un problème de performance réel apparaît).
- **Découverte en cours de route** : `create-next-app` a scaffoldé avec
  Next.js 16, qui a des changements cassants par rapport aux conventions
  connues — le plus important : `middleware.ts` renommé `proxy.ts`
  (export `proxy` au lieu de `middleware`). Signalé par un `AGENTS.md`
  auto-généré à la racine (référencé depuis `CLAUDE.md`), vérifié dans
  `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
  avant d'écrire le code d'auth. `cookies()`/`headers()`/`params` sont
  aussi désormais strictement asynchrones (déjà anticipé dans le code
  écrit).
- Wiring auth `@supabase/ssr` (client/serveur/`proxy.ts`) + pages de
  smoke-test signup/login/dashboard écrites. `bun run build`,
  `bunx tsc --noEmit` et `bun run lint` passent tous sans erreur.
- Test d'isolation RLS (`src/__tests__/rls-isolation.test.ts`, vitest)
  écrit et vérifié — échoue proprement (message explicite, pas une
  erreur de compilation) tant que `SUPABASE_SECRET_KEY` n'est pas fourni
  dans `.env.local`. Cette clé n'est pas récupérable via l'outil MCP
  Supabase (restriction volontaire, la clé bypasse toute la RLS) —
  **action requise de Xavier** avant de pouvoir exécuter
  `bun run test:rls` et clore réellement la Phase 1.
- Xavier a fourni `SUPABASE_SECRET_KEY`. Deux bugs supplémentaires trouvés
  et corrigés en lançant le test pour de vrai (exactement le rôle d'un
  test — les découvrir maintenant plutôt qu'en prod) :
  - `.env.local` (convention Next.js) n'est pas auto-chargé par vitest ;
    `vitest.config.ts` charge désormais l'env explicitement via
    `loadEnv()` de Vite.
  - `private.is_administrator()` appelait encore `public.has_role(...)`
    en dur : `ALTER FUNCTION ... SET SCHEMA` (migration de durcissement)
    déplace la fonction mais ne réécrit pas les références textuelles
    internes des autres fonctions qui l'appellent. Toute policy utilisant
    `is_administrator()` échouait donc pour tout le monde, pas seulement
    les super_admins (les policies permissives sont combinées en OR, une
    erreur dans l'une fait échouer toute la requête). Corrigé par
    `20260701124719_fix_is_administrator_stale_reference.sql`.
- **Phase 1 terminée** : 6/6 tests d'isolation RLS passent, données de
  test nettoyées (vérifié), `get_advisors(security)` toujours à 0 alerte.

## 2026-07-01 (suite) — Démarrage Phase 2, bootstrap super_admin

- Décisions tranchées avec Xavier pour la Phase 2 : invitation des admins
  de manifestation par email (Supabase `inviteUserByEmail`, crée le compte
  directement) plutôt que par assignation d'un compte bénévole existant ;
  bootstrap du premier super_admin par création directe de compte plutôt
  que passage par `/signup`.
- Premier compte super_admin créé pour `xavier@tarin.ch`
  (`34ad2afc-10b7-4c70-9181-ab95ce2ef9fa`) via un script ponctuel
  (`auth.admin.inviteUserByEmail`, hors dépôt — dans le scratchpad de
  session) plutôt qu'un INSERT SQL direct dans `auth.users` (non supporté
  officiellement). `profiles.platform_role` mis à `super_admin` ensuite
  via `execute_sql` (le trigger `handle_new_user` met tout nouveau compte
  à `user` par défaut — c'est le comportement voulu, ce compte est
  l'unique exception bootstrap).
- Implémentation Phase 2 (super admin) : `src/lib/supabase/admin.ts`
  (client service_role, usage restreint aux appels Auth Admin API sans
  équivalent RLS), `src/lib/auth/guards.ts` + `src/app/admin/layout.tsx`
  (garde-fou), CRUD manifestations, invitation/retrait d'admins de
  manifestation par email, vue globale bénévoles/points en lecture seule.
- Bug trouvé par `tsc --noEmit` avant tout run : le composant shadcn
  `Button` généré (basé sur Base UI, pas Radix comme chez Economat FDV)
  n'a pas de prop `asChild` — Base UI utilise le pattern
  `render={<Link .../>}`. Corrigé, plus aucune autre occurrence dans le
  code.
- `bun run build`, `bunx tsc --noEmit`, `bun run lint` : tous verts.
- **Limitation d'environnement rencontrée** : tentative de vérification
  bout-en-bout dans un vrai navigateur (Playwright + Chromium headless)
  infructueuse — le transport par pipe par défaut de Playwright ne
  survit pas au sandbox de cette session (confirmé indépendant du code
  applicatif : le même binaire Chromium lancé directement au shell
  fonctionne et répond correctement sur le port CDP ; spawné depuis un
  script Bun via `child_process.spawn`, il est tué par SIGKILL en moins
  d'une seconde, y compris en connectant Playwright via `connectOverCDP`
  plutôt que son lancement interne par pipe). Deux comptes de test
  jetables créés et supprimés proprement pendant l'investigation (aucune
  manifestation de test n'a été créée, confirmé par requête SQL). Le
  clic-par-clic réel dans un navigateur par Xavier reste recommandé avant
  de considérer la Phase 2 comme définitivement validée en conditions
  réelles.

## 2026-07-01 — Amorçage du projet

- Cadrage initial avec Xavier : plateforme de partage de bénévoles pour un
  groupement d'associations, avec 4 interfaces (super admin, admin de
  manifestation, landing page publique, espace bénévole) + moteur de
  points + newsletter.
- Exploration du repo Economat FDV
  (`/Users/xaviertarin/myCloud/TECHNIQUE/Economat FDV`) pour en extraire le
  modèle de shifts/staff. Aucune gamification/points trouvée côté Economat
  FDV — confirmé par grep, fonctionnalité entièrement nouvelle ici.
- Décisions actées avec Xavier : stack Next.js + Supabase, un seul projet
  Supabase avec RLS par manifestation (pas un projet par manifestation),
  repart de zéro (pas de fork), Resend pour l'emailing.
- Recherche 2026 sur les fournisseurs newsletter (Resend vs Brevo vs
  Loops) — Resend retenu (voir `architecture.md` pour les sources).
- Création de `CLAUDE.md` (adapté depuis le contrat du projet MyShift,
  simplifié à l'échelle de ce projet) et du dossier `doc/`
  (architecture, data-model, roadmap, changelog).
- Statut : conception uniquement, aucun code applicatif, aucun projet
  Supabase provisionné.
