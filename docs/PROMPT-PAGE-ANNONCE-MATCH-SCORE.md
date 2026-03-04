# Refonte Page Annonce — Match Score & Garanties Transparentes

## Contexte

La page annonce publique (`/[locale]/listings/[listingId]`) est la vitrine du bien pour les locataires candidats. On ajoute un système de **garanties transparentes avec match score** : le propriétaire définit ses critères, le locataire voit les critères + son taux de compatibilité. Pas de filtrage dur — le locataire peut toujours postuler, mais il est informé.

**Philosophie Coridor :** Informer, pas décider à la place des gens. Le filtrage dur dit "tu n'as pas le droit de postuler" — c'est paternaliste. Le match score dit "voici où tu en es, tu décides" — c'est de la confiance.

**Objectifs :**
1. Le propriétaire reçoit des candidatures mieux qualifiées (auto-sélection naturelle)
2. Le locataire voit la transparence des critères (valeur Coridor)
3. Aucun locataire n'est bloqué — il peut toujours tenter sa chance
4. Le propriétaire reçoit les candidatures triées par score de compatibilité
5. Les locataires non connectés voient les critères mais pas leur score → hook de conversion vers le Passeport Coridor

## Prérequis

- Annonce existante (Listing + Property en base)
- Passeport Locatif du locataire (TenantPassport en base — si existant)
- Badge Payeur Vérifié (Powens — si connecté)

---

## MODÈLE DE DONNÉES

### Côté propriétaire — Critères de garantie

Ajouter au schéma Prisma :

```prisma
model ListingRequirements {
  id        String   @id @default(cuid())
  listingId String   @unique
  listing   Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)

  // Critères financiers
  incomeRatio         Float?    // ex: 3.0 = revenus ≥ 3× le loyer. null = pas exigé
  guarantorRequired   Boolean   @default(false)  // garant physique exigé
  guarantorType       String?   // "physical" | "visale" | "gli" | "any" | null

  // Critères professionnels
  acceptedContracts   String[]  // ["CDI", "CDD", "FREELANCE", "STUDENT", "RETIRED", "OTHER"]
                                // vide = tous acceptés

  // Critères de profil
  maxOccupants        Int?      // nombre max d'occupants. null = pas de limite
  petsAllowed         Boolean   @default(true)  // animaux acceptés
  smokingAllowed      Boolean   @default(true)  // fumeurs acceptés

  // Badge Coridor
  payerBadgeRequired  Boolean   @default(false) // Badge Payeur Vérifié exigé
  minPayerScore       Int?      // score min du badge (0-100). null = pas de minimum

  // Préférences (non bloquantes, affichées mais pas dans le score)
  preferredMoveIn     DateTime? // date d'emménagement souhaitée
  notes               String?   // note libre du propriétaire (ex: "Immeuble calme")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Côté locataire — Données du Passeport pour le matching

Le Passeport Locatif existant (`TenantPassport`) contient déjà :
- `monthlyIncome` (revenus mensuels)
- `contractType` (type de contrat)
- `hasGuarantor` + `guarantorType`
- `occupants` (nombre d'occupants)
- `hasPets`
- `isSmoker`
- `payerBadgeScore` (score Powens)
- `payerBadgeVerified` (boolean)

Si ces champs n'existent pas encore, les ajouter au modèle TenantPassport.

### Score de compatibilité — calculé à la volée

**Le score n'est PAS stocké en base.** Il est calculé côté serveur à chaque affichage de la page annonce, basé sur les données actuelles du Passeport vs les critères du propriétaire.

```typescript
interface MatchResult {
  score: number;          // 0 à 100 (pourcentage)
  matchedCount: number;   // nombre de critères remplis
  totalCriteria: number;  // nombre total de critères
  criteria: CriterionResult[];
}

interface CriterionResult {
  id: string;             // ex: "income_ratio"
  label: string;          // ex: "Revenus ≥ 3× le loyer"
  status: 'met' | 'unmet' | 'unknown'; // rempli / non rempli / non renseigné
  detail?: string;        // ex: "Vous : 3,2×" ou "Non renseigné"
  weight: number;         // poids dans le score (1 = normal, 2 = important)
  isRequired: boolean;    // critère exigé vs préféré
}
```

### Score côté candidature

Quand le locataire postule, le score est snapshot :

```prisma
model Application {
  // ... champs existants ...
  
  matchScore       Int?    // score au moment de la candidature (0-100)
  matchDetails     Json?   // snapshot du MatchResult
}
```

---

## LOGIQUE DE CALCUL DU MATCH SCORE

### Service : `services/MatchScoreService.ts`

```typescript
export class MatchScoreService {
  
  static calculate(
    requirements: ListingRequirements,
    passport: TenantPassport | null,
    rent: number // loyer HC mensuel
  ): MatchResult {
    
    const criteria: CriterionResult[] = [];
    
    // 1. RATIO DE REVENUS (poids 2 — critère majeur)
    if (requirements.incomeRatio) {
      const required = requirements.incomeRatio * rent;
      if (passport?.monthlyIncome) {
        const actualRatio = passport.monthlyIncome / rent;
        criteria.push({
          id: 'income_ratio',
          label: `Revenus ≥ ${requirements.incomeRatio}× le loyer`,
          status: actualRatio >= requirements.incomeRatio ? 'met' : 'unmet',
          detail: `Vous : ${actualRatio.toFixed(1)}×`,
          weight: 2,
          isRequired: true
        });
      } else {
        criteria.push({
          id: 'income_ratio',
          label: `Revenus ≥ ${requirements.incomeRatio}× le loyer`,
          status: 'unknown',
          detail: 'Non renseigné dans votre Passeport',
          weight: 2,
          isRequired: true
        });
      }
    }
    
    // 2. TYPE DE CONTRAT (poids 1)
    if (requirements.acceptedContracts.length > 0) {
      if (passport?.contractType) {
        const accepted = requirements.acceptedContracts.includes(passport.contractType);
        criteria.push({
          id: 'contract_type',
          label: `Contrat : ${formatContracts(requirements.acceptedContracts)}`,
          status: accepted ? 'met' : 'unmet',
          detail: `Vous : ${formatContract(passport.contractType)}`,
          weight: 1,
          isRequired: true
        });
      } else {
        criteria.push({
          id: 'contract_type',
          label: `Contrat : ${formatContracts(requirements.acceptedContracts)}`,
          status: 'unknown',
          detail: 'Non renseigné',
          weight: 1,
          isRequired: true
        });
      }
    }
    
    // 3. GARANT (poids 1)
    if (requirements.guarantorRequired) {
      if (passport) {
        const hasValidGuarantor = passport.hasGuarantor && (
          !requirements.guarantorType || 
          requirements.guarantorType === 'any' || 
          passport.guarantorType === requirements.guarantorType
        );
        criteria.push({
          id: 'guarantor',
          label: `Garant ${requirements.guarantorType === 'physical' ? 'physique' : requirements.guarantorType === 'visale' ? 'Visale' : ''} requis`,
          status: hasValidGuarantor ? 'met' : 'unmet',
          detail: passport.hasGuarantor ? `Vous : ${formatGuarantor(passport.guarantorType)}` : 'Vous : aucun garant',
          weight: 1,
          isRequired: true
        });
      } else {
        criteria.push({
          id: 'guarantor',
          label: 'Garant requis',
          status: 'unknown',
          detail: 'Non renseigné',
          weight: 1,
          isRequired: true
        });
      }
    }
    
    // 4. ANIMAUX (poids 1)
    if (!requirements.petsAllowed) {
      if (passport) {
        criteria.push({
          id: 'pets',
          label: 'Pas d\'animaux',
          status: passport.hasPets ? 'unmet' : 'met',
          detail: passport.hasPets ? 'Vous avez un animal' : 'Vous : ✓',
          weight: 1,
          isRequired: true
        });
      } else {
        criteria.push({
          id: 'pets',
          label: 'Pas d\'animaux',
          status: 'unknown',
          detail: 'Non renseigné',
          weight: 1,
          isRequired: true
        });
      }
    }
    
    // 5. FUMEUR (poids 1)
    if (!requirements.smokingAllowed) {
      if (passport) {
        criteria.push({
          id: 'smoking',
          label: 'Non-fumeur',
          status: passport.isSmoker ? 'unmet' : 'met',
          detail: passport.isSmoker ? 'Vous êtes fumeur' : 'Vous : ✓',
          weight: 1,
          isRequired: true
        });
      } else {
        criteria.push({
          id: 'smoking',
          label: 'Non-fumeur',
          status: 'unknown',
          detail: 'Non renseigné',
          weight: 1,
          isRequired: true
        });
      }
    }
    
    // 6. OCCUPANTS (poids 1)
    if (requirements.maxOccupants) {
      if (passport?.occupants) {
        criteria.push({
          id: 'occupants',
          label: `Max ${requirements.maxOccupants} occupant${requirements.maxOccupants > 1 ? 's' : ''}`,
          status: passport.occupants <= requirements.maxOccupants ? 'met' : 'unmet',
          detail: `Vous : ${passport.occupants}`,
          weight: 1,
          isRequired: true
        });
      } else {
        criteria.push({
          id: 'occupants',
          label: `Max ${requirements.maxOccupants} occupants`,
          status: 'unknown',
          detail: 'Non renseigné',
          weight: 1,
          isRequired: true
        });
      }
    }
    
    // 7. BADGE PAYEUR (poids 2 — critère majeur Coridor)
    if (requirements.payerBadgeRequired) {
      if (passport) {
        const hasBadge = passport.payerBadgeVerified;
        const meetsScore = !requirements.minPayerScore || 
          (passport.payerBadgeScore && passport.payerBadgeScore >= requirements.minPayerScore);
        criteria.push({
          id: 'payer_badge',
          label: 'Badge Payeur Vérifié',
          status: hasBadge && meetsScore ? 'met' : 'unmet',
          detail: hasBadge 
            ? `Score : ${passport.payerBadgeScore}/100` 
            : 'Badge non obtenu',
          weight: 2,
          isRequired: true
        });
      } else {
        criteria.push({
          id: 'payer_badge',
          label: 'Badge Payeur Vérifié',
          status: 'unknown',
          detail: 'Connectez votre compte bancaire via Powens',
          weight: 2,
          isRequired: true
        });
      }
    }
    
    // CALCUL DU SCORE PONDÉRÉ
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    const metWeight = criteria
      .filter(c => c.status === 'met')
      .reduce((sum, c) => sum + c.weight, 0);
    
    const score = totalWeight > 0 
      ? Math.round((metWeight / totalWeight) * 100) 
      : 100; // pas de critères = 100%
    
    return {
      score,
      matchedCount: criteria.filter(c => c.status === 'met').length,
      totalCriteria: criteria.length,
      criteria
    };
  }
}
```

---

## COMPOSANTS UI

### Structure des fichiers

```
components/
  listing/
    ListingRequirementsCard.tsx     — Affichage des critères + score sur la page annonce
    ListingRequirementsForm.tsx     — Formulaire propriétaire pour définir les critères
    MatchScoreBadge.tsx             — Badge compact (score + couleur)
    MatchCriterionRow.tsx           — Ligne individuelle d'un critère (✅/❌/❓)
    CandidateMatchColumn.tsx        — Colonne match dans le pipeline candidatures (côté proprio)

hooks/
  useMatchScore.ts                 — Hook pour calculer le score (appel API)

services/
  MatchScoreService.ts             — Logique de calcul (côté serveur)

app/
  api/
    listings/[listingId]/
      requirements/
        route.ts                   — CRUD des critères (GET/PUT)
      match/
        route.ts                   — GET score pour un locataire connecté
```

### ListingRequirementsCard.tsx — Composant principal (page annonce)

**3 états selon le contexte :**

**A) Utilisateur non connecté :**
```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Garanties demandées par le propriétaire         │
│                                                  │
│  ○ Revenus ≥ 3× le loyer                        │
│  ○ CDI ou fonctionnaire                          │
│  ○ Garant physique                               │
│  ○ Non-fumeur                                    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Créez votre Passeport Coridor           │    │
│  │  pour voir votre compatibilité           │    │
│  │                                          │    │
│  │  [ Créer mon Passeport →  ]              │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘
```
- Critères listés avec des cercles neutres (gris)
- CTA vers création du Passeport Coridor
- Hook de conversion naturel

**B) Locataire connecté avec Passeport :**
```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Garanties demandées          Compatibilité      │
│  par le propriétaire              80%            │
│                               ████████░░         │
│                                                  │
│  ✅ Revenus ≥ 3× le loyer       (vous : 3,2×)  │
│  ✅ CDI ou fonctionnaire         (vous : CDI)   │
│  ❌ Garant physique              (non renseigné) │
│  ✅ Non-fumeur                   (vous : ✓)     │
│                                                  │
│  [ Postuler avec mon Passeport Coridor → ]       │
│                                                  │
│  💡 Vous ne remplissez pas tous les critères ?   │
│     Vous pouvez postuler quand même.             │
│                                                  │
└──────────────────────────────────────────────────┘
```
- Chaque critère avec icône vert/rouge/gris
- Score global avec barre de progression
- Détail personnalisé ("vous : 3,2×")
- CTA postuler toujours visible
- Message rassurant en bas si score < 100%

**C) Locataire connecté SANS Passeport complet :**
```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Garanties demandées          Compatibilité      │
│  par le propriétaire             ???             │
│                                                  │
│  ❓ Revenus ≥ 3× le loyer       (non renseigné) │
│  ✅ CDI ou fonctionnaire         (vous : CDI)   │
│  ❓ Garant physique              (non renseigné) │
│  ❓ Non-fumeur                   (non renseigné) │
│                                                  │
│  Complétez votre Passeport pour voir votre       │
│  compatibilité détaillée                         │
│                                                  │
│  [ Compléter mon Passeport → ] [ Postuler → ]   │
│                                                  │
└──────────────────────────────────────────────────┘
```
- Critères connus remplis, les autres en "?"
- Deux CTA : compléter le Passeport OU postuler directement

### Couleurs du score

```typescript
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50';   // Excellent
  if (score >= 50) return 'text-amber-600 bg-amber-50';   // Partiel
  return 'text-red-500 bg-red-50';                         // Faible
}

function getScoreLabel(score: number): string {
  if (score === 100) return 'Profil idéal';
  if (score >= 80) return 'Très compatible';
  if (score >= 50) return 'Partiellement compatible';
  return 'Peu compatible';
}
```

### MatchScoreBadge.tsx — Badge compact

Pour les listes d'annonces (cards dans la recherche) :

```
┌─────────────────────────────────┐
│  🏠 T2 - Rue de Rivoli, Paris  │
│  850€/mois                      │
│                                 │
│  [80% compatible]  ← badge      │
│                                 │
└─────────────────────────────────┘
```

Le badge s'affiche UNIQUEMENT si le locataire est connecté et a un Passeport. Sinon il ne s'affiche pas (pas de "?" dans les listes).

### ListingRequirementsForm.tsx — Formulaire propriétaire

Intégré dans le flow de création/édition de l'annonce, nouvelle étape ou section dans l'étape finale :

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Vos critères de sélection                                   │
│                                                              │
│  Ces critères seront affichés sur votre annonce pour que     │
│  les candidats puissent vérifier leur compatibilité avant    │
│  de postuler. Aucun candidat ne sera bloqué.                 │
│                                                              │
│  ── Critères financiers ──────────────────────────────       │
│                                                              │
│  Ratio de revenus minimum                                    │
│  [ 3.0 × ] le loyer            [switch ON/OFF]              │
│  ℹ️ Standard du marché : 3×. Visale accepte dès 1×.         │
│                                                              │
│  Garant exigé                   [switch ON/OFF]              │
│  Type : ( ) Physique  ( ) Visale  (●) Indifférent            │
│                                                              │
│  ── Critères professionnels ──────────────────────           │
│                                                              │
│  Contrats acceptés              [switch ON = tous]           │
│  [✓] CDI  [✓] Fonctionnaire  [ ] CDD                        │
│  [ ] Freelance/Indépendant  [ ] Étudiant  [ ] Retraité      │
│                                                              │
│  ── Critères de vie ──────────────────────────               │
│                                                              │
│  Animaux acceptés               [switch ON]                  │
│  Fumeurs acceptés               [switch ON]                  │
│  Nombre max d'occupants         [ 2 ]                        │
│                                                              │
│  ── Badge Coridor ──────────────────────────────             │
│                                                              │
│  Badge Payeur Vérifié requis    [switch OFF]                 │
│  ℹ️ Seuls les candidats ayant vérifié leur historique        │
│     de paiement via Powens pourront postuler avec le         │
│     meilleur score.                                          │
│                                                              │
│  ── Note libre ──────────────────────────────────            │
│                                                              │
│  [ Immeuble calme, idéal pour couple ou personne seule.    ] │
│  ℹ️ Affiché sur l'annonce. Pas de critères discriminants.   │
│                                                              │
│  ⚠️ Rappel légal : Il est interdit de discriminer selon     │
│  l'origine, le sexe, la situation familiale, l'orientation  │
│  sexuelle, l'âge, le handicap, les opinions politiques ou   │
│  l'appartenance syndicale. (Loi n°2008-496)                 │
│                                                              │
│  [ Enregistrer les critères ]                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Points importants :**
- Rappel anti-discrimination toujours visible
- Tous les switches sont ON par défaut (= pas de restriction) sauf le Badge Payeur
- Les critères sont optionnels — le propriétaire peut ne rien remplir
- Si aucun critère n'est rempli, la section "Garanties demandées" ne s'affiche pas sur l'annonce

### CandidateMatchColumn.tsx — Pipeline propriétaire

Dans le pipeline de candidatures du propriétaire, ajouter une colonne "Match" :

```
┌─────────────────────────────────────────────────────────────────────┐
│  Candidatures pour T2 Rue de Rivoli                                │
│                                                                     │
│  Nom (anonymisé)    Match     Revenus    Badge     Statut          │
│  ─────────────────────────────────────────────────────────────────  │
│  Candidat #1        100%      3,5×       ✅ 92    🟢 Nouveau      │
│  Candidat #2         80%      3,2×       ✅ 78    🟢 Nouveau      │
│  Candidat #3         60%      2,5×       ❌       🟡 En cours     │
│  Candidat #4         40%      2,0×       ❌       🟢 Nouveau      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

- Triées par score de compatibilité par défaut (plus haut en premier)
- Le propriétaire peut trier par d'autres colonnes
- Les critères non remplis sont mis en évidence (couleur ambre/rouge)
- Le propriétaire décide lui-même — Coridor ne refuse personne

---

## API

### PUT /api/listings/[listingId]/requirements

```typescript
// Request (propriétaire authentifié, propriétaire du listing)
{
  incomeRatio: 3.0,
  guarantorRequired: true,
  guarantorType: "any",
  acceptedContracts: ["CDI", "FREELANCE"],
  maxOccupants: 2,
  petsAllowed: true,
  smokingAllowed: false,
  payerBadgeRequired: false,
  notes: "Immeuble calme"
}

// Response
{ success: true, requirements: ListingRequirements }
```

### GET /api/listings/[listingId]/requirements

```typescript
// Response publique (pas besoin d'auth)
{
  criteria: [
    { id: "income_ratio", label: "Revenus ≥ 3× le loyer" },
    { id: "contract_type", label: "CDI ou Freelance" },
    { id: "guarantor", label: "Garant requis" },
    { id: "smoking", label: "Non-fumeur" }
  ],
  notes: "Immeuble calme",
  preferredMoveIn: "2026-04-01"
}
```

### GET /api/listings/[listingId]/match

```typescript
// Requiert auth locataire
// Response
{
  score: 80,
  matchedCount: 4,
  totalCriteria: 5,
  criteria: [
    { id: "income_ratio", label: "Revenus ≥ 3× le loyer", status: "met", detail: "Vous : 3,2×" },
    { id: "contract_type", label: "CDI ou Freelance", status: "met", detail: "Vous : CDI" },
    { id: "guarantor", label: "Garant requis", status: "unmet", detail: "Non renseigné" },
    { id: "smoking", label: "Non-fumeur", status: "met", detail: "Vous : ✓" },
    { id: "payer_badge", label: "Badge Payeur Vérifié", status: "met", detail: "Score : 85/100" }
  ]
}
```

---

## INTÉGRATION DANS LA PAGE ANNONCE

### Placement du composant

La `ListingRequirementsCard` s'insère dans la page annonce existante, dans la colonne de droite (sidebar), entre les infos de prix/loyer et le bouton "Postuler" :

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  [  Photos / Carousel  ]                                 │
│                                                          │
│  ┌── Contenu principal ──────┐  ┌── Sidebar ──────────┐ │
│  │                            │  │                      │ │
│  │  T2 - Rue de Rivoli       │  │  850€/mois           │ │
│  │  Paris 4ème                │  │  + 50€ charges       │ │
│  │                            │  │                      │ │
│  │  Description...            │  │  ┌────────────────┐  │ │
│  │                            │  │  │ GARANTIES      │  │ │
│  │  Caractéristiques...       │  │  │ DEMANDÉES      │  │ │
│  │                            │  │  │                │  │ │
│  │  Diagnostics...            │  │  │ Score: 80%     │  │ │
│  │                            │  │  │ ✅ Revenus     │  │ │
│  │                            │  │  │ ✅ CDI         │  │ │
│  │                            │  │  │ ❌ Garant      │  │ │
│  │                            │  │  │ ✅ Non-fumeur  │  │ │
│  │                            │  │  └────────────────┘  │ │
│  │                            │  │                      │ │
│  │                            │  │  [ Postuler → ]      │ │
│  │                            │  │                      │ │
│  └────────────────────────────┘  └──────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Sur mobile : la card garanties s'affiche en sticky en bas de page, au-dessus du bouton "Postuler".

### Si aucun critère n'est défini

Ne PAS afficher la section "Garanties demandées". Le locataire voit juste le bouton Postuler normalement. Pas de "Aucune garantie demandée" — ça ferait bizarre et donnerait l'impression que le propriétaire s'en fiche.

### Animation au scroll

Quand la card "Garanties demandées" entre dans le viewport :
- Les critères apparaissent un par un (stagger 100ms, fade-in + translateY)
- La barre de score se remplit progressivement (animation 800ms ease-out)
- Le score numérique count-up de 0 à la valeur finale

---

## INTÉGRATION DANS LE PIPELINE CANDIDATURES

### Modification du modèle Application

Quand un locataire postule, sauvegarder le match score :

```typescript
// Dans le handler POST /api/applications
const matchResult = MatchScoreService.calculate(
  listing.requirements,
  applicant.passport,
  listing.rent
);

await prisma.application.create({
  data: {
    // ... données existantes
    matchScore: matchResult.score,
    matchDetails: matchResult as any, // JSON
  }
});
```

### Tri par défaut dans le pipeline

Dans la page pipeline du propriétaire (`/[locale]/properties/[id]/applications`), les candidatures sont triées par `matchScore DESC` par défaut. Le propriétaire peut changer le tri (date, score, statut).

---

## FICHIERS IMPACTÉS

### Nouveaux fichiers (8)

| Fichier | Rôle |
|---------|------|
| `prisma/schema.prisma` | Modèle ListingRequirements + champs Application |
| `services/MatchScoreService.ts` | Logique de calcul du score |
| `components/listing/ListingRequirementsCard.tsx` | Card garanties sur la page annonce |
| `components/listing/ListingRequirementsForm.tsx` | Formulaire critères (côté proprio) |
| `components/listing/MatchScoreBadge.tsx` | Badge compact pour les cards dans la recherche |
| `components/listing/MatchCriterionRow.tsx` | Ligne individuelle d'un critère |
| `components/listing/CandidateMatchColumn.tsx` | Colonne match dans le pipeline |
| `hooks/useMatchScore.ts` | Hook client pour fetch le score |

### Fichiers modifiés (6)

| Fichier | Modification |
|---------|-------------|
| `app/[locale]/listings/[listingId]/page.tsx` | Intégration ListingRequirementsCard dans la sidebar |
| `app/[locale]/properties/[id]/edit/...` | Ajout section ListingRequirementsForm |
| `app/api/listings/[listingId]/route.ts` | Include requirements dans le GET |
| `app/api/applications/route.ts` | Calcul et sauvegarde matchScore au POST |
| `components/listing/ListingCard.tsx` | Affichage MatchScoreBadge (si locataire connecté) |
| `app/[locale]/properties/[id]/applications/page.tsx` | Tri par matchScore, colonne match |

### API routes nouveaux (3)

| Route | Méthode | Rôle |
|-------|---------|------|
| `/api/listings/[listingId]/requirements` | GET/PUT | CRUD critères |
| `/api/listings/[listingId]/match` | GET | Score pour locataire connecté |
| (modification) `/api/applications` | POST | Snapshot du score |

---

## DESIGN

### Style de la card ListingRequirementsCard

```css
/* Card */
border-radius: 16px;
border: 1px solid var(--neutral-200);
padding: 1.5rem;
background: white;

/* Titre */
font-size: 0.875rem;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
color: var(--neutral-500);

/* Score */
font-size: 2rem;
font-weight: 700;
font-family: var(--font-serif);

/* Barre de progression */
height: 6px;
border-radius: 3px;
background: var(--neutral-100);
/* Remplissage gradient */
background: linear-gradient(90deg, var(--amber-400), var(--amber-500));

/* Critère ligne */
padding: 0.5rem 0;
border-bottom: 1px solid var(--neutral-50);
display: flex;
justify-content: space-between;
align-items: center;

/* Icônes statut */
.met    { color: var(--green-500); }   /* ✅ */
.unmet  { color: var(--red-400); }     /* ❌ */
.unknown { color: var(--neutral-300); } /* ❓ */

/* Message rassurant */
font-size: 0.8125rem;
color: var(--neutral-500);
background: var(--amber-50);
padding: 0.75rem;
border-radius: 8px;
margin-top: 1rem;
```

### Dark mode
- Card : bg-neutral-900, border-neutral-800
- Score : ambre-400
- Barre : bg-neutral-800, fill ambre-500
- Critères : texte neutral-200
- Icônes : mêmes couleurs

---

## ANTI-DISCRIMINATION — GARDE-FOUS

### Ce que le formulaire propriétaire NE PERMET PAS :

- Aucun critère sur l'âge, l'origine, le sexe, la situation familiale
- Aucun critère sur la nationalité, la religion, l'orientation sexuelle
- Aucun critère sur le handicap, la grossesse, l'apparence physique
- La note libre est passée par un filtre de mots-clés interdits côté serveur

### Filtre de la note libre

```typescript
const FORBIDDEN_TERMS = [
  'français', 'française', 'étranger', 'étrangère',
  'couple', 'célibataire', 'marié', 'enfant', 'bébé',
  'jeune', 'vieux', 'âge', 'senior',
  'homme', 'femme', 'genre',
  'religion', 'musulman', 'chrétien', 'juif',
  'noir', 'blanc', 'arabe', 'asiatique',
  'handicap', 'fauteuil', 'aveugle',
  'enceinte', 'grossesse',
  // ... liste à compléter
];

function validateNotes(notes: string): { valid: boolean; flaggedTerms: string[] } {
  const lower = notes.toLowerCase();
  const flagged = FORBIDDEN_TERMS.filter(term => lower.includes(term));
  return { valid: flagged.length === 0, flaggedTerms: flagged };
}
```

Si des termes sont détectés, afficher un avertissement au propriétaire : "Votre note contient des termes potentiellement discriminants. La loi interdit la discrimination à la location (loi n°2008-496). Veuillez reformuler."

Le message est enregistré quand même (pas de blocage — le proprio est prévenu) mais un flag `hasWarning: true` est ajouté en base pour monitoring.

---

## VÉRIFICATIONS

- [ ] Migration Prisma : ListingRequirements + champs Application créés sans erreur
- [ ] Formulaire proprio : tous les switches marchent, sauvegarde en base
- [ ] Rappel anti-discrimination visible dans le formulaire
- [ ] Filtre note libre : détecte les termes interdits, avertissement affiché
- [ ] Page annonce : card garanties affichée si critères définis
- [ ] Page annonce : card masquée si aucun critère
- [ ] Utilisateur non connecté : critères visibles, pas de score, CTA Passeport
- [ ] Locataire avec Passeport : score calculé, détails personnalisés
- [ ] Locataire sans Passeport complet : critères connus remplis, "?" pour le reste
- [ ] Score calculé correctement (pondération, unknown ignorés)
- [ ] Animation au scroll : critères stagger, barre progression, count-up
- [ ] Candidature : matchScore snapshot dans Application
- [ ] Pipeline : triées par score DESC par défaut
- [ ] Pipeline : colonne match visible avec badge couleur
- [ ] Badge MatchScore dans les cards de recherche (si connecté)
- [ ] Pas de badge dans les cards si non connecté
- [ ] Mobile : card sticky en bas au-dessus du bouton Postuler
- [ ] Dark mode : tous les composants
- [ ] Message rassurant visible si score < 100%
- [ ] API /match retourne 401 si non connecté
- [ ] API /requirements accessible publiquement (GET)
- [ ] API /requirements protégée (PUT — propriétaire uniquement)
- [ ] npm run build → 0 erreurs
