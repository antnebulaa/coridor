# Feature: Passeport Locatif -- Historique locatif verifiable et portable

## Sommaire

1. [Vision et positionnement](#1-vision-et-positionnement)
2. [Analyse des donnees existantes reutilisables](#2-analyse-des-donnees-existantes-reutilisables)
3. [Donnees manquantes a ajouter](#3-donnees-manquantes-a-ajouter)
4. [Schema Prisma complet](#4-schema-prisma-complet)
5. [Questionnaire d'evaluation proprietaire](#5-questionnaire-devaluation-proprietaire)
6. [Score composite du Passeport](#6-score-composite-du-passeport)
7. [Diagramme de relations](#7-diagramme-de-relations)
8. [Considerations anti-discrimination et RGPD](#8-considerations-anti-discrimination-et-rgpd)
9. [Guide de migration](#9-guide-de-migration)
10. [Requetes Prisma courantes](#10-requetes-prisma-courantes)

---

## 1. Vision et positionnement

### Le "LinkedIn de la location"

Le Passeport Locatif est une extension naturelle du Badge Payeur Exemplaire existant. Il transforme l'historique locatif d'un locataire en un profil portable, verifiable, et sous son controle.

**Analogie** : Comme LinkedIn agrege l'historique professionnel d'une personne (postes, recommandations, competences), le Passeport Locatif agrege l'historique locatif (baux, paiements, evaluations proprietaires).

### Composantes du Passeport

| Composante | Source | Verification |
|-----------|--------|-------------|
| Historique des baux | Baux Coridor (auto) + saisie manuelle (hors Coridor) | Coridor = verifie automatiquement ; Externe = declaratif |
| Score de paiement | Badge Payeur Exemplaire existant (Bronze/Silver/Gold) | Verifie via GoCardless/Powens (BankConnection) |
| Evaluations proprietaires | Questionnaire structure en fin de bail | Verifie (lie a un bail reel sur Coridor) |
| Profil locataire | TenantProfile existant (emploi, revenus, garants) | Auto-declare + badge paiement |

### Principe fondamental : le locataire controle

Le locataire decide quelles sections de son Passeport sont visibles lors d'une candidature. Il peut masquer une evaluation negative ou un ancien bail sans explication. C'est son droit.

---

## 2. Analyse des donnees existantes reutilisables

### 2.1 TenantProfile -- Socle du profil locataire

**Fichier** : `prisma/schema.prisma` (lignes 147-184)

Le `TenantProfile` contient deja toutes les donnees de "presentation" du locataire :

| Champ | Role dans le Passeport |
|-------|----------------------|
| `jobType`, `jobTitle`, `netSalary` | Situation professionnelle (affichee dans la synthese) |
| `partnerJobType`, `partnerJobTitle`, `partnerNetSalary` | Foyer (composition couple) |
| `aplAmount`, `aplDirectPayment` | Aides au logement |
| `bio` | Presentation personnelle |
| `guarantors[]` (via relation) | Garants et leur solvabilite |
| `additionalIncomes[]` (via relation) | Revenus complementaires |

**Verdict** : Entierement reutilisable. Pas de modification necessaire.

### 2.2 Badge Payeur Exemplaire -- Coeur du score de paiement

**Fichiers** :
- `prisma/schema.prisma` : champs `badgeLevel`, `verifiedMonths`, `punctualityRate`, `lastVerifiedAt`, `verificationStatus` sur `TenantProfile`
- `services/PaymentVerificationService.ts` : logique d'analyse des BankTransactions
- `components/profile/PaymentBadge.tsx` : composant UI (Bronze/Silver/Gold)
- `app/api/profile/badge/route.ts` : GET badge info
- `app/api/profile/verify-badge/route.ts` : POST trigger verification

**Donnees cles du badge** :

| Champ | Valeur | Seuils |
|-------|--------|--------|
| `badgeLevel` | `"BRONZE"` / `"SILVER"` / `"GOLD"` / `null` | 6 mois / 12 mois / 24 mois |
| `verifiedMonths` | `Int` | Nombre de mois avec paiement detecte |
| `punctualityRate` | `Float` (0-100) | % de paiements avant le 15 du mois |
| `lastVerifiedAt` | `DateTime` | Derniere verification bancaire |
| `verificationStatus` | `"PENDING"` / `"VERIFIED"` / `"FAILED"` / `"EXPIRED"` | Etat du processus |

**Logique existante** (`PaymentVerificationService.analyzePaymentHistory`) :
1. Recupere les `BankTransaction` categorie "Rent" via `BankConnection`
2. Groupe par mois (minimum 3 mois requis)
3. Calcule la ponctualite (paiement avant le 15 = a l'heure)
4. Determine le badge selon le nombre de mois verifies
5. Calcule le montant moyen et le jour de paiement habituel

**Verdict** : Entierement reutilisable. Le badge alimente directement le score composite du Passeport. Pas de modification necessaire.

### 2.3 RentalApplication -- Baux Coridor existants

**Fichier** : `prisma/schema.prisma` (lignes 709-754)

Un `RentalApplication` avec `leaseStatus = "SIGNED"` represente un bail actif sur Coridor. Il contient :

| Champ / Relation | Role dans le Passeport |
|-----------------|----------------------|
| `leaseStatus` (`SIGNED`) | Identifie un bail actif/termine |
| `appliedAt` | Date de debut de la relation locative |
| `leaseEndDate` | Date de fin du bail (si renseignee) |
| `listing` -> `rentalUnit` -> `property` | Acces au type de bien, ville, surface |
| `financials[]` (LeaseFinancials) | Montants du loyer, dates de validite |
| `rentPaymentTrackings[]` | Suivi mensuel des paiements (PAID, LATE, OVERDUE...) |

**Verdict** : Reutilisable pour generer automatiquement l'historique des baux Coridor. La relation `RentalApplication -> Listing -> RentalUnit -> Property` donne acces a toutes les infos du bien (ville, type, surface).

### 2.4 LeaseFinancials -- Durees et montants

**Fichier** : `prisma/schema.prisma` (lignes 756-771)

| Champ | Role |
|-------|------|
| `baseRentCents` | Loyer HC |
| `serviceChargesCents` | Charges |
| `startDate` | Debut de validite |
| `endDate` | Fin (null = actif) |

**Verdict** : Reutilisable pour calculer la duree effective du bail et le loyer moyen.

### 2.5 RentPaymentTracking -- Historique factuel des paiements

**Fichier** : `prisma/schema.prisma` (lignes 1286-1317)

| Champ | Role |
|-------|------|
| `periodMonth`, `periodYear` | Mois concerne |
| `status` | `PAID`, `LATE`, `OVERDUE`, `CRITICAL`, `MANUALLY_CONFIRMED` |
| `expectedDate` / `detectedDate` | Ecart de paiement |
| `isPartialPayment` | Paiement partiel |

**Verdict** : Reutilisable pour alimenter le score de ponctualite interne Coridor (plus fin que le badge GoCardless seul). Permet de generer un historique de paiement mois par mois, verifie par la plateforme.

### 2.6 CandidateEvaluation / EvaluationScore -- Systeme d'evaluation existant

**Fichier** : `prisma/schema.prisma` (lignes 1061-1088)

Le systeme actuel evalue le **candidat** vu par le **proprietaire** lors du processus de selection (post-visite). Les criteres sont :

```
PUNCTUALITY, FILE_COMPLETENESS, INCOME_ADEQUACY, GUARANTOR_QUALITY,
LEASE_COMPATIBILITY, MOVE_IN_FLEXIBILITY, INTEREST_LEVEL,
QUESTIONS_ASKED, CONDITIONS_GRASPED, RENTAL_PROJECT, COUP_DE_COEUR
```

**Peut-on l'adapter pour l'evaluation proprietaire -> locataire en fin de bail ?**

**Non, pour 3 raisons** :
1. **Contexte different** : `CandidateEvaluation` evalue un candidat AVANT le bail (visite). L'evaluation du Passeport evalue un locataire APRES le bail (fin de location).
2. **Criteres differents** : Ponctualite a la visite != ponctualite des paiements ; "interet montre" n'a aucun sens en fin de bail.
3. **Relations differentes** : `CandidateEvaluation` est liee a `Visit` + `RentalApplication`. L'evaluation du Passeport est liee a un bail termine (ou en cours de cloture), sans visite associee.

**Verdict** : Non reutilisable directement. Cependant, le **pattern architectural** est le meme (criteres enum + scores entiers + score composite). On s'en inspire pour `LandlordReview`.

---

## 3. Donnees manquantes a ajouter

### 3.1 Historique de bail hors Coridor (RentalHistory)

Les locataires n'ont pas tous loue via Coridor. Pour que le Passeport soit utile des le premier jour, il faut permettre la saisie manuelle de locations precedentes.

**Donnees requises** :
- Ville et code postal
- Type de bien (appartement, maison, studio, colocation)
- Dates d'entree et de sortie
- Loyer approximatif
- Nom du proprietaire/agence (optionnel, pour verification eventuelle)
- Si c'est un bail Coridor (lien automatique) ou une saisie externe

### 3.2 Evaluation proprietaire en fin de bail (LandlordReview)

Aujourd'hui, le proprietaire n'a aucun moyen de "recommander" un locataire apres la fin du bail. Le Passeport introduit un questionnaire structure de 6 questions.

**Contraintes** :
- Pas de texte libre (anti-discrimination, art. 225-1 Code penal)
- Questions factuelles et verifiables
- Reponses a choix multiples (3 niveaux)
- Lie a un bail reel (pas de fausse evaluation)
- Le locataire doit consentir au partage

### 3.3 Controle de visibilite (PassportSettings)

Le locataire doit pouvoir :
- Activer/desactiver le Passeport globalement
- Choisir quelles sections sont partagees (badge, historique, evaluations)
- Masquer un bail specifique ou une evaluation specifique
- Controler si les evaluations sont visibles avant de candidater

### 3.4 Consentement et dates

Pour la conformite RGPD :
- Date de consentement a l'activation du Passeport
- Date de derniere modification des preferences
- Possibilite de revoquer le consentement (desactiver tout)

---

## 4. Schema Prisma complet

### 4.1 Nouvelles enums

```prisma
// ============================================================
// ENUMS -- Passeport Locatif
// ============================================================

/// Type de bien pour l'historique locatif.
/// Utilise pour les saisies manuelles (les baux Coridor ont deja
/// le type via Property.category).
enum RentalPropertyType {
  APARTMENT       // Appartement
  HOUSE           // Maison
  STUDIO          // Studio
  COLOCATION_ROOM // Chambre en colocation
  OTHER           // Autre
}

/// Source de l'entree dans l'historique.
/// CORIDOR = genere automatiquement depuis un bail signe.
/// MANUAL = saisi par le locataire (declaratif, non verifie).
enum RentalHistorySource {
  CORIDOR   // Bail Coridor (verifie automatiquement)
  MANUAL    // Saisie manuelle (declaratif)
}

/// Criteres d'evaluation du proprietaire vers le locataire en fin de bail.
/// Chaque critere est objectif, factuel, et non-discriminatoire.
/// Voir Section 5 pour le detail de chaque question et ses reponses.
enum LandlordReviewCriterion {
  PAYMENT_PUNCTUALITY     // Ponctualite des paiements
  PROPERTY_CONDITION      // Etat du logement a la sortie
  COMMUNICATION           // Communication et reactivite
  LEASE_COMPLIANCE        // Respect des clauses du bail
  NEIGHBOR_RELATIONS      // Relations de voisinage
  WOULD_RECOMMEND         // Recommandation globale
}

/// Niveaux de reponse pour chaque critere d'evaluation.
/// 3 niveaux seulement : positif / neutre / negatif.
/// Pas de granularite excessive pour eviter les biais.
enum ReviewRating {
  POSITIVE    // Bon / Oui / Excellent
  NEUTRAL     // Correct / Parfois / Avec reserves
  NEGATIVE    // Problematique / Non / Degradations
}
```

### 4.2 Model RentalHistory -- Historique des locations

```prisma
/// Historique locatif du locataire.
/// Combine les baux Coridor (remplis automatiquement) et les locations
/// exterieures (saisies manuellement par le locataire).
///
/// Pour les baux Coridor, les champs sont pre-remplis depuis
/// RentalApplication -> Listing -> RentalUnit -> Property.
/// Le locataire ne peut PAS modifier les donnees d'un bail Coridor.
model RentalHistory {
  id                String               @id @default(uuid())
  tenantProfileId   String
  source            RentalHistorySource  // CORIDOR ou MANUAL

  // ---- Lien Coridor (optionnel, null si MANUAL) ----
  rentalApplicationId String?  @unique   // Bail Coridor associe (1:1)

  // ---- Donnees du bail ----
  city              String               // Ville de la location
  zipCode           String?              // Code postal
  propertyType      RentalPropertyType   // Type de bien
  rentAmountCents   Int?                 // Loyer mensuel approximatif (en centimes)
  startDate         DateTime  @db.Date   // Date d'entree dans le logement
  endDate           DateTime? @db.Date   // Date de sortie (null = en cours)
  landlordName      String?              // Nom du proprietaire/agence (optionnel)

  // ---- Verification ----
  /// true si la source est CORIDOR et le bail est verifie.
  /// false pour les saisies manuelles (non verifiable par Coridor).
  isVerified        Boolean  @default(false)

  // ---- Visibilite ----
  /// Le locataire peut masquer une entree specifique de son Passeport.
  /// Masquee = non visible lors des candidatures, mais toujours stockee.
  isHidden          Boolean  @default(false)

  // ---- Metadata ----
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // ---- Relations ----
  tenantProfile     TenantProfile     @relation(fields: [tenantProfileId], references: [id], onDelete: Cascade)
  rentalApplication RentalApplication? @relation(fields: [rentalApplicationId], references: [id], onDelete: SetNull)
  landlordReview    LandlordReview?   // Evaluation du proprietaire (0 ou 1 par bail)

  @@index([tenantProfileId])
  @@index([source])
  @@index([startDate])
  @@index([isVerified])
}
```

### 4.3 Model LandlordReview -- Evaluation proprietaire structuree

```prisma
/// Evaluation structuree d'un locataire par son ancien proprietaire
/// en fin de bail.
///
/// REGLES :
/// - Liee a un RentalHistory (lui-meme lie a un bail Coridor).
/// - Seul le proprietaire du bail peut remplir l'evaluation.
/// - Le locataire doit avoir donne son consentement.
/// - AUCUN champ texte libre (anti-discrimination by design).
/// - Le locataire peut masquer l'evaluation via isHidden sur RentalHistory.
///
/// Le proprietaire ne peut creer une evaluation QUE si :
/// 1. Le bail est termine (endDate non null) OU en cours de cloture
/// 2. Le bail a dure au minimum 3 mois
/// 3. L'evaluation n'a pas deja ete soumise
model LandlordReview {
  id                String   @id @default(uuid())
  rentalHistoryId   String   @unique  // 1 evaluation par bail
  reviewerId        String             // userId du proprietaire

  // ---- Score composite ----
  /// Calcule cote serveur a partir des scores individuels.
  /// Moyenne simple des ReviewRating converties en numerique :
  /// POSITIVE=3, NEUTRAL=2, NEGATIVE=1 -> Score /3.
  compositeScore    Float

  // ---- Metadata ----
  /// Le locataire a-t-il consenti au partage de cette evaluation ?
  /// L'evaluation est stockee mais non affichee tant que consent = false.
  tenantConsented   Boolean  @default(false)
  consentedAt       DateTime?

  submittedAt       DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // ---- Relations ----
  rentalHistory     RentalHistory      @relation(fields: [rentalHistoryId], references: [id], onDelete: Cascade)
  reviewer          User               @relation("LandlordReviews", fields: [reviewerId], references: [id], onDelete: Cascade)
  scores            LandlordReviewScore[]

  @@index([reviewerId])
  @@index([compositeScore])
}

/// Score individuel pour un critere d'evaluation proprietaire.
/// Chaque evaluation contient exactement 6 scores (un par critere).
model LandlordReviewScore {
  id                String                  @id @default(uuid())
  landlordReviewId  String
  criterion         LandlordReviewCriterion
  rating            ReviewRating

  landlordReview    LandlordReview @relation(fields: [landlordReviewId], references: [id], onDelete: Cascade)

  @@unique([landlordReviewId, criterion])
  @@index([landlordReviewId])
}
```

### 4.4 Model PassportSettings -- Preferences de partage

```prisma
/// Preferences de partage du Passeport Locatif.
/// Le locataire controle ce qu'il partage lors de ses candidatures.
///
/// Principe : opt-in. Par defaut, rien n'est partage.
/// Le locataire active les sections qu'il souhaite rendre visibles.
model PassportSettings {
  id                String   @id @default(uuid())
  tenantProfileId   String   @unique

  // ---- Activation globale ----
  /// Le Passeport est-il active ? Si false, rien n'est visible.
  isEnabled         Boolean  @default(false)

  // ---- Sections partageables ----
  /// Chaque toggle controle la visibilite d'une section.
  showPaymentBadge      Boolean @default(true)   // Badge Payeur (Bronze/Silver/Gold)
  showRentalHistory     Boolean @default(true)   // Historique des baux
  showLandlordReviews   Boolean @default(false)  // Evaluations proprietaires
  showFinancialSummary  Boolean @default(false)  // Synthese financiere (revenus, garants)
  showVerifiedMonths    Boolean @default(true)   // Nombre de mois verifies

  // ---- Consentement RGPD ----
  /// Date d'activation initiale du Passeport.
  activatedAt       DateTime?
  /// Date de derniere modification des preferences.
  lastModifiedAt    DateTime?

  // ---- Relations ----
  tenantProfile     TenantProfile @relation(fields: [tenantProfileId], references: [id], onDelete: Cascade)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### 4.5 Modifications des models existants

#### TenantProfile -- Ajout des relations

```prisma
model TenantProfile {
  // ... tous les champs existants inchanges ...

  // --- NOUVEAU : relations Passeport Locatif ---
  rentalHistory     RentalHistory[]
  passportSettings  PassportSettings?
  // ---
}
```

#### User -- Ajout de la relation LandlordReview

```prisma
model User {
  // ... tous les champs existants inchanges ...

  // --- NOUVEAU : evaluations donnees en tant que proprietaire ---
  landlordReviews   LandlordReview[] @relation("LandlordReviews")
  // ---
}
```

#### RentalApplication -- Ajout de la relation RentalHistory

```prisma
model RentalApplication {
  // ... tous les champs existants inchanges ...

  // --- NOUVEAU : lien vers l'entree du Passeport ---
  rentalHistory     RentalHistory?
  // ---
}
```

---

## 5. Questionnaire d'evaluation proprietaire

### Principes du questionnaire

1. **6 questions** : ni trop peu (pas assez informatif), ni trop (fatigue du repondant)
2. **3 niveaux de reponse** : POSITIVE / NEUTRAL / NEGATIVE -- pas de granularite excessive
3. **Pas de texte libre** : anti-discrimination by design (art. 225-1 Code penal)
4. **Questions factuelles** : portent sur des comportements observables, pas sur des traits personnels
5. **Declenchement** : le proprietaire recoit une notification a la fin du bail (via LegalReminder)

### Detail des 6 questions

#### Q1. PAYMENT_PUNCTUALITY -- Ponctualite des paiements

> "Pendant la duree du bail, comment qualifieriez-vous la regularite des paiements de loyer ?"

| Reponse | Label FR | Signification |
|---------|---------|---------------|
| `POSITIVE` | Toujours a l'heure | Aucun retard significatif pendant toute la duree du bail |
| `NEUTRAL` | Rarement en retard | Quelques retards ponctuels, mais resolus rapidement |
| `NEGATIVE` | Frequemment en retard | Retards reguliers ou impaye(s) pendant le bail |

**Note** : Pour les baux Coridor, cette reponse est recoupee avec les `RentPaymentTracking`. Si le proprietaire repond `POSITIVE` mais que le tracking montre 5 mois LATE, un avertissement est affiche (sans bloquer).

#### Q2. PROPERTY_CONDITION -- Etat du logement

> "Dans quel etat le logement a-t-il ete restitue a la fin du bail ?"

| Reponse | Label FR | Signification |
|---------|---------|---------------|
| `POSITIVE` | Excellent etat | Logement rendu en bon etat, usure normale seulement |
| `NEUTRAL` | Etat correct | Quelques reparations mineures necessaires |
| `NEGATIVE` | Degradations constatees | Degradations significatives au-dela de l'usure normale |

**Garde-fou** : Cette question porte sur l'etat physique du logement, pas sur la "proprete" subjective. L'etat des lieux de sortie fait foi.

#### Q3. COMMUNICATION -- Communication et reactivite

> "Comment evaluez-vous la communication avec votre locataire pendant le bail ?"

| Reponse | Label FR | Signification |
|---------|---------|---------------|
| `POSITIVE` | Reactif et agreable | Repond rapidement, communication fluide |
| `NEUTRAL` | Correct | Communication basique mais fonctionnelle |
| `NEGATIVE` | Difficile | Difficultes de communication, non-reponses frequentes |

#### Q4. LEASE_COMPLIANCE -- Respect des clauses du bail

> "Le locataire a-t-il respecte les clauses du bail (usage des lieux, assurance, preavis) ?"

| Reponse | Label FR | Signification |
|---------|---------|---------------|
| `POSITIVE` | Oui, integralement | Toutes les clauses respectees |
| `NEUTRAL` | Partiellement | Manquements mineurs sans consequence grave |
| `NEGATIVE` | Non | Manquements significatifs aux obligations du bail |

#### Q5. NEIGHBOR_RELATIONS -- Relations de voisinage

> "Avez-vous eu des retours concernant le comportement du locataire vis-a-vis du voisinage ?"

| Reponse | Label FR | Signification |
|---------|---------|---------------|
| `POSITIVE` | Aucun probleme signale | Aucune plainte ou incident rapporte |
| `NEUTRAL` | Incidents mineurs | Quelques incidents isoles, resolus a l'amiable |
| `NEGATIVE` | Problemes recurrents | Plaintes repetees du voisinage ou du syndic |

**Garde-fou** : Cette question porte sur les signalements factuels (plaintes au syndic, courriers), pas sur l'opinion personnelle du proprietaire.

#### Q6. WOULD_RECOMMEND -- Recommandation globale

> "Recommanderiez-vous ce locataire a un autre proprietaire ?"

| Reponse | Label FR | Signification |
|---------|---------|---------------|
| `POSITIVE` | Oui, sans reserve | Locataire recommande sans hesitation |
| `NEUTRAL` | Oui, avec reserves | Recommandation sous conditions ou avec nuances |
| `NEGATIVE` | Non | Ne recommanderait pas ce locataire |

### Score numerique de l'evaluation

Chaque `ReviewRating` est converti en score numerique :

| Rating | Score |
|--------|-------|
| `POSITIVE` | 3 |
| `NEUTRAL` | 2 |
| `NEGATIVE` | 1 |

Le `compositeScore` de la `LandlordReview` est la **moyenne des 6 scores** :

```
compositeScore = (sum of 6 ratings as numbers) / 6
```

Plage : **1.00** (tout negatif) a **3.00** (tout positif).

---

## 6. Score composite du Passeport

### Vision d'ensemble

Le Passeport Locatif produit un **score global** qui synthetise la fiabilite d'un locataire. Ce score est indicatif -- il aide le proprietaire mais ne remplace pas son jugement.

### Composantes et poids

| Composante | Poids | Source | Justification |
|-----------|-------|--------|---------------|
| **Badge Payeur** | 40% | `TenantProfile.badgeLevel`, `punctualityRate` | Le paiement est le critere #1 des proprietaires |
| **Anciennete locative** | 20% | `RentalHistory[]` (somme des mois) | Un historique long = plus de donnees = plus de confiance |
| **Evaluations proprietaires** | 25% | `LandlordReview.compositeScore` (moyenne) | La recommandation d'un pair est tres valorisee |
| **Completude du dossier** | 15% | Nombre de champs remplis sur TenantProfile + documents | Un dossier complet = candidat serieux |

### Formule detaillee

```typescript
interface PassportScoreInput {
  // Badge Payeur
  badgeLevel: "GOLD" | "SILVER" | "BRONZE" | null;
  punctualityRate: number | null;      // 0-100
  verifiedMonths: number;

  // Anciennete
  totalRentalMonths: number;           // Mois cumules (Coridor + externes)
  verifiedRentalMonths: number;        // Mois verifies (Coridor uniquement)

  // Evaluations
  landlordReviews: {
    compositeScore: number;            // 1.00 - 3.00
    isVerified: boolean;               // Evaluation sur bail Coridor
  }[];

  // Completude
  profileCompleteness: number;         // 0-100
}

function computePassportScore(input: PassportScoreInput): {
  globalScore: number;      // 0 - 100
  badgeScore: number;       // 0 - 100 (sous-score)
  tenureScore: number;      // 0 - 100 (sous-score)
  reviewScore: number;      // 0 - 100 (sous-score)
  completenessScore: number; // 0 - 100 (sous-score)
  confidence: "LOW" | "MEDIUM" | "HIGH";
} {
  // ── 1. Badge Payeur (40%) ──────────────────────────────────
  // Combine le niveau du badge et la ponctualite.
  const badgeLevelScore = {
    GOLD: 100,
    SILVER: 75,
    BRONZE: 50,
    null: 0,
  }[input.badgeLevel ?? "null"] ?? 0;

  const punctuality = input.punctualityRate ?? 0;

  // Si pas de badge, le score est 0 (pas de paiement verifie).
  // Si badge existe : 60% niveau + 40% ponctualite.
  const badgeScore = input.badgeLevel
    ? badgeLevelScore * 0.6 + punctuality * 0.4
    : 0;

  // ── 2. Anciennete locative (20%) ───────────────────────────
  // Plafonner a 60 mois (5 ans) pour eviter que l'anciennete
  // ecrase les autres criteres.
  const cappedMonths = Math.min(input.totalRentalMonths, 60);
  const tenureBase = (cappedMonths / 60) * 100;

  // Bonus de verification : les mois Coridor comptent plus.
  const verificationRatio = input.totalRentalMonths > 0
    ? input.verifiedRentalMonths / input.totalRentalMonths
    : 0;
  const tenureScore = tenureBase * (0.7 + 0.3 * verificationRatio);

  // ── 3. Evaluations proprietaires (25%) ─────────────────────
  let reviewScore = 0;
  if (input.landlordReviews.length > 0) {
    // Moyenne ponderee : les evaluations verifiees comptent double.
    let weightedSum = 0;
    let totalWeight = 0;
    for (const review of input.landlordReviews) {
      const weight = review.isVerified ? 2 : 1;
      // Convertir 1.00-3.00 en 0-100
      const normalizedScore = ((review.compositeScore - 1) / 2) * 100;
      weightedSum += normalizedScore * weight;
      totalWeight += weight;
    }
    reviewScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // ── 4. Completude du dossier (15%) ─────────────────────────
  const completenessScore = input.profileCompleteness;

  // ── Score global ───────────────────────────────────────────
  const globalScore = Math.round(
    badgeScore * 0.40 +
    tenureScore * 0.20 +
    reviewScore * 0.25 +
    completenessScore * 0.15
  );

  // ── Indice de confiance ────────────────────────────────────
  // Mesure la quantite de donnees verifiees disponibles.
  let confidence: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  const hasVerifiedBadge = input.badgeLevel !== null;
  const hasVerifiedHistory = input.verifiedRentalMonths >= 6;
  const hasVerifiedReview = input.landlordReviews.some(r => r.isVerified);
  const verifiedCount = [hasVerifiedBadge, hasVerifiedHistory, hasVerifiedReview]
    .filter(Boolean).length;

  if (verifiedCount >= 3) confidence = "HIGH";
  else if (verifiedCount >= 1) confidence = "MEDIUM";

  return {
    globalScore: Math.min(100, Math.max(0, globalScore)),
    badgeScore: Math.round(badgeScore),
    tenureScore: Math.round(tenureScore),
    reviewScore: Math.round(reviewScore),
    completenessScore: Math.round(completenessScore),
    confidence,
  };
}
```

### Affichage du score

| Score | Jauge | Interpretation |
|-------|-------|---------------|
| 80-100 | Excellent | Locataire avec un historique solide et verifie |
| 60-79 | Bon | Bon historique, quelques donnees manquantes |
| 40-59 | Moyen | Historique limite ou donnees insuffisantes |
| 0-39 | Insuffisant | Peu de donnees ou problemes identifies |

**L'indice de confiance** est affiche a cote du score :
- `HIGH` : "Score base sur des donnees verifiees" (badge vert)
- `MEDIUM` : "Certaines donnees sont declaratives" (badge jaune)
- `LOW` : "Peu de donnees verifiees disponibles" (badge gris)

---

## 7. Diagramme de relations

```
                    +-----------+
                    |   User    |
                    | (TENANT)  |
                    +-----+-----+
                          |
                          | 1:1
                          v
                    +-----+----------+
                    | TenantProfile  |
                    | (existant)     |
                    +--+-----+----+--+
                       |     |    |
            +----------+     |    +-------------+
            |                |                  |
            v                v                  v
     +------+-------+  +----+--------+   +-----+---------+
     | RentalHistory |  | Passport   |   | PaymentBadge  |
     | (NOUVEAU)     |  | Settings   |   | (champs       |
     | ............. |  | (NOUVEAU)  |   |  existants)   |
     | city          |  | .......... |   | badgeLevel    |
     | propertyType  |  | isEnabled  |   | verifiedMonths|
     | startDate     |  | show...    |   | punctuality   |
     | endDate       |  +------------+   +---------+-----+
     | source        |                             |
     | isVerified    |                   +---------+----------+
     +--+------+--+-+                   | BankConnection     |
        |      |  |                     | -> BankTransaction |
        |      |  |                     | -> PaymentVerif    |
        |      |  |                     |    Service.ts      |
        |      |  |                     +--------------------+
        |      |  |
        |      |  +-- rentalApplicationId (optionnel)
        |      |           |
        |      |           v
        |      |  +--------+----------+
        |      |  | RentalApplication |
        |      |  | (existant)        |
        |      |  | leaseStatus=SIGNED|
        |      |  +-+---------+-------+
        |      |    |         |
        |      |    v         v
        |      |  Listing   LeaseFinancials
        |      |    |       RentPaymentTracking
        |      |    v
        |      |  RentalUnit -> Property
        |      |    (city, type, surface)
        |      |
        |      +------- 0:1
        |                |
        v                v
   +----+----+    +------+--------+
   | isHidden |   | LandlordReview|
   | (toggle) |   | (NOUVEAU)     |
   +----------+   | ............. |
                  | compositeScore|
                  | tenantConsented|
                  +-------+-------+
                          |
                          | 1:N
                          v
                  +-------+----------+
                  | LandlordReview   |
                  | Score            |
                  | (NOUVEAU)        |
                  | ................ |
                  | criterion (enum) |
                  | rating (enum)    |
                  +------------------+
```

### Relations detaillees

| Relation | Type | Description |
|----------|------|-------------|
| `TenantProfile` -> `RentalHistory` | 1:N | Un locataire a plusieurs entrees d'historique |
| `TenantProfile` -> `PassportSettings` | 1:1 | Un seul jeu de preferences par locataire |
| `RentalHistory` -> `RentalApplication` | N:1 (opt.) | Lien optionnel vers le bail Coridor |
| `RentalHistory` -> `LandlordReview` | 1:1 (opt.) | Au plus une evaluation par bail |
| `LandlordReview` -> `LandlordReviewScore` | 1:N | 6 scores par evaluation (un par critere) |
| `LandlordReview` -> `User` (reviewer) | N:1 | Le proprietaire qui a redige l'evaluation |

---

## 8. Considerations anti-discrimination et RGPD

### Anti-discrimination

| Mesure | Implementation |
|--------|---------------|
| **Pas de texte libre** | `LandlordReview` et `LandlordReviewScore` ne contiennent AUCUN champ `String` libre. Impossible d'ecrire "locataire bruyant" ou tout autre commentaire subjectif. |
| **Criteres factuels** | Les 6 criteres portent sur des comportements observables : paiement, etat du logement, communication, respect du bail, voisinage. |
| **3 niveaux seulement** | L'echelle POSITIVE/NEUTRAL/NEGATIVE est volontairement simple pour eviter la sur-interpretation. |
| **Recoupement automatique** | Pour les baux Coridor, la reponse "PAYMENT_PUNCTUALITY" est recoupee avec les donnees objectives de `RentPaymentTracking`. |
| **Le locataire controle** | Le locataire peut masquer n'importe quelle evaluation ou entree d'historique. Un proprietaire mal intentionne ne peut pas "tagger" un locataire a son insu. |

### Conformite RGPD

| Exigence | Implementation |
|----------|---------------|
| **Consentement** | `PassportSettings.isEnabled` + `activatedAt`. Le Passeport est desactive par defaut (opt-in). |
| **Droit a l'oubli** | Desactiver `isEnabled` masque tout. L'effacement complet supprime les `RentalHistory` source `MANUAL` et les `PassportSettings`. Les `LandlordReview` sont anonymisees. |
| **Portabilite** | Le locataire peut exporter son Passeport en JSON/PDF (a implementer en API). |
| **Minimisation** | Seules les donnees strictement necessaires sont collectees. Pas de numero de telephone du proprietaire, pas de photo du logement. |
| **Duree de conservation** | Les evaluations et historiques sont conserves tant que le compte est actif. Apres suppression du compte : anonymisation sous 30 jours. |
| **Base legale** | Consentement explicite pour l'activation du Passeport. Interet legitime pour le stockage des baux Coridor (execution du contrat). |

---

## 9. Guide de migration

### Vue d'ensemble

| Etape | Type | Breaking change ? |
|-------|------|:-:|
| Ajout des enums (`RentalPropertyType`, `RentalHistorySource`, `LandlordReviewCriterion`, `ReviewRating`) | `CREATE TYPE` | Non |
| Creation `RentalHistory` | `CREATE TABLE` | Non |
| Creation `LandlordReview` | `CREATE TABLE` | Non |
| Creation `LandlordReviewScore` | `CREATE TABLE` | Non |
| Creation `PassportSettings` | `CREATE TABLE` | Non |
| Ajout relation `TenantProfile.rentalHistory` | Relation Prisma (pas de colonne) | Non |
| Ajout relation `TenantProfile.passportSettings` | Relation Prisma (pas de colonne) | Non |
| Ajout relation `User.landlordReviews` | Relation Prisma (pas de colonne) | Non |
| Ajout relation `RentalApplication.rentalHistory` | Relation Prisma (pas de colonne) | Non |

**Aucun breaking change.** Toutes les modifications sont additives.

### Etape 1 : Creer les nouvelles enums

```sql
-- Migration: add_passport_enums
CREATE TYPE "RentalPropertyType" AS ENUM (
  'APARTMENT', 'HOUSE', 'STUDIO', 'COLOCATION_ROOM', 'OTHER'
);

CREATE TYPE "RentalHistorySource" AS ENUM (
  'CORIDOR', 'MANUAL'
);

CREATE TYPE "LandlordReviewCriterion" AS ENUM (
  'PAYMENT_PUNCTUALITY', 'PROPERTY_CONDITION', 'COMMUNICATION',
  'LEASE_COMPLIANCE', 'NEIGHBOR_RELATIONS', 'WOULD_RECOMMEND'
);

CREATE TYPE "ReviewRating" AS ENUM (
  'POSITIVE', 'NEUTRAL', 'NEGATIVE'
);
```

### Etape 2 : Creer les nouvelles tables

```sql
-- Migration: create_passport_tables

-- RentalHistory
CREATE TABLE "RentalHistory" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenantProfileId" TEXT NOT NULL,
  "source" "RentalHistorySource" NOT NULL,
  "rentalApplicationId" TEXT,
  "city" TEXT NOT NULL,
  "zipCode" TEXT,
  "propertyType" "RentalPropertyType" NOT NULL,
  "rentAmountCents" INTEGER,
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "landlordName" TEXT,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RentalHistory_tenantProfileId_fkey"
    FOREIGN KEY ("tenantProfileId") REFERENCES "TenantProfile"("id") ON DELETE CASCADE,
  CONSTRAINT "RentalHistory_rentalApplicationId_fkey"
    FOREIGN KEY ("rentalApplicationId") REFERENCES "RentalApplication"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "RentalHistory_rentalApplicationId_key" ON "RentalHistory"("rentalApplicationId");
CREATE INDEX "RentalHistory_tenantProfileId_idx" ON "RentalHistory"("tenantProfileId");
CREATE INDEX "RentalHistory_source_idx" ON "RentalHistory"("source");
CREATE INDEX "RentalHistory_startDate_idx" ON "RentalHistory"("startDate");
CREATE INDEX "RentalHistory_isVerified_idx" ON "RentalHistory"("isVerified");

-- LandlordReview
CREATE TABLE "LandlordReview" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "rentalHistoryId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "compositeScore" DOUBLE PRECISION NOT NULL,
  "tenantConsented" BOOLEAN NOT NULL DEFAULT false,
  "consentedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandlordReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LandlordReview_rentalHistoryId_fkey"
    FOREIGN KEY ("rentalHistoryId") REFERENCES "RentalHistory"("id") ON DELETE CASCADE,
  CONSTRAINT "LandlordReview_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "LandlordReview_rentalHistoryId_key" ON "LandlordReview"("rentalHistoryId");
CREATE INDEX "LandlordReview_reviewerId_idx" ON "LandlordReview"("reviewerId");
CREATE INDEX "LandlordReview_compositeScore_idx" ON "LandlordReview"("compositeScore");

-- LandlordReviewScore
CREATE TABLE "LandlordReviewScore" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "landlordReviewId" TEXT NOT NULL,
  "criterion" "LandlordReviewCriterion" NOT NULL,
  "rating" "ReviewRating" NOT NULL,
  CONSTRAINT "LandlordReviewScore_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LandlordReviewScore_landlordReviewId_fkey"
    FOREIGN KEY ("landlordReviewId") REFERENCES "LandlordReview"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "LandlordReviewScore_landlordReviewId_criterion_key"
  ON "LandlordReviewScore"("landlordReviewId", "criterion");
CREATE INDEX "LandlordReviewScore_landlordReviewId_idx"
  ON "LandlordReviewScore"("landlordReviewId");

-- PassportSettings
CREATE TABLE "PassportSettings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenantProfileId" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "showPaymentBadge" BOOLEAN NOT NULL DEFAULT true,
  "showRentalHistory" BOOLEAN NOT NULL DEFAULT true,
  "showLandlordReviews" BOOLEAN NOT NULL DEFAULT false,
  "showFinancialSummary" BOOLEAN NOT NULL DEFAULT false,
  "showVerifiedMonths" BOOLEAN NOT NULL DEFAULT true,
  "activatedAt" TIMESTAMP(3),
  "lastModifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PassportSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PassportSettings_tenantProfileId_fkey"
    FOREIGN KEY ("tenantProfileId") REFERENCES "TenantProfile"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "PassportSettings_tenantProfileId_key" ON "PassportSettings"("tenantProfileId");
```

### Etape 3 : Backfill des baux Coridor existants

Pour les locataires ayant deja des baux signes sur Coridor, on peut generer automatiquement les entrees `RentalHistory` :

```sql
-- Backfill: creer un RentalHistory pour chaque bail signe
INSERT INTO "RentalHistory" (
  "id", "tenantProfileId", "source", "rentalApplicationId",
  "city", "zipCode", "propertyType", "rentAmountCents",
  "startDate", "endDate", "isVerified", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  tp.id,
  'CORIDOR',
  ra.id,
  COALESCE(p.city, 'Inconnue'),
  p."zipCode",
  CASE p.category
    WHEN 'Apartment' THEN 'APARTMENT'::"RentalPropertyType"
    WHEN 'House' THEN 'HOUSE'::"RentalPropertyType"
    WHEN 'Studio' THEN 'STUDIO'::"RentalPropertyType"
    ELSE 'APARTMENT'::"RentalPropertyType"
  END,
  lf."baseRentCents" + lf."serviceChargesCents",
  lf."startDate",
  lf."endDate",
  true,
  NOW(),
  NOW()
FROM "RentalApplication" ra
JOIN "TenantCandidateScope" tcs ON ra."candidateScopeId" = tcs.id
JOIN "TenantProfile" tp ON tp."userId" = tcs."creatorUserId"
JOIN "Listing" l ON ra."listingId" = l.id
JOIN "RentalUnit" ru ON l."rentalUnitId" = ru.id
JOIN "Property" p ON ru."propertyId" = p.id
LEFT JOIN LATERAL (
  SELECT "baseRentCents", "serviceChargesCents", "startDate", "endDate"
  FROM "LeaseFinancials"
  WHERE "rentalApplicationId" = ra.id
  ORDER BY "startDate" DESC
  LIMIT 1
) lf ON true
WHERE ra."leaseStatus" = 'SIGNED'
  AND NOT EXISTS (
    SELECT 1 FROM "RentalHistory" rh WHERE rh."rentalApplicationId" = ra.id
  );
```

### Script TypeScript de backfill (recommande)

Un script TypeScript est disponible dans `scripts/backfill-rental-history.ts`, qui reproduit la meme logique que le SQL ci-dessus mais via Prisma Client :

```bash
# Verifier d'abord ce qui sera cree (sans modification)
npx ts-node scripts/backfill-rental-history.ts --dry-run

# Executer le backfill
npx ts-node scripts/backfill-rental-history.ts
```

### Commandes Prisma

```bash
# 1. Mettre a jour le schema.prisma avec les modifications ci-dessus
# 2. Generer la migration
npx prisma migrate dev --name add_passport_locatif

# 3. Si besoin de backfill, executer le script TypeScript (voir ci-dessus)
npx ts-node scripts/backfill-rental-history.ts --dry-run

# 4. Regenerer le client
npx prisma generate
```

---

## 10. Requetes Prisma courantes

### Recuperer le Passeport complet d'un locataire

```typescript
const passport = await prisma.tenantProfile.findUnique({
  where: { userId: tenantUserId },
  include: {
    // Preferences de partage
    passportSettings: true,

    // Historique locatif (non masque)
    rentalHistory: {
      where: { isHidden: false },
      orderBy: { startDate: "desc" },
      include: {
        landlordReview: {
          include: { scores: true },
        },
      },
    },

    // Garants et revenus (pour completude)
    guarantors: { include: { additionalIncomes: true } },
    additionalIncomes: true,
  },
});
```

### Recuperer le Passeport filtre par les preferences de visibilite

```typescript
function getVisiblePassport(passport: FullPassport) {
  const settings = passport.passportSettings;
  if (!settings?.isEnabled) return null;

  return {
    // Badge Payeur
    paymentBadge: settings.showPaymentBadge
      ? {
          level: passport.badgeLevel,
          verifiedMonths: settings.showVerifiedMonths
            ? passport.verifiedMonths
            : undefined,
          punctualityRate: passport.punctualityRate,
        }
      : undefined,

    // Historique des baux
    rentalHistory: settings.showRentalHistory
      ? passport.rentalHistory
      : undefined,

    // Evaluations proprietaires (uniquement si consenties)
    landlordReviews: settings.showLandlordReviews
      ? passport.rentalHistory
          .filter((rh) => rh.landlordReview?.tenantConsented)
          .map((rh) => rh.landlordReview)
      : undefined,

    // Synthese financiere
    financialSummary: settings.showFinancialSummary
      ? {
          netSalary: passport.netSalary,
          partnerNetSalary: passport.partnerNetSalary,
          aplAmount: passport.aplAmount,
        }
      : undefined,
  };
}
```

### Creer une evaluation proprietaire en fin de bail

```typescript
async function submitLandlordReview(
  reviewerId: string,
  rentalHistoryId: string,
  scores: { criterion: LandlordReviewCriterion; rating: ReviewRating }[]
) {
  // 1. Verifier que le reviewer est bien le proprietaire du bail
  const rentalHistory = await prisma.rentalHistory.findUnique({
    where: { id: rentalHistoryId },
    include: {
      rentalApplication: {
        include: {
          listing: {
            include: {
              rentalUnit: { include: { property: true } },
            },
          },
        },
      },
    },
  });

  if (!rentalHistory?.rentalApplication) {
    throw new Error("Seuls les baux Coridor peuvent etre evalues");
  }

  const ownerId =
    rentalHistory.rentalApplication.listing.rentalUnit.property.ownerId;
  if (ownerId !== reviewerId) {
    throw new Error("Non autorise");
  }

  // 2. Verifier que le bail a dure au moins 3 mois
  const startDate = new Date(rentalHistory.startDate);
  const endDate = rentalHistory.endDate
    ? new Date(rentalHistory.endDate)
    : new Date();
  const monthsDiff =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  if (monthsDiff < 3) {
    throw new Error("Le bail doit avoir dure au moins 3 mois");
  }

  // 3. Calculer le score composite
  const ratingToScore: Record<ReviewRating, number> = {
    POSITIVE: 3,
    NEUTRAL: 2,
    NEGATIVE: 1,
  };
  const totalScore = scores.reduce(
    (sum, s) => sum + ratingToScore[s.rating],
    0
  );
  const compositeScore = totalScore / scores.length;

  // 4. Creer l'evaluation avec ses scores
  return prisma.landlordReview.create({
    data: {
      rentalHistoryId,
      reviewerId,
      compositeScore,
      scores: {
        create: scores.map((s) => ({
          criterion: s.criterion,
          rating: s.rating,
        })),
      },
    },
    include: { scores: true },
  });
}
```

### Calculer le score Passeport pour un locataire

```typescript
async function computePassportScoreForTenant(userId: string) {
  const profile = await prisma.tenantProfile.findUnique({
    where: { userId },
    include: {
      rentalHistory: {
        where: { isHidden: false },
        include: {
          landlordReview: {
            where: { tenantConsented: true },
          },
        },
      },
      guarantors: true,
      additionalIncomes: true,
    },
  });

  if (!profile) return null;

  // Calculer les mois locatifs
  let totalMonths = 0;
  let verifiedMonths = 0;
  for (const rh of profile.rentalHistory) {
    const start = new Date(rh.startDate);
    const end = rh.endDate ? new Date(rh.endDate) : new Date();
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    totalMonths += Math.max(0, months);
    if (rh.isVerified) verifiedMonths += Math.max(0, months);
  }

  // Collecter les evaluations
  const reviews = profile.rentalHistory
    .filter((rh) => rh.landlordReview)
    .map((rh) => ({
      compositeScore: rh.landlordReview!.compositeScore,
      isVerified: rh.isVerified,
    }));

  // Completude du profil
  const fields = [
    profile.jobType,
    profile.jobTitle,
    profile.netSalary,
    profile.bio,
    profile.guarantors.length > 0,
    profile.rentalHistory.length > 0,
    profile.badgeLevel,
  ];
  const filled = fields.filter(
    (f) => f !== null && f !== undefined && f !== "" && f !== false
  ).length;
  const profileCompleteness = Math.round((filled / fields.length) * 100);

  return computePassportScore({
    badgeLevel: profile.badgeLevel as any,
    punctualityRate: profile.punctualityRate,
    verifiedMonths: profile.verifiedMonths,
    totalRentalMonths: totalMonths,
    verifiedRentalMonths: verifiedMonths,
    landlordReviews: reviews,
    profileCompleteness,
  });
}
```

### Generer automatiquement un RentalHistory a la signature d'un bail

```typescript
async function onLeaseSignedHook(rentalApplicationId: string) {
  const application = await prisma.rentalApplication.findUnique({
    where: { id: rentalApplicationId },
    include: {
      listing: {
        include: {
          rentalUnit: { include: { property: true } },
        },
      },
      candidateScope: true,
      financials: { orderBy: { startDate: "desc" }, take: 1 },
    },
  });

  if (!application) return;

  const property = application.listing.rentalUnit.property;
  const financial = application.financials[0];

  // Trouver le TenantProfile du locataire
  const tenantProfile = await prisma.tenantProfile.findUnique({
    where: { userId: application.candidateScope.creatorUserId },
  });
  if (!tenantProfile) return;

  // Mapper le type de bien
  const categoryMap: Record<string, string> = {
    Apartment: "APARTMENT",
    House: "HOUSE",
    Studio: "STUDIO",
  };

  await prisma.rentalHistory.upsert({
    where: { rentalApplicationId: application.id },
    create: {
      tenantProfileId: tenantProfile.id,
      source: "CORIDOR",
      rentalApplicationId: application.id,
      city: property.city || "Inconnue",
      zipCode: property.zipCode,
      propertyType: (categoryMap[property.category] ||
        "APARTMENT") as any,
      rentAmountCents: financial
        ? financial.baseRentCents + financial.serviceChargesCents
        : null,
      startDate: financial?.startDate || new Date(),
      isVerified: true,
    },
    update: {}, // Ne rien faire si deja existant
  });
}
```
