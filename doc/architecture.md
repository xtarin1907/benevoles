# Architecture — Bénévoles+

## Vue d'ensemble

Plateforme multi-manifestations où :

- des **manifestations** (une par association membre du groupement) publient
  des shifts bénévoles ;
- des **bénévoles** (compte unique, valable sur toute la plateforme)
  parcourent une landing page publique, s'engagent sur une ou plusieurs
  manifestations, et s'inscrivent à des shifts ;
- un **super admin** (Xavier) gère le groupement dans son ensemble ;
- des **admins de manifestation** gèrent leur manifestation (branding,
  secteurs, shifts, validation des bénévoles) sans voir les autres
  manifestations.

## Stack technique (décidé le 2026-07-01)

| Couche | Choix | Pourquoi |
| --- | --- | --- |
| Frontend | Next.js (App Router) | SEO de la landing page publique multi-manifestations — critère décisif face à un SPA Vite pur. |
| Backend / DB | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) | RLS natif pour l'isolation par manifestation ; écosystème déjà maîtrisé sur d'autres projets (Economat FDV, To-do, rh.wealthings-vaud.ch). |
| UI | Tailwind + shadcn/ui (à confirmer) | Cohérence avec Economat FDV ; à valider quand le scaffold démarre plutôt qu'à figer maintenant. |
| Emailing / newsletter | Resend (Audiences + Broadcasts pour la newsletter, API transactionnelle pour les confirmations) | Confirmé 2026-07-01 : recommandé par Supabase lui-même pour Next.js, déjà utilisé pour le transactionnel sur Economat FDV. Sources : [resend.com/supabase](https://resend.com/supabase), comparatif [forwardemail.net 2026](https://forwardemail.net/en/blog/resend-vs-brevo-email-service-comparison). Alternatives écartées : Brevo (dashboard/API moins soignés), Loops (tarification par contacts moins adaptée à un usage ponctuel de "burst" newsletter). |
| Mobile | Aucun pour le MVP | YAGNI tant que le web n'est pas validé — voir `roadmap.md`. Si besoin plus tard, precedent Capacitor/Expo existe côté Economat FDV / FDV-Mobile. |

## Multi-tenance : un seul projet Supabase, RLS par manifestation

**Décision (2026-07-01, actée avec Xavier) :** un projet Supabase unique,
pas un projet par manifestation.

Raison : le besoin exprimé est un **compte bénévole unique** valable sur
toutes les manifestations (inscriptions multiples, points cumulés, vue
globale du bénévole). Un projet Supabase par manifestation rendrait ça
impossible sans dupliquer/synchroniser les comptes — complexité inutile.

Conséquence directe : l'isolation entre manifestations (un admin de
manifestation A ne doit jamais voir les données de gestion de B) se fait
**entièrement via RLS Postgres**, pas via une séparation physique de bases.
C'est un non-négociable du projet (`CLAUDE.md`) — la suite RLS doit être le
premier gate CI ajouté dès qu'il y a du code (voir `CLAUDE.md`
§Enforcement mécanique).

## Rôles

Trois niveaux, portés par une colonne `platform_role` sur `profiles` +
une table de jointure pour le rôle par manifestation :

1. **super_admin** — Xavier. Accès total, toutes manifestations, gestion
   des admins de manifestation, paramètres plateforme (règles de points
   par défaut, etc.).
2. **manifestation_admin** — un ou plusieurs comptes par manifestation
   (table `manifestation_admins`). Gère uniquement sa/ses manifestation(s) :
   branding (logo, couleur), secteurs, shifts, validation des candidatures,
   déclenchement de newsletter *scopée à sa manifestation* (le broadcast
   plateforme entière reste une question ouverte — voir `roadmap.md`).
3. **bénévole** — utilisateur public inscrit. Un compte unique, engagements
   sur N manifestations, inscriptions à des shifts, historique de points.

## Ce qu'on reprend d'Economat FDV, et ce qu'on laisse

Source : exploration du repo `/Users/xaviertarin/myCloud/TECHNIQUE/Economat FDV`
(stack React+Vite+Supabase+Capacitor, `schema_complet.sql`,
`supabase/migrations/20260601000002_v2_create_staff.sql`,
`src/components/staff/*`).

**Repris (modèle, pas le code) :**

- Séparation **secteurs → shifts → affectations** (`secteurs`, `shifts`,
  `shift_affectations` chez eux) — un shift appartient à un secteur, un
  secteur appartient à une manifestation/édition.
- Cycle de statut d'une inscription à un shift, en ENUM Postgres plutôt
  qu'un booléen ou une chaîne libre — chez eux : `invite → confirme →
  refuse → present`. Chez nous, le flux est self-service (bénévole
  s'inscrit lui-même) donc le cycle est adapté :
  `applied → confirmed → declined → completed → no_show` (voir
  `data-model.md`).
- Couleur (`couleur`, hex) portée par l'entité de regroupement (chez eux
  `secteurs`, chez nous en plus au niveau `manifestations` pour le
  code-couleur demandé par Xavier) — réutilisée telle quelle comme pattern
  de colonne (`color_hex`).
- Contrainte `UNIQUE(shift_id, annuaire_id)` pour empêcher une double
  inscription — reprise à l'identique (`UNIQUE(shift_id, volunteer_id)`).
- Pipeline de notification : Edge Function Supabase → Resend, templates
  stockés en base plutôt qu'en dur dans le code.

**Volontairement laissé de côté (pas pertinent ici) :**

- Le modèle "annuaire" fourre-tout (bénévoles/clients/staff/comité dans une
  seule table avec `role_type`) — chez nous les bénévoles sont des
  `profiles` Supabase Auth dès le départ, plus simple pour un compte
  unique multi-manifestations.
- SMS via Twilio — non demandé, pas de non-négociable dessus. À revisiter
  seulement si un signal réel apparaît (taux de no-show élevé, par ex.).
- `shift_pauses` (pauses dans un shift) — fonctionnalité non demandée,
  YAGNI.
- Le Kanban de candidatures (`CandidaturesKanban`) — pertinent seulement si
  on décide que l'inscription à un shift nécessite validation admin plutôt
  qu'être automatique. C'est une décision ouverte (`roadmap.md`), pas encore
  actée.
- Points/récompenses — Economat FDV n'a **aucune** implémentation de ce
  type (vérifié par grep sur "point"/"reward"/"badge"/"gamif" dans src/ et
  supabase/ : uniquement des faux positifs shadcn `Badge` / CSS
  `pointer-events`). C'est une fonctionnalité entièrement nouvelle pour ce
  projet — voir `data-model.md` §points_ledger.

## Interfaces prévues

1. **Super admin** — back-office plateforme : CRUD manifestations, gestion
   des admins de manifestation, vue globale bénévoles/points.
2. **Admin de manifestation** — paramétrage de sa manifestation (nom,
   description, dates, logo, couleur), secteurs/shifts, validation des
   inscriptions, envoi de newsletter scopée.
3. **Landing page publique** — liste des manifestations partenaires,
   calendrier consolidé, entrée d'engagement bénévole (inscription /
   connexion puis choix de manifestation(s)).
4. **Espace bénévole** — mes inscriptions (par manifestation et par
   shift), mes points/récompenses (inscriptions + shifts réellement
   effectués), historique.
