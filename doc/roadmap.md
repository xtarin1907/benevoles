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
- [x] **Confirmé par Xavier en conditions réelles** : la manifestation
      "Fête des Vendanges de Lutry" a été créée via `/admin/manifestations/new`
      par son propre compte super_admin — le clic-par-clic complet
      fonctionne (le blocage Playwright/Chromium headless mentionné plus
      haut était une limitation d'environnement de session, pas un bug
      applicatif). Le manque de page pour le lien de récupération de mot
      de passe (`/auth/callback`, `/auth/confirm`, `/update-password`) a
      été trouvé et corrigé au passage.

**Phase 2 terminée.**

### Phase 3 — Admin de manifestation (terminée le 2026-07-01)

Réorganisation d'architecture : les fonctionnalités listées ci-dessous
sont accessibles aux **manifestation_admins**, pas seulement au
super_admin — elles vivent donc sous `/manage/[id]/*` (garde-fou
`requireManifestationAccess()`, super_admin OU admin de cette
manifestation précise), distinct de `/admin/*` (super_admin uniquement).
L'ancienne page `/admin/manifestations/[id]` a été retirée ; le
formulaire de branding qu'elle contenait a été déplacé vers `/manage/[id]`.
L'invitation/retrait d'admins reste réservée au super_admin (RLS : seul
un rôle `owner` ou super_admin peut écrire `manifestation_admins`, et
aucun flux ne crée d'`owner` pour l'instant).

- [x] Branding manifestation (nom, description, logo en URL — pas
      d'upload de fichier, YAGNI pour l'instant —, couleur, dates début/fin,
      mode d'inscription aux shifts, publication) — `/manage/[id]`.
- [x] CRUD `secteurs` — `/manage/[id]/secteurs`.
- [x] CRUD `shifts` (création avec choix du secteur, capacité, horaires) —
      `/manage/[id]/shifts`.
- [x] Vue des inscriptions à un shift + validation manuelle
      (accepter/refuser) pour les manifestations en mode `admin_approval`
      (Décision #1) — `/manage/[id]/shifts/[shiftId]`. Marquer un shift
      "effectué" et l'attribution de points restent hors scope (Phase 6).
- [x] `bun run build`, `bunx tsc --noEmit`, `bun run lint` : tous verts.
- [x] **Vérifié bout-en-bout en conditions réelles**, sans navigateur :
      Chromium headless reste bloqué dans cet environnement de session
      (cf. Phase 2), mais les Server Actions de Next.js supportent le
      POST natif de formulaire (progressive enhancement) — reproduit à la
      main via `curl` en répliquant l'encodage des champs cachés
      `$ACTION_*` (visibles dans le HTML rendu). A permis de vérifier
      réellement, avec la vraie base Postgres et RLS active : connexion,
      création d'une manifestation, création d'un secteur, création d'un
      shift, et acceptation d'une inscription (statut passé de `applied`
      à `confirmed`, vérifié en base). Toutes les données de test
      (manifestation, secteur, shift, 2 comptes jetables) nettoyées après
      coup — vérifié par requête SQL (0 résidu).

### Phase 4 — Landing page publique (terminée le 2026-07-01)

- [x] `/` remplace la page par défaut `create-next-app` : liste des
      manifestations publiées (`is_published = true`), triées par
      `start_date`. **Calendrier consolidé v1 = liste chronologique**, pas
      une grille calendrier — suffit pour "voir ce qui arrive et quand" ;
      un vrai widget calendrier est différé tant qu'aucun besoin réel ne
      le justifie (YAGNI).
- [x] Point d'entrée d'engagement : bouton "S'engager" par manifestation.
      Visiteur non connecté → lien vers `/signup?next=/` ; le paramètre
      `next` (validé côté serveur contre l'open-redirect — seuls les
      chemins relatifs commençant par `/` sont acceptés) traverse
      `/signup` → `/login` → destination finale après connexion.
      Bénévole connecté → server action `engageWithManifestation()`,
      upsert dans `manifestation_engagements` (idempotent — recliquer
      n'est pas une erreur). Déjà engagé → badge "Engagé" à la place du
      bouton.
- [x] `bun run build`, `bunx tsc --noEmit`, `bun run lint` : tous verts.
- [x] **Vérifié bout-en-bout** (même technique curl que Phase 3) : sur la
      vraie manifestation "Fête des Vendanges de Lutry" créée par
      Xavier — bouton visible pour un visiteur anonyme, connexion d'un
      bénévole de test, clic sur "S'engager", ligne créée dans
      `manifestation_engagements` (vérifié en base), badge "Engagé"
      affiché ensuite à la place du bouton. Compte de test nettoyé après
      coup (0 résidu vérifié par SQL).

### Phase 5 — Espace bénévole (terminée le 2026-07-01)

Prérequis manquant découvert en démarrant cette phase : aucune UI ne
permettait à un bénévole de s'inscrire à un shift (Phase 3 n'avait
construit que le côté admin — accepter/refuser des inscriptions
existantes). Ajouté au passage : page publique `/manifestations/[id]`
(liste des shifts + bouton "S'inscrire") et la fonction Postgres
`create_shift_signup()` explicitement différée depuis le scaffold Phase 1
(voir `data-model.md`).

- [x] `create_shift_signup(_shift_id)` — fonction `SECURITY DEFINER`,
      `FOR UPDATE` sur la ligne `shifts` pour sérialiser les inscriptions
      concurrentes sur un même shift (évite la sur-réservation). Statut
      initial selon `shift_signup_mode` (`confirmed` direct si
      `auto_confirm`, `applied` si `admin_approval`). N'écrit **pas**
      dans `points_ledger` — l'attribution de points reste Phase 6.
      Exposée via RPC à `authenticated` uniquement (`GRANT`/`REVOKE`
      explicites — le `GRANT ... TO authenticated` seul ne suffit pas,
      Postgres accorde `EXECUTE` à `PUBLIC` par défaut à la création,
      corrigé dans une migration de suivi).
- [x] `/manifestations/[id]` — page publique : shifts de la manifestation,
      statut de ma propre inscription si connecté, bouton "S'inscrire"
      sinon. **v1 simplification assumée** : n'affiche pas "X places
      restantes" (nécessiterait un agrégat cross-bénévoles que la RLS
      actuelle n'autorise pas en lecture publique) — la capacité reste
      appliquée côté serveur (erreur "shift is full" si complet), juste
      pas affichée à l'avance. Revisiter seulement si demandé.
- [x] `/dashboard` restructuré avec layout + navigation : Profil (existant),
      **Mes engagements** (`/dashboard/engagements` — liste + retrait/
      réactivation), **Mes inscriptions** (`/dashboard/signups` — par
      manifestation/shift, statut), **Mes points** (`/dashboard/points`
      — total + historique `points_ledger`, vide pour l'instant car
      aucun point n'est encore attribué, attendu jusqu'à la Phase 6).
- [x] `bun run build`, `bunx tsc --noEmit`, `bun run lint` : tous verts.
- [x] **Vérifié bout-en-bout** (technique curl) avec une manifestation de
      test dédiée (capacité 1, mode `auto_confirm`) : bénévole A
      s'inscrit → statut `confirmed` immédiat (vérifié en base) ;
      bénévole B tente de s'inscrire au même shift déjà complet → rejeté
      avec `shift is full`, aucune ligne créée (vérifié en base) ;
      retrait d'engagement testé (`interested` → `withdrawn`, vérifié en
      base) ; pages `/dashboard/signups` et `/dashboard/points` vérifiées
      affichées correctement. Données de test nettoyées, 0 résidu
      (vérifié par SQL).

### Phase 6 — Moteur de points (terminée le 2026-07-01)

- [x] `award_points_on_signup_status_change()` — trigger `AFTER INSERT OR
      UPDATE OF status ON shift_signups`, plutôt que de la logique
      applicative répartie sur chaque endroit qui peut changer un statut
      (`create_shift_signup()` pour l'auto-confirmation, l'action admin
      "Accepter", et la nouvelle action "Marquer effectué") : un trigger
      est la source de vérité unique, impossible à contourner si un futur
      point d'entrée oublie d'attribuer les points. Valeurs lues depuis
      `platform_settings` (Décision #3, barème fixe plateforme).
  - Points "inscription" attribués quand un `shift_signups` atteint
    `confirmed` (immédiat en mode `auto_confirm`, ou au moment où un admin
    accepte une inscription `applied` en mode `admin_approval`) — **pas**
    au moment de `applied`, pour éviter d'avoir à annuler l'écriture si
    l'admin refuse ensuite (`points_ledger` est en écriture seule par
    conception, cf. `data-model.md`).
  - Points "shift effectué" attribués quand un `shift_signups` atteint
    `completed` — nouvelle action admin "Marquer effectué" ajoutée sur
    `/manage/[id]/shifts/[shiftId]` pour les inscriptions `confirmed`.
  - Garde d'idempotence (`NOT EXISTS`) : chaque type d'événement n'est
    attribué qu'une fois par inscription.
- [x] Affichage du total + historique côté bénévole — déjà en place
  depuis la Phase 5 (`/dashboard/points`), commence maintenant à afficher
  de vraies données.
- [x] Barème paramétrable par manifestation : toujours reporté sciemment
  (YAGNI, cf. Décision #3) — aucune manifestation ne l'a demandé.
- [x] Même oubli de sécurité qu'aux Phases 1 et 5 détecté et corrigé
  immédiatement par `get_advisors` : `GRANT EXECUTE ... TO authenticated`
  seul ne retire pas le `GRANT` par défaut à `PUBLIC` de Postgres — la
  fonction du trigger n'a strictement besoin d'aucun grant (jamais
  appelée hors contexte trigger), corrigée par `REVOKE ... FROM PUBLIC,
  anon, authenticated`.
- [x] `bun run build`, `bunx tsc --noEmit`, `bun run lint` : tous verts.
- [x] **Vérifié bout-en-bout** (technique curl) avec une manifestation de
      test dédiée en mode `admin_approval` : inscription bénévole → statut
      `applied`, 0 point (correct, pas encore confirmé) ; admin accepte →
      5 points "inscription" attribués (valeur par défaut de
      `platform_settings`) ; admin marque "effectué" → 20 points
      supplémentaires ; total 25 vérifié sur `/dashboard/points` avec
      l'historique complet. Données de test nettoyées (manifestation +
      2 comptes), 0 résidu vérifié par SQL — y compris vérification que
      `points_ledger` n'a pas de ligne orpheline après suppression des
      comptes de test (cascade `ON DELETE CASCADE` sur `volunteer_id`).

### Phase 7 — Newsletter (terminée le 2026-07-01, code — reste un point non-code avant la prod)

- [x] **Formalisation du consentement (Décision #5)** — `profiles.newsletter_consent`
      (opt-in, `false` par défaut) + `newsletter_consent_at` (audit, jamais
      écrit directement par l'utilisateur, uniquement par un trigger).
      Case à cocher non cochée par défaut sur `/signup`, modifiable à tout
      moment sur `/dashboard`. Bug trouvé par `get_advisors` juste après
      application : la nouvelle fonction trigger manquait `SET search_path
      = public`, corrigé immédiatement.
- [x] **Déviation actée par rapport au plan initial (`architecture.md`)** :
      pas d'intégration Resend Audiences/Broadcasts — envoi direct par lot
      (`resend.batch.send()`, ≤100 emails/appel, un `to` par destinataire
      pour ne pas exposer les adresses entre elles) calculé à la volée
      depuis notre propre base à chaque envoi. Justification : Audiences
      demanderait de synchroniser une deuxième liste de contacts en plus
      de notre base (déjà source de vérité pour consentement + engagement)
      pour le même résultat fonctionnel — complexité non justifiée à cette
      échelle.
- [x] UI de déclenchement d'envoi sur `/manage/[id]/newsletter` — tout
      admin de manifestation peut cibler `'all_platform'` ou
      `'manifestation_engaged'` (Décision #2, pas de file d'approbation).
      Nouvelle policy RLS `profiles` : tout manifestation_admin peut lire
      tous les profils (nécessaire pour construire la liste plateforme
      entière) — conséquence directe et déjà acceptée de la Décision #2,
      pas un nouveau risque.
- [x] Le filtre `newsletter_consent = true` s'applique **toujours**, quel
      que soit le scope choisi — un admin ne peut jamais contourner le
      consentement, seulement choisir le périmètre (sa manifestation vs.
      toute la plateforme) parmi les bénévoles ayant déjà consenti.
- [x] `bun run build`, `bunx tsc --noEmit`, `bun run lint` : tous verts.
- [x] **Vérifié bout-en-bout** (technique curl) avec un admin non-super :
      inscription réelle testée d'abord via le vrai formulaire `/signup`
      (le `signUp()` public de Supabase valide apparemment le domaine
      email — `@example.com`/domaines fictifs rejetés, contrairement à
      `admin.createUser()` — pas un bug applicatif, juste une contrainte
      de test contournée) ; logique du trigger vérifiée via l'API admin :
      consentement `true`/`false` correctement reflété avec/sans horodatage ;
      opt-out puis ré-opt-in testés depuis `/dashboard` ; envoi newsletter
      scope `manifestation_engaged` — liste correctement limitée au seul
      bénévole consentant parmi 2 engagés ; scope `all_platform` par un
      admin **non-super** — confirme que la nouvelle policy RLS fonctionne
      comme prévu. Les deux envois s'arrêtent proprement sur "RESEND_API_KEY
      manquant" (clé non fournie — attendu, cf. décision avec Xavier),
      sans écriture prématurée dans `newsletter_sends` (vérifié en base).
      Données de test nettoyées, 0 résidu vérifié par SQL.
- [ ] **Reste à faire avant mise en prod réelle** (non-négociable
      CLAUDE.md, hors scope code) : Xavier doit fournir `RESEND_API_KEY`
      (+ éventuellement `RESEND_FROM_EMAIL` une fois un domaine d'envoi
      vérifié dans Resend) dans `.env.local`, et valider légalement le
      texte de consentement affiché (actuellement un texte générique,
      cf. décision prise avec Xavier) avant d'activer l'envoi de
      newsletters à de vrais bénévoles.

### Phase 8 — Mobile (différé)

Pas de version mobile tant que le web n'a pas de signal d'usage réel.
Precedent technique disponible si besoin (FDV-Mobile en Expo/React
Native connecté au même backend Supabase) — à réévaluer seulement si
Xavier constate un besoin réel côté bénévoles (pas anticipé maintenant).
