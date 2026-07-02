# Changelog — Bénévoles+

Journal chronologique des décisions actées et évolutions du projet
(plus récent en premier).

## 2026-07-02 (suite) — Migration Next.js → Vite + React Router

Demande de Xavier : héberger sur Infomaniak à l'identique de ses autres
sites (`To-do`, `wyzio-app-support`) — dossier `dist/` statique, upload
manuel, `.htaccess`, sans process Node. Décision et compromis (perte du
SEO SSR de la landing, conservé côté données temps réel) actés avec
Xavier — voir `roadmap.md` décision ouverte #6 et `architecture.md`
§Stack technique.

- Réécriture complète : 14 Server Actions → fonctions client appelant
  Supabase directement (RLS reste la frontière de sécurité réelle,
  `data-model.md`), 23 pages/layouts Server Components → composants
  client (`useEffect`/state), routes dynamiques `[id]` → `:id` React
  Router, `src/proxy.ts` (middleware) supprimé (remplacé par
  `AuthContext` + `supabase-js` qui rafraîchit la session nativement
  côté navigateur).
- **2 Supabase Edge Functions créées** (`supabase/functions/invite-
  manifestation-admin`, `supabase/functions/send-newsletter`) — seul
  endroit où `SUPABASE_SECRET_KEY` peut encore vivre, ce fichier
  (`src/lib/supabase/admin.ts`) ne doit jamais atteindre le bundle
  client d'une SPA. Chaque fonction revérifie elle-même l'autorisation
  de l'appelant (JWT → `platform_role`/`manifestation_admins`, même
  logique que l'ancien `guards.ts`) avant d'utiliser la clé service
  role. Déployées et testées : 4 tests d'autorisation ajoutés
  (`src/__tests__/edge-functions-auth.test.ts`, même pattern que
  `rls-isolation.test.ts`) — confirment qu'un admin non-super_admin et
  un utilisateur sans droit sont bien rejetés (403), et qu'un
  manifestation_admin légitime passe le contrôle. Les 6 tests RLS
  existants passent toujours sans changement.
- Variables d'env : `NEXT_PUBLIC_*` → `VITE_*` (convention Vite).
  `RESEND_API_KEY`/`RESEND_FROM_EMAIL` sortent du `.env` frontend,
  deviennent des secrets Supabase (`supabase secrets set`) consommés
  uniquement par `send-newsletter`.
- **Erreur commise et corrigée en session** : suppression accidentelle
  de `src/app/globals.css` (via `rm -rf src/app` pour nettoyer les
  fichiers Next.js obsolètes) sans vérifier au préalable qu'il portait
  des modifications non commitées — celles de la palette ambre/or
  documentée juste en dessous. Irrécupérable via git (vérifié :
  `git diff`, `git fsck --dangling`, historique local VS Code — aucun
  n'avait cette version intermédiaire). Reconstruit du mieux possible à
  partir (a) de lectures faites plus tôt dans la même session avant la
  suppression (`--background`/`--primary`/etc., 9 propriétés récupérées
  exactement) et (b) des valeurs exactes citées dans l'entrée de
  changelog ci-dessous (`--primary` clair/sombre, compilé
  `#dc7200`/`#f59300`, neutres teinte ~75). Les classes utilitaires
  `.text-gradient` et `.animate-pulse-subtle` ont dû être
  **réécrites de zéro** (aucune trace de leur implémentation exacte) —
  best-effort basé sur leur description ("dégradé sur le titre du
  hero", "halo doux sur le bouton principal"), à valider visuellement.
  Rien d'autre n'a été perdu : toutes les pages/actions ont été lues
  depuis le disque (état réel non commité, y compris la fonctionnalité
  localisation des shifts) avant toute suppression de fichier.

## 2026-07-02 — Palette ambre/or, landing orientée bénévoles, localisation des shifts

Trois demandes de Xavier : (1) rendu/layout inspiré du projet local
"Maximus discotecus" (le domaine maximusdiscotecus.ch déployé s'est avéré
être un outil de partage de matériel sans rapport, pas une vitrine
nightlife — vérifié par `curl` et par inspection du bundle JS compilé ;
le vrai signal de design a été trouvé dans le dossier local du projet
via un agent Explore) ; (2) landing plus orientée bénévoles, pour donner
envie de s'engager ; (3) logo des organisations (déjà en place, voir
plus bas) ; (4) localisation des shifts + itinéraire Google Maps, sur le
modèle du projet `atico-pollensa-guide`.

- **Reversal explicite de palette, décidé par Xavier** : la couleur
  neutre bleu-ardoise choisie la veille (pour ne pas rivaliser avec le
  `color_hex` par manifestation) est abandonnée au profit d'un ambre/or
  chaud, sur demande explicite de Xavier après qu'on lui a signalé la
  contradiction avec la décision de la veille (`src/app/globals.css`) —
  `--primary` (light `oklch(0.66 0.18 58)`, dark `oklch(0.75 0.17 65)`,
  texte de bouton **sombre** pas blanc, l'ambre à cette luminosité n'a pas
  assez de contraste avec du texte quasi-blanc), `--ring`/`--sidebar-*`
  alignés, neutres (`background`/`card`/`muted`/`border`) légèrement
  réchauffés (chroma faible, teinte ~75) pour ne pas jurer avec l'accent.
  Risque de collision avec certains `color_hex` de manifestation accepté
  en connaissance de cause par Xavier (même risque écarté pour le rouge
  FDV la veille, assumé cette fois pour l'ambre).
- **Micro-interactions façon Maximus** — `.text-gradient` (dégradé sur
  le mot accentué du titre du hero), `.animate-pulse-subtle` (halo doux
  sur le bouton principal, pas l'`animate-pulse` Tailwind par défaut qui
  évoque un skeleton de chargement), header `sticky` + `backdrop-blur`
  (glassmorphism, propagé partout via `SiteHeader`), hover
  scale/rotate sur l'icône du wordmark.
- **Landing (`src/app/page.tsx`) réorientée bénéfices** — hero recopié
  avec un titre bénéfice ("Vis les manifestations de l'intérieur"),
  nouvelle section "avantages" (3 cartes : points, communauté, flexibilité
  des shifts) avant la liste des manifestations, hover-lift +
  fade-in en cascade sur les cartes (`tw-animate-css`, déjà importé,
  aucune nouvelle dépendance).
- **Logo des organisations** — déjà en place depuis la Phase 3
  (`manifestations.logo_url`, formulaire `/manage/[id]`) et déjà affiché
  via `ManifestationAvatar` depuis la passe de la veille. **Aucun
  travail nécessaire**, vérifié avant de coder quoi que ce soit.
- **Localisation des shifts + itinéraire Google Maps** — pattern repris
  à l'identique du projet `atico-pollensa-guide` (pas d'API Google Maps,
  pas de géocodage) : `shifts.location_name` (texte libre) +
  `shifts.location_maps_url` (lien de partage Google Maps collé par
  l'admin), migration `20260702080205_add_shift_location`. Champs
  ajoutés au formulaire de création (`/manage/[id]/shifts`). **Gap
  fonctionnel corrigé au passage** : aucune UI d'édition n'existait pour
  un shift déjà créé (seulement création/suppression) — une adresse ou
  un lien Maps erroné aurait été corrigible uniquement en supprimant le
  shift, avec perte des inscriptions déjà faites. Ajout ciblé d'un petit
  formulaire "Lieu" sur `/manage/[id]/shifts/[shiftId]` (nouvelle action
  `updateShiftLocation`), sans étendre l'édition aux autres champs du
  shift (nom/horaires/capacité), hors périmètre de cette demande. Affichage
  public sur `/manifestations/[id]` : lieu en texte (icône `MapPin`) +
  bouton "Itinéraire" (icône `ExternalLink`, lien `target="_blank"`) si
  un lien Maps est renseigné.
- `get_advisors` (sécurité) lancé après la migration : aucune nouvelle
  alerte, les deux warnings existants (`create_shift_signup` RPC
  intentionnellement exposée, protection mot de passe compromis
  désactivée) sont antérieurs et sans rapport.
- **Vérifié bout-en-bout** (technique curl habituelle, avec un vrai
  compte admin et une vraie session) : connexion, création d'un shift
  avec lieu + lien Maps (vérifié en base), modification du lieu via le
  nouveau formulaire (vérifié en base), affichage correct du lieu et du
  bouton Itinéraire sur la page publique. Manifestation de test + secteur
  + shift + compte admin nettoyés après coup, 0 résidu vérifié par SQL
  (cascade `ON DELETE` sur `manifestation_id`).
- Palette : CSS compilé vérifié via `curl` (`--primary: #dc7200` clair /
  `#f59300` sombre). Rendu visuel réel non vérifiable dans cet
  environnement (navigateur headless non fonctionnel, déjà confirmé à
  plusieurs reprises) — **relecture manuelle de Xavier recommandée**,
  en particulier pour juger si l'ambre choisi convient une fois vu en
  vrai, et s'il n'entre pas en collision avec une couleur de
  manifestation existante.

## 2026-07-01 (suite) — Refonte visuelle (landing + identité graphique)

Demande de Xavier : rendu graphique nettement plus soigné en s'inspirant de
l'extranet Fête des Vendanges (Economat FDV), landing page en priorité,
icônes/symboles. Recherche (2 agents Explore sur le design system FDV) +
3 questions de cadrage tranchées par Xavier (options "Recommandé") :
couleur de marque neutre (pas le rouge FDV, pour ne pas rivaliser avec le
`color_hex` propre à chaque manifestation), pas de logo réel pour l'instant
(wordmark texte), landing en "hero + liste adaptée" (hero façon FDV en
haut, liste de manifestations scalable en dessous — pas la grille fixe à
3 cartes de FDV, qui ne conviendrait pas à un nombre croissant de
manifestations).

- **Constat** : le thème shadcn était **totalement achromatique**
  (`src/app/globals.css`, chaque token `oklch(x 0 0)`, y compris
  `--primary` quasi noir) — aucune couleur nulle part sauf le `color_hex`
  par manifestation et le rouge destructive. C'était la cause principale
  du rendu plat, pas un manque d'icônes.
- **Couleur primaire** — `--primary`/`--ring`/`--sidebar-*` recolorés en
  bleu-ardoise sourd (`oklch(0.47 0.14 264)` clair / `oklch(0.72 0.15 264)`
  sombre) au lieu du gris pur. "Neutre" ne veut pas dire chroma nulle : une
  teinte sourde donne du caractère sans concurrencer les couleurs de
  manifestation. Le reste du thème (secondary/accent/muted) reste gris
  neutre — ce sont des fonds d'état, pas des accents de marque.
- **Fond de page tamisé** — `bg-muted/30` sur `<body>` (`src/app/layout.tsx`)
  pour que les `Card` ressortent, `SiteHeader` gardant son propre
  `bg-background` opaque (pas de conflit).
- **`src/lib/color.ts`** (nouveau) — `getContrastColor(hex)`, calcul de
  luminance pour choisir texte noir/blanc lisible sur un fond de couleur
  arbitraire, porté de l'approche FDV (`ShiftGridPublic.tsx`).
- **`src/components/manifestation-avatar.tsx`** (nouveau) — cercle coloré
  (logo si `logo_url` renseigné, sinon initiale sur fond `color_hex` avec
  texte contrasté), réutilisé sur la landing, `/manage`, et l'en-tête de
  `/manifestations/[id]` (remplace un `<h1 style={{color: ...}}>` qui
  restait peu lisible sur les couleurs claires).
- **`SiteHeader`** (`src/components/site-header.tsx`) — icône `HeartHandshake`
  ajoutée devant le wordmark texte "Bénévoles+" (pas de logo réel pour
  l'instant, décision actée) ; propagé sur toutes les pages qui utilisent
  ce header (landing, `/manifestations/[id]`, `/dashboard`, `/admin`,
  `/manage`).
- **Landing (`src/app/page.tsx`)** — nouvelle section hero centrée
  (icône `HeartHandshake` dans un cercle `bg-primary/10`, titre, sous-titre,
  boutons connexion/inscription en pleine largeur au lieu de liens
  soulignés discrets) inspirée d'`Index.tsx` de FDV. Liste de
  manifestations en dessous inchangée dans sa structure (scalable), avatar
  ajouté à chaque carte.
- **Idée abandonnée** : compteur "X manifestations · Y bénévoles" sur la
  landing — `profiles` n'a aucun accès anonyme (RLS + pas de grant `anon`),
  l'ajouter demanderait une fonction RPC `SECURITY DEFINER` dédiée, hors
  périmètre d'une passe purement visuelle.
- **Vérification** : `tsc --noEmit`, `lint`, `build` verts. Serveur `dev`
  lancé, structure HTML vérifiée via `curl` sur `/` et `/manifestations/[id]`
  (hero présent, avatar rendu avec la vraie couleur d'une manifestation
  existante `#ff2600`, CSS compilé confirmé avec les nouvelles valeurs
  `--primary` `#3155a8`/`#75a2ff`). `/manage` non vérifié par `curl` (auth
  requise) mais utilise le même composant déjà vérifié ailleurs.
  Automatisation navigateur non retentée (limitation déjà confirmée deux
  fois cette session) — **rendu visuel final non vérifié en conditions
  réelles, relecture manuelle par Xavier recommandée**.

## 2026-07-01 (suite) — Amélioration de l'interface utilisateur

Demande large de Xavier ("améliore l'interface"), clarifiée en 4 axes :
navigation/structure, polish visuel, retours utilisateur (toasts),
responsive mobile. Un audit préalable (agent Explore) a trouvé un vrai
manque fonctionnel avant même de parler de style : **aucune fonctionnalité
de déconnexion n'existait**.

- **Déconnexion ajoutée** (`src/lib/auth/actions.ts` `signOut()`) —
  manque critique trouvé par l'audit, pas seulement esthétique.
- **`SiteHeader`** (`src/components/site-header.tsx`) — header unifié
  utilisé par les layouts `/dashboard`, `/admin`, `/manage` et les pages
  publiques (`/`, `/manifestations/[id]`) : nom/logo, navigation avec état
  actif (`usePathname`), menu utilisateur (avatar + email + déconnexion).
  Navigation croisée ajoutée entre sections selon le rôle (un super_admin
  voit un lien "Admin" depuis `/dashboard` et "Gérer" depuis `/admin` ;
  un manifestation_admin voit "Gérer" depuis `/dashboard`).
- **Toasts** (`sonner`, via shadcn) — `FlashToast` (`src/components/flash-toast.tsx`)
  remplace les messages `?message=`/`?error=` affichés en texte brut sur
  presque toutes les pages, sans réécrire les Server Actions existantes
  (qui restent de simples redirects — pattern déjà utilisé partout et
  compatible progressive enhancement).
- **Confirmations avant suppression** (`alert-dialog` shadcn) —
  `ConfirmSubmitButton` (`src/components/confirm-submit-button.tsx`)
  appliqué aux actions destructives (suppression secteur/shift, retrait
  d'admin). Détail technique retenu : le bouton de confirmation soumet le
  formulaire via l'attribut HTML `form={id}` plutôt que l'imbrication DOM
  classique, car `AlertDialogContent` est rendu dans un portail — un
  bouton `type="submit"` imbriqué normalement dans le `<form>` ne serait
  plus associé à lui une fois téléporté par le portail.
- **Responsive** — tables enveloppées dans `overflow-x-auto`, paddings en
  `p-4 sm:p-8`, formulaires en colonne qui passent en ligne à partir de
  `sm:`.
- **Polish** — icônes `lucide-react` (installé depuis la Phase 1 scaffold
  mais jamais utilisé jusqu'ici), couleurs de statut nuancées par badge
  (au lieu de deux variantes seulement), corrections de détail trouvées au
  passage : le `<head>` gardait encore le titre par défaut
  "Create Next App" (jamais mis à jour depuis le scaffold Phase 1) et
  `lang="en"` sur une app entièrement en français — corrigés. `next-themes`
  ajouté (requis par le composant `Toaster` shadcn) — support du mode
  sombre obtenu en bonus, pas demandé mais gratuit une fois le provider
  en place.
- **Limitation d'environnement confirmée à nouveau** : la vérification
  visuelle complète (rendu réel, interactions du menu déroulant et de la
  boîte de dialogue de confirmation) n'a pas pu être automatisée dans
  cette session — cette fois le blocage n'est plus le lancement du
  processus Chromium (résolu aux Phases 2/3 en le spawnant directement
  via le shell) mais la connexion WebSocket elle-même vers le port CDP,
  qui expire systématiquement même en local (`127.0.0.1`). Vérifié à la
  place : build/typecheck/lint verts, structure HTML correcte via `curl`
  (header présent, icônes SVG présentes, classes responsive émises,
  formulaire caché de suppression avec le bon `id`), et lecture du code
  source des composants shadcn (`Button`, `AlertDialogAction`,
  `DropdownMenuItem`) pour confirmer que les patterns `render`/`form`
  utilisés correspondent à leur implémentation réelle. L'interaction
  effective du menu déroulant et de la boîte de dialogue (JS côté client)
  reste **non vérifiée en conditions réelles** — recommandé qu'un humain
  clique dessus avant de considérer ce chantier définitivement clos.
- Données de test créées et nettoyées pendant la vérification (comptes +
  1 manifestation), 0 résidu vérifié par SQL.

## 2026-07-01 (suite) — Phase 7 : newsletter

- Décisions tranchées avec Xavier avant de coder : construire toute
  l'intégration maintenant, clé Resend fournie plus tard (même schéma que
  `SUPABASE_SECRET_KEY` à la Phase 1) ; texte de consentement générique
  pour l'instant, wording légal définitif à valider par Xavier séparément.
- Consentement newsletter formalisé (Décision #5, non-négociable
  CLAUDE.md) : `profiles.newsletter_consent` (opt-in, faux par défaut) +
  `newsletter_consent_at` (audit, écrit uniquement par trigger). Case à
  cocher non cochée sur `/signup`, modifiable sur `/dashboard`.
- Bug trouvé par `get_advisors` juste après la migration : la fonction du
  nouveau trigger manquait `SET search_path = public` — corrigé
  immédiatement (même classe de finding que les `SECURITY DEFINER`
  précédents, mais cette fois sur le search_path, pas sur l'exposition
  RPC).
- **Déviation actée par rapport au plan initial** (`architecture.md`
  prévoyait Resend Audiences/Broadcasts) : envoi direct par lot
  (`resend.batch.send()`) calculé à la volée depuis notre base à chaque
  envoi, plutôt que de synchroniser une deuxième liste de contacts dans
  Resend pour le même résultat fonctionnel.
- `/manage/[id]/newsletter` : tout admin de manifestation peut envoyer à
  `'manifestation_engaged'` ou `'all_platform'` (Décision #2). Nouvelle
  policy RLS sur `profiles` permettant à tout manifestation_admin de lire
  tous les profils, nécessaire pour construire la liste plateforme
  entière — conséquence directe et déjà acceptée de la Décision #2.
- Vérifié bout-en-bout avec un admin **non-super** (pas seulement
  super_admin, pour prouver que la Décision #2 fonctionne vraiment pour
  n'importe quel admin) : signup réel testé via `/signup` (le `signUp()`
  public de Supabase rejette les domaines email fictifs comme
  `@example.com`, contrairement à `admin.createUser()` — contrainte de
  test, pas un bug applicatif) ; trigger de consentement vérifié via
  l'API admin ; opt-out/opt-in testés depuis `/dashboard` ; construction
  des deux listes de destinataires (scopée + plateforme entière)
  vérifiée correcte via le filtre de consentement ; les deux envois
  s'arrêtent proprement sur "RESEND_API_KEY manquant" (attendu), sans
  écriture prématurée dans `newsletter_sends`. Données de test nettoyées,
  0 résidu vérifié par SQL.
- **Reste avant mise en prod réelle** (hors scope code, non-négociable
  CLAUDE.md) : Xavier doit fournir `RESEND_API_KEY` et valider légalement
  le texte de consentement.

## 2026-07-01 (suite) — Phase 6 : moteur de points

- `award_points_on_signup_status_change()` : trigger sur `shift_signups`
  (pas de logique applicative éparpillée) — attribue les points
  "inscription" au passage à `confirmed`, "shift effectué" au passage à
  `completed`, valeurs lues depuis `platform_settings`, garde
  d'idempotence par type d'événement.
- Nouvelle action admin "Marquer effectué" sur
  `/manage/[id]/shifts/[shiftId]` pour les inscriptions `confirmed`.
- Même oubli qu'aux Phases 1 et 5 (`GRANT ... TO authenticated` ne retire
  pas le `GRANT` par défaut à `PUBLIC`) détecté par `get_advisors` et
  corrigé immédiatement.
- Vérifié bout-en-bout : inscription en mode `admin_approval` → 0 point
  tant qu'`applied` ; acceptation admin → 5 points ; "Marquer effectué" →
  20 points de plus ; total 25 vérifié sur `/dashboard/points`. Données de
  test nettoyées, 0 résidu (y compris vérification qu'aucune ligne
  `points_ledger` orpheline ne subsiste après suppression des comptes de
  test).

## 2026-07-01 (suite) — Phase 5 : espace bénévole

- Gap découvert en démarrant la phase : aucune UI de signup bénévole
  n'existait (Phase 3 n'avait que le côté admin). Ajout de
  `create_shift_signup()` (fonction Postgres, différée explicitement
  depuis Phase 1) + page publique `/manifestations/[id]`.
- `create_shift_signup()` : `SECURITY DEFINER`, verrouille la ligne
  `shifts` (`FOR UPDATE`) pour sérialiser les inscriptions concurrentes
  et éviter la sur-réservation ; statut initial selon
  `manifestations.shift_signup_mode`. Exposée en RPC à `authenticated`
  seulement — deuxième occurrence du même oubli qu'à la Phase 1
  (`GRANT ... TO authenticated` seul ne retire pas le `GRANT` par défaut
  à `PUBLIC` de Postgres), corrigé par une migration de suivi immédiate.
- `/dashboard` restructuré en layout + 3 nouvelles sous-pages : Mes
  engagements (retrait/réactivation), Mes inscriptions, Mes points
  (vide pour l'instant, l'attribution de points est Phase 6).
- Vérifié bout-en-bout (technique curl de la Phase 3/4) avec une
  manifestation de test dédiée : inscription confirmée immédiatement en
  mode automatique, capacité correctement appliquée (2ème bénévole
  rejeté sur un shift complet, aucune ligne créée), retrait d'engagement
  fonctionnel. Données de test nettoyées, 0 résidu vérifié par SQL.

## 2026-07-01 (suite) — Phase 4 : landing page publique

- `/` remplace la page par défaut de `create-next-app`. Liste des
  manifestations publiées triée par date, bouton "S'engager" par carte.
- Ajout du paramètre `next` (avec garde anti-open-redirect — seuls les
  chemins relatifs sont acceptés) sur `/login` et `/signup`, pour que le
  visiteur anonyme qui clique "S'engager" revienne à `/` après
  connexion/inscription au lieu d'atterrir sur `/dashboard`.
- `engageWithManifestation()` (`src/app/actions.ts`) : upsert idempotent
  dans `manifestation_engagements` (statut `interested`).
- Vérifié bout-en-bout via la même technique curl que la Phase 3, sur la
  vraie manifestation de Xavier : bouton visible en anonyme, engagement
  réel créé pour un compte de test après connexion, badge "Engagé"
  affiché ensuite. Compte de test nettoyé (0 résidu vérifié par SQL).

## 2026-07-01 (suite) — Fix récupération de mot de passe + Phase 3

- **Bug trouvé par Xavier** : le lien d'invitation/récupération de mot de
  passe atterrissait sur `/` (page par défaut Next.js) sans rien pour
  traiter le jeton d'auth. Cause : Supabase (flux implicite par défaut,
  `{{ .ConfirmationURL }}`) redirige vers le Site URL avec le jeton en
  fragment d'URL (`#access_token=...`), invisible côté serveur, et aucune
  page ne le lisait côté client. Corrigé par l'ajout de
  `/auth/callback` (Client Component, lit `window.location.hash`,
  appelle `setSession()`), `/auth/confirm` (Route Handler pour le flux
  alternatif `token_hash` en query params, si les templates email sont
  un jour personnalisés), et `/update-password` (formulaire de nouveau
  mot de passe). Un nouveau lien avec `redirectTo` explicite a été généré
  via `admin.generateLink` (l'envoi d'email a buté sur le rate-limit du
  service mail par défaut de Supabase) et donné directement à Xavier.
- Bug de lint trouvé par `eslint` avant tout run : `react-hooks/set-state-in-effect`
  sur `/auth/callback` (setState synchrone dans un effet pour le cas
  "jeton manquant") — corrigé en redirigeant vers `/login?error=...` au
  lieu d'afficher un état d'erreur local.
- **Phase 3 implémentée** : réorganisation en `/manage/[id]/*`
  (accessible aux manifestation_admins, pas seulement au super_admin),
  garde-fou `requireManifestationAccess()`. Branding déplacé de l'ancien
  `/admin/manifestations/[id]` (retiré) vers `/manage/[id]`. Ajout CRUD
  secteurs, CRUD shifts, vue des inscriptions + accepter/refuser pour les
  manifestations en mode `admin_approval`.
- **Percée méthodologique de vérification** : Chromium headless reste
  bloqué dans cet environnement (cf. Phase 2), mais les Server Actions
  Next.js supportent le POST natif de formulaire (progressive
  enhancement) — reproductible à la main via `curl` en lisant les champs
  cachés `$ACTION_*` du HTML rendu (y compris les actions liées avec
  arguments sérialisés, ex. `$ACTION_1:1=["<manifestation_id>"]`). A
  permis une vérification bout-en-bout réelle (vraie base Postgres, RLS
  active, vrai cookie de session) : login, création manifestation,
  création secteur, création shift, acceptation d'une inscription
  (`applied` → `confirmed`, vérifié en base). Toutes les données de test
  nettoyées après coup (0 résidu vérifié par SQL). Cette technique
  remplace utilement le navigateur headless dans cet environnement —
  à documenter comme méthode de vérification standard si le blocage
  Playwright persiste sur les phases suivantes.
- Confirmé en base : Xavier a lui-même créé "Fête des Vendanges de Lutry"
  via `/admin/manifestations/new` avec son compte super_admin — la
  Phase 2 est donc validée en conditions réelles, pas seulement
  statiquement.

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
