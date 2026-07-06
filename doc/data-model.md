# Modèle de données — Bénévoles Lavaux

Statut : **schéma appliqué et en évolution active** — ce document reflète
l'état réel de la base Supabase (projet `xxmmitlrvzdxrwulyebz`), à tenir à
jour à chaque migration (voir `supabase/migrations/` pour l'historique
exact et `changelog.md` pour le contexte de chaque évolution). Inspiré à
l'origine du schéma d'Economat FDV (`schema_complet.sql`,
`20260601000002_v2_create_staff.sql`) — voir `architecture.md` §"Ce qu'on
reprend" pour la justification de chaque emprunt/écart d'origine ; les
évolutions depuis sont propres à Bénévoles+.

## Tables

### `profiles`

Étend `auth.users`. Un profil = une identité bénévole/admin unique sur
toute la plateforme.

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid (FK `auth.users.id`) | |
| `full_name` | text | |
| `email` | text | dénormalisé depuis `auth.users` pour les jointures/affichage |
| `phone` | text | optionnel |
| `avatar_url` | text | optionnel |
| `platform_role` | enum `'super_admin' \| 'user'` | défaut `'user'` |
| `newsletter_consent` | boolean | défaut `false` — opt-in explicite (CLAUDE.md non-négociable), ajouté Phase 7 |
| `newsletter_consent_at` | timestamptz, nullable | audit — écrit uniquement par un trigger (`set_newsletter_consent_at`), jamais directement par l'utilisateur, ajouté Phase 7 |
| `created_at` | timestamptz | |

### `manifestation_series`

Ajoutée 2026-07-02. Regroupe les éditions annuelles d'un même événement
récurrent (ex. "Fête des Vendanges de Lutry" 2026, 2027...) — chaque
édition reste une ligne `manifestations` complète et indépendante
(secteurs/shifts/admins/engagements/points propres), cette table ne sert
qu'au regroupement (nom de la série, affichage groupé sur la landing).

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `name` | text | |
| `created_at` | timestamptz | |

### `manifestations`

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `name` | text | |
| `slug` | text unique | pour les URLs publiques |
| `description` | text | |
| `logo_url` | text | |
| `color_hex` | text | défaut `#7B2E38` (bordeaux de marque, migration 2026-07-06 ; auparavant `#6366f1` indigo). Pattern repris d'Economat FDV `secteurs.couleur` |
| `start_date` / `end_date` | date | |
| `is_published` | boolean | défaut `false` — contrôle la visibilité sur la landing page publique |
| `series_id` | uuid (FK `manifestation_series.id`, nullable, `ON DELETE SET NULL`) | ajouté 2026-07-02 — rattache une édition à un événement récurrent |
| `edition_year` | int, nullable | ajouté 2026-07-02 |
| `website_url` / `contact_email` | text, nullable | ajoutés 2026-07-02 — affichés dans le popup d'info de la landing |
| `coordinator_name` / `coordinator_email` / `coordinator_phone` | text, nullable | ajoutés 2026-07-02 — responsable des bénévoles courant (peut changer en cours d'année) ; email utilisé par `notify-coordinator`, téléphone réservé aux rappels SMS |
| `staffing_mode` | enum `'shifts' \| 'postes'` | défaut `'shifts'`, ajouté 2026-07-02 — `'postes'` = staffing par quantité sans horaire (voir `shifts.start_at`/`end_at` ci-dessous) |
| `shift_signup_mode` | enum `'auto_confirm' \| 'admin_approval'` | défaut `'auto_confirm'` — décidé le 2026-07-01 : configurable par manifestation, pas global (voir `roadmap.md` Décision #1) |
| `approval_status` | enum `'pending' \| 'approved' \| 'rejected'` | défaut `'approved'` (les lignes existantes, créées par le super_admin, sont pré-approuvées). Créée le 2026-07-02 pour la création en libre-service par un organisateur (`/manage/new`) : toute manifestation insérée par un utilisateur non super_admin démarre `'pending'`/`is_published=false` (policy INSERT dédiée), et un trigger `BEFORE INSERT OR UPDATE` bloque `is_published=true` tant que `approval_status != 'approved'` pour un non-super_admin — même via la policy UPDATE existante des admins de manifestation. Validation faite par le super_admin sur `/admin/manifestations`. |
| `created_by` | uuid (FK `profiles.id`) | |
| `created_at` | timestamptz | |

Deux policies RLS supplémentaires liées à la création en libre-service :
lecture (`SELECT`) par le créateur (`created_by = auth.uid()`) — nécessaire
car un `insert().select()` échoue sous RLS si aucune policy `SELECT` ne
couvre la ligne fraîchement créée, ce qui est le cas d'une manifestation
`pending`/non publiée avant que son créateur soit inséré dans
`manifestation_admins` (bug réel rencontré et corrigé en vérifiant
bout-en-bout, cf. `changelog.md`).

### `manifestation_admins`

Table de jointure — qui administre quelle manifestation.

| Colonne | Type | Note |
| --- | --- | --- |
| `manifestation_id` | uuid (FK) | |
| `user_id` | uuid (FK `profiles.id`) | |
| `role` | enum `'owner' \| 'admin'` | `'owner'` = créateur, `'admin'` = invité |
| `invited_at` | timestamptz | |

Policy RLS supplémentaire (2026-07-02) : le créateur d'une manifestation
peut s'auto-insérer comme `'owner'` — uniquement pour lui-même, uniquement
si aucun admin n'existe encore pour cette manifestation (fonction
`private.can_bootstrap_manifestation_admin`, `SECURITY DEFINER` pour éviter
la récursion RLS puisque la vérification lit `manifestation_admins`
elle-même). Nécessaire car la policy existante ("owner admin peut
inviter/retirer des admins") exige déjà d'être owner — circulaire pour la
toute première ligne d'une manifestation créée en libre-service.

`UNIQUE(manifestation_id, user_id)`.

### `secteurs`

Repris directement du pattern Economat FDV.

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `manifestation_id` | uuid (FK) | contrairement à Economat FDV où `secteurs` était global — ici scopé à la manifestation, cohérent avec l'isolation RLS |
| `name` | text | |
| `description` | text | |
| `color_hex` | text | optionnel, hérite de `manifestations.color_hex` si vide |
| `staffing_mode` | enum `'shifts' \| 'postes'`, nullable | ajouté 2026-07-02 — hérite de `manifestations.staffing_mode` si vide (même pattern que `color_hex`), surcharge fine par secteur |
| `order` | int | |
| `created_at` | timestamptz | |

### `shifts`

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `secteur_id` | uuid (FK) | |
| `manifestation_id` | uuid (FK) | dénormalisé depuis `secteur_id` pour simplifier les policies RLS (évite un join secteurs→manifestations dans chaque policy) — pattern à valider en implémentation, pas une religion |
| `name` | text | |
| `start_at` / `end_at` | timestamptz, nullable | **rendues nullable le 2026-07-02** — un shift sans dates représente un "poste" en mode `staffing_mode = 'postes'` (staffing par quantité, pas d'horaire fixe) : un seul shift de référence par secteur, `capacity` = bénévoles nécessaires, réutilise tel quel `shift_signups`/`create_shift_signup()`/le trigger de points. Tout affichage doit gérer le cas `null` ("Poste ouvert" à la place de l'horaire, tri avec `nullsFirst`). |
| `capacity` | int | nombre de bénévoles requis (= `nb_benevoles_requis` chez Economat FDV) |
| `description` | text | |
| `location_name` | text, nullable | ajouté 2026-07-02 — adresse/nom de lieu en texte libre |
| `location_maps_url` | text, nullable | ajouté 2026-07-02 — lien Google Maps pré-construit collé par l'admin (pattern `atico-pollensa-guide` : pas d'API Google Maps, pas de géocodage) |
| `created_by` | uuid (FK `profiles.id`) | |
| `created_at` | timestamptz | |

### `manifestation_engagements`

Nouveau par rapport à Economat FDV — capture le "je m'engage sur cette
manifestation" avant/indépendamment d'une inscription à un shift précis.
Sert de base à la newsletter scopée par manifestation et à la vue admin
du pool de bénévoles disponibles.

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `manifestation_id` | uuid (FK) | |
| `volunteer_id` | uuid (FK `profiles.id`) | |
| `status` | enum `'interested' \| 'active' \| 'withdrawn'` | |
| `created_at` | timestamptz | |

`UNIQUE(manifestation_id, volunteer_id)`.

### `shift_signups`

Équivalent de `shift_affectations` chez Economat FDV, adapté à un flux
self-service plutôt qu'admin-invite.

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `shift_id` | uuid (FK) | |
| `volunteer_id` | uuid (FK `profiles.id`) | |
| `status` | enum `'applied' \| 'confirmed' \| 'declined' \| 'completed' \| 'no_show' \| 'waitlisted'` | cycle adapté du `statut` Economat FDV (`invite/confirme/refuse/present`). **Résolu 2026-07-01** (`roadmap.md` Décision #1) : le statut initial dépend de `manifestations.shift_signup_mode` — `confirmed` directement si `auto_confirm` (sous réserve de capacité), `applied` si `admin_approval`. Logique portée par une fonction `create_shift_signup()` (Phase 3/5, hors scaffold Phase 1). **`waitlisted` ajouté 2026-07-02** : quand la capacité est atteinte, `create_shift_signup()` insère en réserve plutôt que de rejeter l'inscription. Promotion **manuelle uniquement** (décision Xavier) par un admin sur `/manage/:id/shifts/:shiftId`. Le bénévole peut aussi annuler lui-même son inscription (`applied`/`confirmed`/`waitlisted` → `declined`, self-service, ajouté 2026-07-02) — aucun retrait de points déjà attribués (append-only). |
| `notes` | text | |
| `created_at` | timestamptz | |

`UNIQUE(shift_id, volunteer_id)` — repris à l'identique d'Economat FDV.

### `points_ledger`

Nouveau — aucun équivalent chez Economat FDV (vérifié, pas de
gamification existante à reprendre). Registre en écriture seule
(append-only) plutôt que compteur dénormalisé, pour garder un historique
auditable et pouvoir corriger sans perdre la traçabilité.

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `volunteer_id` | uuid (FK `profiles.id`) | |
| `manifestation_id` | uuid (FK, nullable) | nullable = ajustement plateforme, pas lié à une manifestation |
| `shift_id` | uuid (FK, nullable) | |
| `event_type` | enum `'signup' \| 'shift_completed' \| 'manual_adjustment'` | |
| `points` | int | peut être négatif (correction) |
| `created_by` | uuid (FK `profiles.id`, nullable) | rempli seulement pour `manual_adjustment` |
| `created_at` | timestamptz | |

Total de points d'un bénévole = `SUM(points) WHERE volunteer_id = ...`
— calculé à la volée ou via une vue matérialisée si le volume le justifie
un jour (YAGNI pour l'instant).

**Résolu 2026-07-01** (`roadmap.md` Décision #3) : le barème est fixe pour
toute la plateforme, porté par la table singleton `platform_settings`
ci-dessous (pas de table `points_rules` par manifestation).

### `platform_settings`

Singleton — pattern repris directement de `site_settings` chez Economat
FDV (`id TEXT PRIMARY KEY DEFAULT 'main'`, une seule ligne, RLS lecture
publique + écriture super_admin uniquement).

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | text, PK, défaut `'main'` | contrainte `CHECK (id = 'main')` — une seule ligne possible |
| `points_per_signup` | int | défaut `5` |
| `points_per_shift_completed` | int | défaut `20` |
| `updated_at` | timestamptz | |
| `updated_by` | uuid (FK `auth.users.id`) | |

### `newsletter_sends`

Journal d'audit des envois — Resend gère l'envoi réel (Audiences /
Broadcasts), cette table trace qui a envoyé quoi à qui et sert de verrou
de permission côté application.

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `manifestation_id` | uuid (FK, nullable) | nullable = envoi plateforme entière |
| `sent_by` | uuid (FK `profiles.id`) | |
| `subject` | text | |
| `resend_broadcast_id` | text | référence côté Resend |
| `audience_scope` | enum `'all_platform' \| 'manifestation_engaged'` | **Résolu 2026-07-01** (`roadmap.md` Décision #2) : n'importe quel admin de manifestation peut choisir `'all_platform'`, pas seulement le super_admin — pas de file d'approbation. |
| `recipient_count` | int | |
| `sent_at` | timestamptz | |

### `manifestation_reminder_settings` / `reminder_rules` / `reminder_sends`

Ajoutées 2026-07-02 — rappels SMS Twilio aux bénévoles avant leur shift.

| Table | Colonnes | Note |
| --- | --- | --- |
| `manifestation_reminder_settings` | `manifestation_id` (PK/FK unique), `send_mode` enum `'automatic' \| 'manual'` (défaut `'automatic'`), `sms_enabled` bool (défaut `false`), `created_at` | `sms_enabled` est un interrupteur **contrôlé uniquement par un super_admin** (trigger de garde `guard_sms_enabled`) — substitut simple à un vrai gating payant tant que le module abonnement (§ ci-dessous) n'existe pas. La création d'une ligne déclenche un trigger qui sème 2 `reminder_rules` par défaut (J-1/H-1). |
| `reminder_rules` | `id`, `manifestation_id` (FK), `offset_minutes` int, `message_template` text, `created_at` | texte librement modifiable par un admin de manifestation |
| `reminder_sends` | `id`, `manifestation_id` (FK, dénormalisé depuis `reminder_rule_id` — même pattern que `shifts.manifestation_id`), `shift_signup_id` (FK), `reminder_rule_id` (FK), `sent_at` | `UNIQUE(shift_signup_id, reminder_rule_id)` — idempotence, évite un double envoi si le cron repasse sur la même fenêtre |

Edge Function `send-reminders`, appelée par `pg_cron` (`*/5 * * * *`, via
`pg_net.http_post`, URL et clé `service_role` stockées dans Supabase
Vault — jamais en clair dans une migration) pour le sweep automatique, ou
directement par un admin de manifestation (bouton "Envoyer maintenant")
pour le mode manuel. `pg_cron`/`pg_net` installés dans le schéma
`extensions` (pas `public`, corrigé après avertissement `get_advisors`).
Fenêtre de correspondance : shifts confirmés démarrant dans les 5 minutes
suivant `now() + offset_minutes` d'une règle. Secrets Twilio
(`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER`) pas
encore fournis par Xavier — la fonction le signale explicitement
(`skippedNotConfigured` dans sa réponse) plutôt que d'échouer
silencieusement.

### `partners`

Ajoutée 2026-07-02 — page publique "Nos partenaires" liée depuis la
landing, gérée par le super_admin (logos façon page "qui sommes-nous" de
Maximus Discotecus). Représente les organisations du groupement qui
recherchent des bénévoles (logo + nom).

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `name` | text | |
| `logo_url` | text, nullable | bucket Storage `partner-logos` (public, écriture super_admin uniquement) |
| `website_url` | text, nullable | carte cliquable vers le site si renseigné |
| `order` | int | défaut `0`, tri d'affichage |
| `is_visible` | boolean | défaut `true`, ajouté 2026-07-03 — permet au super_admin de masquer un partenaire de la page publique sans le supprimer (filtre côté requête sur `/partenaires`, pas côté RLS — même pattern que `manifestations.is_published`) |
| `created_at` | timestamptz | |

RLS : lecture publique (`anon` + `authenticated`, même pattern que
`platform_settings`) ; écriture réservée au super_admin.

### `volunteer_blacklist`

Ajoutée 2026-07-03 — bénévoles no-show ou partis avant la fin, avec
commentaire. **Partagée entre organisateurs** (voir `roadmap.md` §
Décisions actées — déroge délibérément à l'isolation stricte par
manifestation, décision explicite de Xavier, pas un oubli). Append-only
façon `points_ledger` : plusieurs entrées possibles par bénévole (pas un
simple booléen `is_blacklisted`), garde l'historique et le contexte de
chaque signalement. **Signal visuel uniquement** — aucun blocage
automatique à l'inscription, `create_shift_signup()` n'est pas modifiée ;
c'est à l'admin de décider au cas par cas (utile surtout en mode
`admin_approval`).

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `volunteer_id` | uuid (FK `profiles.id`) | |
| `manifestation_id` | uuid (FK `manifestations.id`) | manifestation à l'origine du signalement — gardée pour traçabilité même si l'entrée est visible de tous |
| `reason` | text | commentaire libre, obligatoire |
| `created_by` | uuid (FK `profiles.id`, nullable) | |
| `created_at` | timestamptz | |

RLS : `SELECT` par tout `manifestation_admin` (n'importe laquelle) ou
super_admin — jamais par un bénévole simple. `INSERT` par
l'admin de la manifestation renseignée (ou super_admin). `DELETE`
réservé à l'admin de la manifestation à l'origine du signalement (ou
super_admin) — empêche un autre organisateur d'effacer le signalement
d'un tiers.

## RLS — principes (à traduire en policies lors de l'implémentation)

- `manifestations` : lecture publique si `is_published = true` ; lecture/
  écriture complète pour `manifestation_admins` de la ligne ou
  `platform_role = 'super_admin'`.
- `secteurs`, `shifts` : lecture publique via la manifestation parente
  publiée ; écriture réservée aux admins de cette manifestation +
  super_admin.
- `shift_signups`, `manifestation_engagements` : un bénévole lit/écrit ses
  propres lignes ; un admin de manifestation lit/écrit les lignes dont le
  `shift`/l'engagement pointe vers sa manifestation ; super_admin tout.
- `points_ledger` : lecture par le bénévole concerné (ses propres points) ;
  écriture réservée aux admins de la manifestation concernée (pour
  `shift_completed`) et au super_admin (pour `manual_adjustment`) ;
  **aucun UPDATE/DELETE autorisé** — corrections uniquement par nouvelle
  ligne compensatoire, pour préserver l'auditabilité.
- `newsletter_sends` : tout admin de manifestation peut insérer une ligne
  quel que soit `audience_scope` (y compris `'all_platform'`) ;
  super_admin tout.
- `platform_settings` : lecture publique (`anon` + `authenticated`) ;
  écriture réservée au super_admin.
- `profiles` (ajout Phase 7) : tout `manifestation_admin` (de n'importe
  quelle manifestation) peut lire tous les profils — nécessaire pour
  construire la liste de destinataires d'une newsletter `'all_platform'`,
  conséquence directe et déjà acceptée de la Décision #2 (n'importe quel
  admin peut cibler toute la plateforme), pas un nouveau risque.

## Fonctions RPC publiques (`SECURITY DEFINER`, ouvertes à `anon`)

Deux fonctions seulement sont exposées à `anon` — chacune ne renvoie que des
données pensées pour la page publique, jamais de PII ni de données admin par
manifestation :

- `manifestations_seeking_volunteers()` — liste des manifestations publiées
  ayant au moins un shift sous-staffé (signal booléen, pas de compte de places).
- `platform_impact_stats()` (ajout 2026-07-06) — agrégats globaux pour le
  bandeau d'impact de la landing : `manifestations_count` (publiées),
  `volunteers_count` (profils `platform_role = 'user'`), `volunteer_hours`
  (somme des durées de shifts sur les `shift_signups` au statut `completed`).
  Ne renvoie que des totaux — aucune ligne identifiante.

Le test d'isolation RLS inter-manifestation (un admin de A ne voit jamais
B) est un non-négociable (`CLAUDE.md`) et doit être le premier test
automatisé écrit dès que le schéma est appliqué pour de vrai.
