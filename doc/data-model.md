# Modèle de données — Bénévoles+ (proposition, pas encore appliquée)

Statut : **conception, aucune migration n'a été appliquée**. Ce document
sert de base de discussion avant la première migration Supabase réelle.
Inspiré du schéma d'Economat FDV (`schema_complet.sql`,
`20260601000002_v2_create_staff.sql`) — voir `architecture.md` §"Ce qu'on
reprend" pour la justification de chaque emprunt/écart.

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
| `created_at` | timestamptz | |

### `manifestations`

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `name` | text | |
| `slug` | text unique | pour les URLs publiques |
| `description` | text | |
| `logo_url` | text | |
| `color_hex` | text | défaut `#6366f1` (pattern repris d'Economat FDV `secteurs.couleur`) |
| `start_date` / `end_date` | date | |
| `is_published` | boolean | défaut `false` — contrôle la visibilité sur la landing page publique |
| `shift_signup_mode` | enum `'auto_confirm' \| 'admin_approval'` | défaut `'auto_confirm'` — décidé le 2026-07-01 : configurable par manifestation, pas global (voir `roadmap.md` Décision #1) |
| `created_by` | uuid (FK `profiles.id`) | |
| `created_at` | timestamptz | |

### `manifestation_admins`

Table de jointure — qui administre quelle manifestation.

| Colonne | Type | Note |
| --- | --- | --- |
| `manifestation_id` | uuid (FK) | |
| `user_id` | uuid (FK `profiles.id`) | |
| `role` | enum `'owner' \| 'admin'` | `'owner'` = créateur, `'admin'` = invité |
| `invited_at` | timestamptz | |

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
| `order` | int | |
| `created_at` | timestamptz | |

### `shifts`

| Colonne | Type | Note |
| --- | --- | --- |
| `id` | uuid | |
| `secteur_id` | uuid (FK) | |
| `manifestation_id` | uuid (FK) | dénormalisé depuis `secteur_id` pour simplifier les policies RLS (évite un join secteurs→manifestations dans chaque policy) — pattern à valider en implémentation, pas une religion |
| `name` | text | |
| `start_at` / `end_at` | timestamptz | |
| `capacity` | int | nombre de bénévoles requis (= `nb_benevoles_requis` chez Economat FDV) |
| `description` | text | |
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
| `status` | enum `'applied' \| 'confirmed' \| 'declined' \| 'completed' \| 'no_show'` | cycle adapté du `statut` Economat FDV (`invite/confirme/refuse/present`). **Résolu 2026-07-01** (`roadmap.md` Décision #1) : le statut initial dépend de `manifestations.shift_signup_mode` — `confirmed` directement si `auto_confirm` (sous réserve de capacité), `applied` si `admin_approval`. Logique portée par une fonction `create_shift_signup()` (Phase 3/5, hors scaffold Phase 1). |
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

Le test d'isolation RLS inter-manifestation (un admin de A ne voit jamais
B) est un non-négociable (`CLAUDE.md`) et doit être le premier test
automatisé écrit dès que le schéma est appliqué pour de vrai.
