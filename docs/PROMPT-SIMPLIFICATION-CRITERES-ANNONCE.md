# Mise à jour Page Annonce — Suppression Match Score, simplification critères

## Contexte

Le système de Match Score (pourcentage de compatibilité, calcul pondéré, snapshot en base) a été implémenté mais il est surdimensionné. Les critères propriétaire étaient trop nombreux et reproduisaient les biais du marché (ratio 3× le loyer, exigence CDI, etc.) — exactement ce que Coridor combat.

**Décision : supprimer le Match Score et simplifier radicalement.**

On remplace par un simple affichage des préférences du propriétaire (informatif, jamais bloquant) + les indicateurs de confiance Coridor du locataire. Pas de score, pas de pourcentage, pas de calcul de compatibilité.

---

## CE QU'IL FAUT SUPPRIMER

### Supprimer complètement

- **MatchScoreService.ts** — supprimer le fichier entier
- **MatchScoreBadge.tsx** — supprimer (le badge pourcentage dans les cards de recherche)
- **MatchCriterionRow.tsx** — supprimer
- **CandidateMatchColumn.tsx** — supprimer la colonne match du pipeline
- **useMatchScore.ts** — supprimer le hook
- **API `/api/listings/[listingId]/match`** — supprimer la route entière

### Supprimer dans Application (modèle Prisma)

Retirer les champs ajoutés :

```prisma
model Application {
  // SUPPRIMER ces champs :
  // matchScore       Int?
  // matchDetails     Json?
}
```

Créer une migration pour supprimer ces colonnes.

### Supprimer dans ListingRequirements (modèle Prisma)

Retirer les critères discriminants. Le modèle actuel est trop riche. Le remplacer par :

```prisma
model ListingRequirements {
  id        String   @id @default(cuid())
  listingId String   @unique
  listing   Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)

  // Préférences simples (informatives, jamais bloquantes)
  payerBadgePreferred   Boolean @default(false)  // Souhaite un Badge Payeur Vérifié
  guarantorPreferred    Boolean @default(false)  // Souhaite un garant
  petsWelcome           Boolean @default(true)   // Animaux bienvenus
  studentsWelcome       Boolean @default(true)   // Étudiants bienvenus

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Champs supprimés :**
- `incomeRatio` — reproduit la règle arbitraire du 3×, contraire à la philosophie Coridor
- `guarantorType` — trop granulaire, un simple "souhaite un garant" suffit
- `acceptedContracts` — discriminant (exclut freelances, CDD, étudiants)
- `maxOccupants` — pas un critère légal de sélection, potentiellement discriminant
- `petsAllowed` → renommé `petsWelcome` (formulation positive)
- `smokingAllowed` — inutile (le locataire a le droit de fumer chez lui, seules les dégradations comptent à la sortie)
- `payerBadgeRequired` → renommé `payerBadgePreferred` (jamais "requis", toujours "souhaité")
- `minPayerScore` — supprimé, trop granulaire
- `preferredMoveIn` — déjà dans l'annonce, pas besoin de dupliquer
- `notes` — supprimé, risque discriminatoire, le propriétaire a déjà la description de l'annonce

Créer une migration pour mettre à jour la table.

### Supprimer le filtre anti-discrimination

Le système de détection de termes interdits dans la note libre (`FORBIDDEN_TERMS`, `validateNotes()`) n'a plus lieu d'être puisqu'il n'y a plus de note libre. Supprimer tout le code associé.

---

## CE QU'IL FAUT MODIFIER

### ListingRequirementsForm.tsx — Simplifier radicalement

Le formulaire propriétaire dans l'édition d'annonce devient minimal :

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Profil recherché                                        │
│                                                          │
│  Ces préférences sont affichées sur votre annonce.       │
│  Elles sont informatives — aucun candidat n'est bloqué.  │
│                                                          │
│  Badge Payeur Vérifié souhaité      [switch]             │
│  ℹ️ Les candidats ayant vérifié leur historique          │
│     de paiement via Coridor                              │
│                                                          │
│  Garant souhaité                    [switch]             │
│                                                          │
│  ── Propriétaire accueillant ──────────────────          │
│                                                          │
│  Animaux bienvenus 🐾               [switch ON]          │
│  Étudiants bienvenus 🎓             [switch ON]          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

4 toggles, c'est tout. Tous ON par défaut sauf Badge et Garant (OFF par défaut). La section "Propriétaire accueillant" est une formulation positive — le proprio qui active ces toggles montre qu'il est ouvert, ce qui attire plus de candidats.

### ListingRequirementsCard.tsx — Refaire complètement

La card sur la page annonce n'affiche plus de score. Elle montre deux choses :

**1. Les préférences du propriétaire** (si au moins une est définie)
**2. Le profil Coridor du locataire** (s'il est connecté)

**Locataire non connecté :**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Ce que recherche le propriétaire                    │
│                                                      │
│  ✦ Badge Payeur Vérifié                              │
│  ✦ Garant                                            │
│  🐾 Animaux bienvenus                                │
│  🎓 Étudiants bienvenus                              │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Créez votre Passeport Coridor pour postuler   │  │
│  │  en un clic avec votre profil vérifié          │  │
│  │                                                │  │
│  │  [ Créer mon Passeport → ]                     │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Locataire connecté :**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Ce que recherche le propriétaire                    │
│                                                      │
│  ✦ Badge Payeur Vérifié      ✅ Vous l'avez         │
│  ✦ Garant                    ❌ Non renseigné        │
│  🐾 Animaux bienvenus                                │
│  🎓 Étudiants bienvenus                              │
│                                                      │
│  [ Postuler avec mon Passeport → ]                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Pas de pourcentage, pas de barre de progression, pas de score
- Le statut du locataire s'affiche à côté uniquement pour le Badge Payeur et le Garant (les seuls critères vérifiables)
- "Animaux bienvenus" et "Étudiants bienvenus" sont des infos pures, pas de check côté locataire
- Si le locataire n'a pas le badge ou le garant, il peut quand même postuler — le bouton est toujours là
- Si AUCUNE préférence n'est définie par le propriétaire, la section entière ne s'affiche pas

### ListingCard.tsx — Retirer le badge Match

Supprimer l'affichage du `MatchScoreBadge` dans les cards de résultats de recherche. À la place, on peut afficher de petites icônes discrètes si le propriétaire est accueillant :

```
┌─────────────────────────────────┐
│  🏠 T2 - Rue de Rivoli, Paris  │
│  850€/mois                      │
│                                 │
│  🐾 🎓          ← si activés   │
│                                 │
└─────────────────────────────────┘
```

Les icônes 🐾 (animaux) et 🎓 (étudiants) s'affichent dans les cards uniquement si le proprio les a activées. C'est discret et informatif. Pas de score, pas de badge pourcentage.

### Pipeline candidatures — Retirer le tri par score

Dans la page pipeline du propriétaire (`/[locale]/properties/[id]/applications`) :

- Supprimer la colonne "Match" / score
- Supprimer le tri par `matchScore DESC`
- Garder le tri par défaut : date de candidature (plus récente en premier)
- Le propriétaire voit toujours dans chaque candidature si le locataire a le Badge Payeur Vérifié et un Passeport complet — mais c'est affiché comme info dans la fiche candidat, pas comme un score

### API `/api/listings/[listingId]/requirements` — Simplifier

**GET** (public) :

```json
{
  "payerBadgePreferred": true,
  "guarantorPreferred": true,
  "petsWelcome": true,
  "studentsWelcome": true
}
```

**PUT** (propriétaire authentifié) :

```json
{
  "payerBadgePreferred": true,
  "guarantorPreferred": false,
  "petsWelcome": true,
  "studentsWelcome": true
}
```

C'est tout. Pas d'API `/match`, pas de calcul côté serveur.

### API `/api/applications` — Retirer le snapshot score

Dans le handler POST de création de candidature, supprimer :

```typescript
// SUPPRIMER tout ce bloc :
// const matchResult = MatchScoreService.calculate(...)
// matchScore: matchResult.score,
// matchDetails: matchResult as any,
```

La candidature se crée normalement sans calcul de score.

---

## FICHIERS À SUPPRIMER

| Fichier | Raison |
|---------|--------|
| `services/MatchScoreService.ts` | Plus de calcul de score |
| `components/listing/MatchScoreBadge.tsx` | Plus de badge pourcentage |
| `components/listing/MatchCriterionRow.tsx` | Plus de lignes de critères avec pondération |
| `components/listing/CandidateMatchColumn.tsx` | Plus de colonne match dans le pipeline |
| `hooks/useMatchScore.ts` | Plus de hook de calcul |
| `app/api/listings/[listingId]/match/route.ts` | Plus d'API de calcul de score |

## FICHIERS À MODIFIER

| Fichier | Modification |
|---------|-------------|
| `prisma/schema.prisma` | Simplifier ListingRequirements (4 booleans), retirer matchScore/matchDetails d'Application |
| `components/listing/ListingRequirementsCard.tsx` | Refaire complètement — affichage simple sans score |
| `components/listing/ListingRequirementsForm.tsx` | Simplifier — 4 toggles uniquement |
| `components/listing/ListingCard.tsx` | Retirer MatchScoreBadge, ajouter icônes 🐾 🎓 si applicable |
| `app/[locale]/listings/[listingId]/page.tsx` | Adapter l'intégration de la card simplifiée |
| `app/api/listings/[listingId]/requirements/route.ts` | Simplifier GET/PUT pour 4 booleans |
| `app/api/applications/route.ts` | Retirer le calcul et snapshot du score |
| `app/[locale]/properties/[id]/applications/page.tsx` | Retirer colonne match, tri par date |

## MIGRATION PRISMA

```sql
-- Supprimer les colonnes de score dans Application
ALTER TABLE "Application" DROP COLUMN IF EXISTS "matchScore";
ALTER TABLE "Application" DROP COLUMN IF EXISTS "matchDetails";

-- Simplifier ListingRequirements
ALTER TABLE "ListingRequirements" DROP COLUMN IF EXISTS "incomeRatio";
ALTER TABLE "ListingRequirements" DROP COLUMN IF EXISTS "guarantorRequired";
ALTER TABLE "ListingRequirements" DROP COLUMN IF EXISTS "guarantorType";
ALTER TABLE "ListingRequirements" DROP COLUMN IF EXISTS "acceptedContracts";
ALTER TABLE "ListingRequirements" DROP COLUMN IF EXISTS "maxOccupants";
ALTER TABLE "ListingRequirements" DROP COLUMN IF EXISTS "petsAllowed";
ALTER TABLE "ListingRequirements" DROP COLUMN IF EXISTS "smokingAllowed";
ALTER TABLE "ListingRequirements" DROP COLUMN IF EXISTS "payerBadgeRequired";
ALTER TABLE "ListingRequirements" DROP COLUMN IF EXISTS "minPayerScore";
ALTER TABLE "ListingRequirements" DROP COLUMN IF EXISTS "preferredMoveIn";
ALTER TABLE "ListingRequirements" DROP COLUMN IF EXISTS "notes";

-- Ajouter les nouvelles colonnes simples
ALTER TABLE "ListingRequirements" ADD COLUMN IF NOT EXISTS "payerBadgePreferred" BOOLEAN DEFAULT false;
ALTER TABLE "ListingRequirements" ADD COLUMN IF NOT EXISTS "guarantorPreferred" BOOLEAN DEFAULT false;
ALTER TABLE "ListingRequirements" ADD COLUMN IF NOT EXISTS "petsWelcome" BOOLEAN DEFAULT true;
ALTER TABLE "ListingRequirements" ADD COLUMN IF NOT EXISTS "studentsWelcome" BOOLEAN DEFAULT true;
```

Ou via Prisma : modifier le schéma puis `npx prisma migrate dev --name simplify-listing-requirements`.

---

## VÉRIFICATIONS

- [ ] Migration Prisma appliquée sans erreur
- [ ] Fichiers supprimés : MatchScoreService, MatchScoreBadge, MatchCriterionRow, CandidateMatchColumn, useMatchScore, API /match
- [ ] Formulaire proprio : 4 toggles fonctionnels, sauvegarde en base
- [ ] Page annonce (non connecté) : préférences affichées, CTA Passeport
- [ ] Page annonce (connecté) : statut Badge/Garant affiché à côté, bouton postuler toujours visible
- [ ] Page annonce (aucune préférence) : section masquée entièrement
- [ ] ListingCard : icônes 🐾 🎓 affichées si applicable, pas de badge score
- [ ] Pipeline candidatures : pas de colonne match, tri par date
- [ ] Candidature : se crée sans calcul de score
- [ ] API GET /requirements : retourne 4 booleans
- [ ] API PUT /requirements : sauvegarde 4 booleans
- [ ] npm run build → 0 erreurs
