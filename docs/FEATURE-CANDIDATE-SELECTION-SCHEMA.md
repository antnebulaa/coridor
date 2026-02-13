# Feature: Systeme de Selection Progressive des Candidats

## Sommaire

1. [Analyse du schema existant](#1-analyse-du-schema-existant)
2. [Architecture de la solution](#2-architecture-de-la-solution)
3. [Schema Prisma complet](#3-schema-prisma-complet)
4. [Diagramme de relations](#4-diagramme-de-relations)
5. [Considerations anti-discrimination](#5-considerations-anti-discrimination)
6. [Guide de migration](#6-guide-de-migration)

---

## 1. Analyse du schema existant

### Models concernes et leurs roles actuels

**User** -- Le proprietaire (LANDLORD) et le locataire (TENANT) partagent le meme model. Le champ `userMode` distingue les deux. Le proprietaire possede des `Property` et, par extension, des `Listing`. Le locataire possede un `TenantProfile` et peut creer des `TenantCandidateScope` pour postuler.

**Property > RentalUnit > Listing** -- Architecture 3 niveaux. Un `Property` (bien physique) contient des `RentalUnit` (logement entier, chambre privee), chacun pouvant avoir un ou plusieurs `Listing` (offre commerciale). Le proprietaire est lie via `Property.ownerId`.

**TenantCandidateScope** -- Represente un "dossier de candidature" : solo, couple, ou groupe. Contient la composition (nombre d'enfants, statut legal du couple) et le type de bail vise. Peut etre reutilise pour plusieurs candidatures.

**RentalApplication** -- La candidature formelle d'un `TenantCandidateScope` sur un `Listing`. Pipeline actuel :
`PENDING -> SENT -> VISIT_PROPOSED -> VISIT_CONFIRMED -> ACCEPTED | REJECTED`

**Visit** -- Une visite planifiee entre un candidat (`candidateId` -> `User`) et un `Listing`. Statuts : `PENDING`, `CONFIRMED`, `CANCELLED`. Contient date, creneau horaire. Pas de lien direct avec `RentalApplication` actuellement.

**TenantProfile** -- Dossier financier du locataire : salaire, emploi, garants, revenus complementaires. C'est la source de donnees pour les criteres d'evaluation structuree.

### Lacunes identifiees pour la selection

| Manque | Impact |
|--------|--------|
| Pas de lien Visit <-> RentalApplication | Impossible de savoir quelle candidature correspond a quelle visite |
| Pas de systeme d'evaluation post-visite | Le proprio ne peut pas noter ses impressions |
| Pas de rounds de selection | Pas de tri progressif |
| Pas de comparaison structuree | Le proprio doit comparer "de memoire" |
| ApplicationStatus manque d'etats intermediaires | Pas de SHORTLISTED, FINALIST, SELECTED |

---

## 2. Architecture de la solution

### Principes directeurs

1. **Anti-discrimination absolue** -- Aucun champ texte libre. Tous les criteres sont pre-definis et objectifs. Les raisons d'elimination sont structurees.
2. **Tracabilite** -- Chaque decision est horodatee et tracable (audit trail).
3. **Flexibilite** -- Le proprietaire peut personnaliser les criteres par listing (tous les biens n'ont pas les memes enjeux).
4. **Performance** -- Index sur les requetes frequentes (evaluations par listing, classement par score).
5. **Non-destructif** -- Les evaluations et decisions sont historisees, jamais supprimees.

### Flux utilisateur

```
Visites planifiees (Visit CONFIRMED)
        |
        v
Evaluation post-visite (CandidateEvaluation)
  - Le proprio note chaque critere de 1 a 5
  - Score composite calcule automatiquement
        |
        v
Round 1 : Tous les candidats (APPLIED)
  - Le proprio voit le classement par score
  - Il selectionne les candidats pour la shortlist
        |
        v
Round 2 : Shortlist (SHORTLISTED)
  - Comparaison approfondie
  - Le proprio selectionne les finalistes
        |
        v
Round 3 : Finalistes (FINALIST)
  - Derniere comparaison
  - Le proprio choisit le retenu
        |
        v
Round 4 : Candidat retenu (SELECTED)
  - Les autres sont notifies automatiquement
  - Transition vers la signature du bail
```

---

## 3. Schema Prisma complet

### 3.1 Nouvelles enums

```prisma
// ============================================================
// ENUMS -- Systeme de selection des candidats
// ============================================================

/// Criteres d'evaluation post-visite.
/// Chaque critere est objectif, mesurable, et non-discriminatoire.
/// Labels FR fournis en commentaire pour le front-end (i18n).
enum EvaluationCriterion {
  PUNCTUALITY            // Ponctualite -- Le candidat etait-il a l'heure ?
  FILE_COMPLETENESS      // Completude du dossier -- Le dossier est-il complet ?
  INCOME_ADEQUACY        // Adequation des revenus -- Revenus vs loyer (ratio)
  GUARANTOR_QUALITY      // Qualite des garanties -- Garant(s) solide(s) ?
  LEASE_COMPATIBILITY    // Compatibilite bail -- Duree et type de bail souhaite compatible ?
  MOVE_IN_FLEXIBILITY    // Flexibilite d'emmenagement -- Disponibilite vs date souhaitee
  PROFILE_STABILITY      // Stabilite du profil -- CDI, anciennete, etc.
  HOUSING_ADEQUACY       // Adequation logement/profil -- Taille menage vs surface
}

/// Rounds de selection (entonnoir progressif).
enum SelectionRound {
  APPLIED      // Tous les candidats ayant postule
  SHORTLISTED  // Pre-selectionnes apres evaluation
  FINALIST     // Finalistes (2-3 candidats)
  SELECTED     // Candidat retenu (1 seul)
}

/// Raisons structurees d'elimination.
/// Anti-discrimination : aucun texte libre possible.
/// Chaque raison est objective et verifiable.
enum EliminationReason {
  INCOMPLETE_FILE              // Dossier incomplet
  INSUFFICIENT_INCOME          // Revenus insuffisants (ratio < seuil)
  NO_GUARANTOR                 // Absence de garant requis
  WEAK_GUARANTOR               // Garant insuffisant
  INCOMPATIBLE_LEASE_TYPE      // Type de bail incompatible
  INCOMPATIBLE_MOVE_IN_DATE    // Date d'emmenagement incompatible
  OVERQUALIFIED_SURFACE        // Menage trop grand pour la surface
  UNDERQUALIFIED_SURFACE       // Menage trop petit (critere energetique)
  VISIT_NO_SHOW                // Absence a la visite sans prevenir
  VISIT_CANCELLED_BY_CANDIDATE // Visite annulee par le candidat
  CANDIDATE_WITHDREW           // Le candidat s'est desiste
  BETTER_SCORING_CANDIDATE     // Un autre candidat a un meilleur score global
  LOWER_OVERALL_RANKING        // Classement general inferieur
}

/// Echelle de notation unifiee (1 a 5).
/// On utilise des Int dans le model, mais cette documentation
/// definit la semantique de chaque valeur.
///
///   1 = Insuffisant
///   2 = Faible
///   3 = Correct
///   4 = Bon
///   5 = Excellent
```

### 3.2 Modifications des enums existantes

```prisma
/// ApplicationStatus etendu avec les etats de selection.
/// Les nouveaux etats s'inserent apres VISIT_CONFIRMED.
enum ApplicationStatus {
  PENDING
  SENT
  REJECTED
  VISIT_PROPOSED
  VISIT_CONFIRMED
  // --- Nouveaux etats de selection ---
  SHORTLISTED         // Candidat pre-selectionne
  FINALIST            // Candidat finaliste
  SELECTED            // Candidat retenu
  // ---
  ACCEPTED            // Bail en cours de signature (existant)
}
```

**Note importante** : L'ajout de valeurs a un enum PostgreSQL est non-destructif. Les lignes existantes avec les anciennes valeurs restent valides. Aucun breaking change.

### 3.3 Modification du model Visit existant

```prisma
model Visit {
  id              String      @id @default(uuid())
  listingId       String
  candidateId     String
  date            DateTime
  startTime       String
  endTime         String
  status          VisitStatus @default(PENDING)
  confirmedAt     DateTime?
  reminderSentAt  DateTime?
  createdAt       DateTime    @default(now())

  // --- NOUVEAU : lien vers la candidature ---
  applicationId   String?
  application     RentalApplication? @relation(fields: [applicationId], references: [id], onDelete: SetNull)
  // ---

  listing     Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  candidate   User    @relation(fields: [candidateId], references: [id], onDelete: Cascade)

  // --- NOUVEAU : relation inverse vers les evaluations ---
  evaluations CandidateEvaluation[]
  // ---

  @@index([listingId])
  @@index([candidateId])
  @@index([date])
  @@index([status])
  @@index([applicationId])  // NOUVEAU
}
```

### 3.4 Modification du model RentalApplication existant

```prisma
model RentalApplication {
  id                   String               @id @default(uuid())
  listingId            String
  candidateScopeId     String
  status               ApplicationStatus    @default(SENT)
  specificLeaseRequest SpecificLeaseRequest @default(DEFAULT)
  appliedAt            DateTime             @default(now())
  rejectionReason      String?
  rejectedAt           DateTime?

  // Lease & Signature
  leaseStatus        LeaseStatus @default(DRAFT)
  yousignSignatureId String?
  signedLeaseUrl     String?

  // Lease Indexation
  indexationQuarter  Int?
  baseIndexValue     Float?

  listing        Listing              @relation(fields: [listingId], references: [id], onDelete: Cascade)
  candidateScope TenantCandidateScope @relation(fields: [candidateScopeId], references: [id], onDelete: Cascade)

  reconciliationHistory ReconciliationHistory[]
  financials            LeaseFinancials[]
  matchedTransactions   BankTransaction[]

  // --- NOUVEAU : relations selection ---
  visits                Visit[]
  evaluations           CandidateEvaluation[]
  selectionDecisions    SelectionDecision[]
  // ---

  @@index([listingId])
  @@index([candidateScopeId])
  @@index([status])
}
```

### 3.5 Nouveaux models

#### A. SelectionProcess -- Le processus de selection pour un listing

Un proprietaire lance UN processus de selection par listing. Ce model est le conteneur global qui regroupe toutes les evaluations, decisions et le round courant.

```prisma
/// Processus de selection pour un listing donne.
/// Il ne peut y avoir qu'un seul processus actif par listing a la fois.
model SelectionProcess {
  id          String         @id @default(uuid())
  listingId   String

  currentRound SelectionRound @default(APPLIED)
  isActive     Boolean        @default(true)  // false une fois le candidat retenu

  startedAt    DateTime       @default(now())
  completedAt  DateTime?      // Date de cloture (candidat retenu)

  listing      Listing        @relation(fields: [listingId], references: [id], onDelete: Cascade)

  // Criteres actifs pour ce processus (personnalisation par listing)
  criteriaConfig  SelectionCriteriaConfig[]
  decisions       SelectionDecision[]

  @@index([listingId])
  @@index([isActive])
}
```

#### B. SelectionCriteriaConfig -- Configuration des criteres par processus

Permet au proprietaire de choisir quels criteres sont actifs et leur poids relatif pour un processus de selection donne. Cela permet d'adapter les criteres au contexte du bien (ex: pour un studio etudiant, le critere PROFILE_STABILITY a moins de poids).

```prisma
/// Configuration d'un critere d'evaluation pour un processus de selection.
/// Le proprietaire peut activer/desactiver et ponderer chaque critere.
model SelectionCriteriaConfig {
  id                 String              @id @default(uuid())
  selectionProcessId String
  criterion          EvaluationCriterion
  isActive           Boolean             @default(true)
  weight             Float               @default(1.0)  // Coefficient de ponderation (0.5 a 3.0)

  selectionProcess   SelectionProcess    @relation(fields: [selectionProcessId], references: [id], onDelete: Cascade)

  @@unique([selectionProcessId, criterion])
  @@index([selectionProcessId])
}
```

#### C. CandidateEvaluation -- Evaluation structuree post-visite

C'est le coeur du systeme anti-discrimination. Chaque evaluation est composee de scores sur des criteres pre-definis, sans aucun champ texte libre. Le score composite est calcule cote serveur a partir des scores individuels ponderes.

```prisma
/// Evaluation structuree d'un candidat apres une visite.
/// Lie a une visite ET a une candidature pour la tracabilite complete.
/// AUCUN champ texte libre -- anti-discrimination by design.
model CandidateEvaluation {
  id              String   @id @default(uuid())
  visitId         String
  applicationId   String

  /// Score composite calcule cote serveur.
  /// Formule : somme(score_i * poids_i) / somme(poids_i) pour les criteres actifs.
  compositeScore  Float

  evaluatedAt     DateTime @default(now())
  updatedAt       DateTime @updatedAt

  visit           Visit             @relation(fields: [visitId], references: [id], onDelete: Cascade)
  application     RentalApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  scores          EvaluationScore[]

  /// Une seule evaluation par visite (le proprio ne note qu'une fois).
  @@unique([visitId])
  /// Une seule evaluation par candidature (meme si plusieurs visites,
  /// seule la derniere evaluation compte).
  @@unique([applicationId])

  @@index([applicationId])
  @@index([compositeScore])
}
```

#### D. EvaluationScore -- Score individuel par critere

```prisma
/// Score individuel pour un critere d'evaluation donne.
/// Valeur entre 1 et 5 (constraint applicative, pas DB).
model EvaluationScore {
  id              String              @id @default(uuid())
  evaluationId    String
  criterion       EvaluationCriterion
  score           Int                 // 1-5, valide cote application

  evaluation      CandidateEvaluation @relation(fields: [evaluationId], references: [id], onDelete: Cascade)

  @@unique([evaluationId, criterion])
  @@index([evaluationId])
}
```

#### E. SelectionDecision -- Historique des decisions de selection

Chaque transition d'un candidat d'un round a l'autre (ou son elimination) est enregistree ici. Cela constitue l'audit trail complet et anti-discrimination du processus.

```prisma
/// Decision de selection pour un candidat dans un processus donne.
/// Trace l'historique complet : avancement ou elimination a chaque round.
model SelectionDecision {
  id                   String             @id @default(uuid())
  selectionProcessId   String
  applicationId        String

  /// Round auquel cette decision a ete prise.
  round                SelectionRound

  /// Le candidat avance-t-il au round suivant ?
  isAdvanced           Boolean            @default(false)

  /// Si elimine, raison structuree (obligatoire si isAdvanced = false).
  eliminationReason    EliminationReason?

  /// Classement du candidat dans ce round (1 = meilleur).
  rankInRound          Int?

  decidedAt            DateTime           @default(now())

  selectionProcess     SelectionProcess   @relation(fields: [selectionProcessId], references: [id], onDelete: Cascade)
  application          RentalApplication  @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  /// Une seule decision par candidature par round.
  @@unique([selectionProcessId, applicationId, round])

  @@index([selectionProcessId])
  @@index([applicationId])
  @@index([round])
  @@index([selectionProcessId, round]) // Toutes les decisions d'un round
}
```

#### F. Modification du model Listing (relation inverse)

```prisma
model Listing {
  // ... champs existants inchanges ...

  // --- NOUVEAU ---
  selectionProcesses SelectionProcess[]
  // ---
}
```

---

## 4. Diagramme de relations

```
                                    +-----------+
                                    |   User    |
                                    | (LANDLORD)|
                                    +-----+-----+
                                          |
                                          | owns
                                          v
                                    +-----------+
                                    | Property  |
                                    +-----+-----+
                                          |
                                          | has
                                          v
                                    +-----------+
                                    |RentalUnit |
                                    +-----+-----+
                                          |
                                          | has
                                          v
+-------------------+             +-------+-------+
|TenantCandidate    |             |    Listing    |
|     Scope         |             +---+-------+---+
+--------+----------+                 |       |
         |                            |       |
         | candidateScope             |       | listing
         v                            v       v
+--------+-----------+    +-----------+--+ +--+------------------+
| RentalApplication  |<-->|    Visit     | | SelectionProcess    |
| (status: pipeline) |    | (evaluation) | | (currentRound,      |
+--+---------+----+--+    +------+-------+ |  isActive)          |
   |         |    |              |          +--+--------+---------+
   |         |    |              |             |        |
   |         |    |              v             v        v
   |         |    |   +----------+-------+ +--+------+ +--------+--------+
   |         |    |   |CandidateEval     | |Criteria | |SelectionDecision|
   |         |    +-->|(compositeScore)  | |Config   | |(round,          |
   |         |        +--------+---------+ |(weight) | | isAdvanced,     |
   |         |                 |           +---------+ | eliminationReason|
   |         |                 v                       | rankInRound)    |
   |         |        +--------+---------+             +-----------------+
   |         |        | EvaluationScore  |
   |         |        | (criterion,score)|
   |         |        +------------------+
   |         |
   v         v
(lease)   (financials)
```

### Relations detaillees

| Relation | Type | Description |
|----------|------|-------------|
| `Listing` -> `SelectionProcess` | 1:N | Un listing peut avoir plusieurs processus (un actif a la fois) |
| `SelectionProcess` -> `SelectionCriteriaConfig` | 1:N | Config des criteres pour ce processus |
| `SelectionProcess` -> `SelectionDecision` | 1:N | Toutes les decisions du processus |
| `Visit` -> `RentalApplication` | N:1 | NOUVEAU lien Visit->Application (optionnel, nullable) |
| `Visit` -> `CandidateEvaluation` | 1:1 | Une evaluation par visite |
| `RentalApplication` -> `CandidateEvaluation` | 1:1 | Une evaluation par candidature |
| `RentalApplication` -> `SelectionDecision` | 1:N | Historique des decisions par round |
| `CandidateEvaluation` -> `EvaluationScore` | 1:N | Un score par critere actif |

---

## 5. Considerations anti-discrimination

### Cadre legal

En France, la loi interdit toute discrimination dans l'acces au logement (Loi du 6 juillet 1989, art. 1 ; Code penal art. 225-1). Les criteres interdits incluent : origine, sexe, situation de famille, grossesse, apparence physique, nom, lieu de residence, etat de sante, handicap, orientation sexuelle, age, opinions politiques, activites syndicales, appartenance religieuse, ethnie.

### Comment le schema garantit la conformite

| Mesure | Implementation |
|--------|---------------|
| **Pas de texte libre** | Aucun champ `String` libre dans `CandidateEvaluation`, `EvaluationScore`, ou `SelectionDecision`. Le proprio ne peut pas ecrire de commentaire subjectif. |
| **Criteres pre-definis** | L'enum `EvaluationCriterion` ne contient que des criteres objectifs lies a la solvabilite et a la compatibilite logement/bail. |
| **Raisons d'elimination structurees** | L'enum `EliminationReason` ne contient que des motifs legaux et objectifs. Impossible d'invoquer un motif discriminatoire. |
| **Audit trail** | Chaque `SelectionDecision` est horodatee avec la raison et le round. En cas de contestation, l'historique complet est disponible. |
| **Scores numeriques** | L'echelle 1-5 sur des criteres objectifs ne laisse pas de place a la subjectivite narrative. |
| **Classement automatique** | Le `compositeScore` est calcule par le serveur, pas par le proprio. Cela reduit le biais de confirmation. |

### Criteres et leur justification legale

| Critere | Justification | Lien donnees existantes |
|---------|--------------|------------------------|
| `PUNCTUALITY` | Respect des engagements, indicateur de serieux | `Visit.status`, presence effective |
| `FILE_COMPLETENESS` | Dossier complet = candidature recevable | `TenantProfile` champs remplis |
| `INCOME_ADEQUACY` | Ratio revenus/loyer (critere financier legal) | `TenantProfile.netSalary` vs `Listing.price` |
| `GUARANTOR_QUALITY` | Solidite des garanties (financier) | `Guarantor.type`, `Guarantor.netIncome` |
| `LEASE_COMPATIBILITY` | Type de bail souhaite vs propose | `TenantCandidateScope.targetLeaseType` vs `Listing.leaseType` |
| `MOVE_IN_FLEXIBILITY` | Date d'emmenagement compatible | `TenantCandidateScope.targetMoveInDate` vs `Listing.availableFrom` |
| `PROFILE_STABILITY` | Stabilite professionnelle (CDI, anciennete) | `TenantProfile.jobType` |
| `HOUSING_ADEQUACY` | Adequation taille menage/surface | `TenantCandidateScope.childCount`, composition vs surface |

### Ce qui est explicitement interdit par le design

- Pas de champ "impression generale" ou "feeling"
- Pas de notes libres ou commentaires
- Pas de critere lie a l'apparence, l'origine, ou la situation personnelle
- Pas de possibilite de contourner les raisons structurees d'elimination
- Le classement est base sur des scores numeriques, pas sur un ordre subjectif

---

## 6. Guide de migration

### Vue d'ensemble

| Etape | Type | Breaking change ? |
|-------|------|:-:|
| Ajout des enums | `CREATE TYPE` | Non |
| Extension `ApplicationStatus` | `ALTER TYPE ... ADD VALUE` | Non |
| Ajout `Visit.applicationId` | `ALTER TABLE ... ADD COLUMN` nullable | Non |
| Ajout `Visit.evaluations` | Relation seulement (pas de colonne) | Non |
| Ajout `RentalApplication.visits` | Relation seulement (pas de colonne) | Non |
| Creation `SelectionProcess` | `CREATE TABLE` | Non |
| Creation `SelectionCriteriaConfig` | `CREATE TABLE` | Non |
| Creation `CandidateEvaluation` | `CREATE TABLE` | Non |
| Creation `EvaluationScore` | `CREATE TABLE` | Non |
| Creation `SelectionDecision` | `CREATE TABLE` | Non |

**Aucun breaking change.** Toutes les modifications sont additives.

### Etape 1 : Creer les nouvelles enums

```sql
-- Migration: add_selection_enums
CREATE TYPE "EvaluationCriterion" AS ENUM (
  'PUNCTUALITY',
  'FILE_COMPLETENESS',
  'INCOME_ADEQUACY',
  'GUARANTOR_QUALITY',
  'LEASE_COMPATIBILITY',
  'MOVE_IN_FLEXIBILITY',
  'PROFILE_STABILITY',
  'HOUSING_ADEQUACY'
);

CREATE TYPE "SelectionRound" AS ENUM (
  'APPLIED',
  'SHORTLISTED',
  'FINALIST',
  'SELECTED'
);

CREATE TYPE "EliminationReason" AS ENUM (
  'INCOMPLETE_FILE',
  'INSUFFICIENT_INCOME',
  'NO_GUARANTOR',
  'WEAK_GUARANTOR',
  'INCOMPATIBLE_LEASE_TYPE',
  'INCOMPATIBLE_MOVE_IN_DATE',
  'OVERQUALIFIED_SURFACE',
  'UNDERQUALIFIED_SURFACE',
  'VISIT_NO_SHOW',
  'VISIT_CANCELLED_BY_CANDIDATE',
  'CANDIDATE_WITHDREW',
  'BETTER_SCORING_CANDIDATE',
  'LOWER_OVERALL_RANKING'
);
```

### Etape 2 : Etendre ApplicationStatus

```sql
-- Migration: extend_application_status
ALTER TYPE "ApplicationStatus" ADD VALUE 'SHORTLISTED';
ALTER TYPE "ApplicationStatus" ADD VALUE 'FINALIST';
ALTER TYPE "ApplicationStatus" ADD VALUE 'SELECTED';
```

### Etape 3 : Ajouter applicationId a Visit

```sql
-- Migration: add_visit_application_link
ALTER TABLE "Visit" ADD COLUMN "applicationId" TEXT;
ALTER TABLE "Visit"
  ADD CONSTRAINT "Visit_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id")
  ON DELETE SET NULL;
CREATE INDEX "Visit_applicationId_idx" ON "Visit"("applicationId");
```

### Etape 4 : Creer les nouvelles tables

```sql
-- Migration: create_selection_tables

-- SelectionProcess
CREATE TABLE "SelectionProcess" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "listingId" TEXT NOT NULL,
  "currentRound" "SelectionRound" NOT NULL DEFAULT 'APPLIED',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "SelectionProcess_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SelectionProcess_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE
);
CREATE INDEX "SelectionProcess_listingId_idx" ON "SelectionProcess"("listingId");
CREATE INDEX "SelectionProcess_isActive_idx" ON "SelectionProcess"("isActive");

-- SelectionCriteriaConfig
CREATE TABLE "SelectionCriteriaConfig" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "selectionProcessId" TEXT NOT NULL,
  "criterion" "EvaluationCriterion" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  CONSTRAINT "SelectionCriteriaConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SelectionCriteriaConfig_selectionProcessId_fkey"
    FOREIGN KEY ("selectionProcessId") REFERENCES "SelectionProcess"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "SelectionCriteriaConfig_selectionProcessId_criterion_key"
  ON "SelectionCriteriaConfig"("selectionProcessId", "criterion");
CREATE INDEX "SelectionCriteriaConfig_selectionProcessId_idx"
  ON "SelectionCriteriaConfig"("selectionProcessId");

-- CandidateEvaluation
CREATE TABLE "CandidateEvaluation" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "visitId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "compositeScore" DOUBLE PRECISION NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidateEvaluation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CandidateEvaluation_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE,
  CONSTRAINT "CandidateEvaluation_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "CandidateEvaluation_visitId_key" ON "CandidateEvaluation"("visitId");
CREATE UNIQUE INDEX "CandidateEvaluation_applicationId_key" ON "CandidateEvaluation"("applicationId");
CREATE INDEX "CandidateEvaluation_applicationId_idx" ON "CandidateEvaluation"("applicationId");
CREATE INDEX "CandidateEvaluation_compositeScore_idx" ON "CandidateEvaluation"("compositeScore");

-- EvaluationScore
CREATE TABLE "EvaluationScore" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "evaluationId" TEXT NOT NULL,
  "criterion" "EvaluationCriterion" NOT NULL,
  "score" INTEGER NOT NULL,
  CONSTRAINT "EvaluationScore_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EvaluationScore_evaluationId_fkey"
    FOREIGN KEY ("evaluationId") REFERENCES "CandidateEvaluation"("id") ON DELETE CASCADE,
  CONSTRAINT "EvaluationScore_score_check" CHECK ("score" >= 1 AND "score" <= 5)
);
CREATE UNIQUE INDEX "EvaluationScore_evaluationId_criterion_key"
  ON "EvaluationScore"("evaluationId", "criterion");
CREATE INDEX "EvaluationScore_evaluationId_idx" ON "EvaluationScore"("evaluationId");

-- SelectionDecision
CREATE TABLE "SelectionDecision" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "selectionProcessId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "round" "SelectionRound" NOT NULL,
  "isAdvanced" BOOLEAN NOT NULL DEFAULT false,
  "eliminationReason" "EliminationReason",
  "rankInRound" INTEGER,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SelectionDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SelectionDecision_selectionProcessId_fkey"
    FOREIGN KEY ("selectionProcessId") REFERENCES "SelectionProcess"("id") ON DELETE CASCADE,
  CONSTRAINT "SelectionDecision_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "SelectionDecision_processId_appId_round_key"
  ON "SelectionDecision"("selectionProcessId", "applicationId", "round");
CREATE INDEX "SelectionDecision_selectionProcessId_idx" ON "SelectionDecision"("selectionProcessId");
CREATE INDEX "SelectionDecision_applicationId_idx" ON "SelectionDecision"("applicationId");
CREATE INDEX "SelectionDecision_round_idx" ON "SelectionDecision"("round");
CREATE INDEX "SelectionDecision_selectionProcessId_round_idx"
  ON "SelectionDecision"("selectionProcessId", "round");
```

### Etape 5 : Backfill des donnees existantes (optionnel)

Si des visites existantes correspondent deja a des candidatures, on peut faire un backfill :

```sql
-- Tentative de lier les visites existantes aux candidatures
-- en se basant sur le listingId et candidateId
UPDATE "Visit" v
SET "applicationId" = ra.id
FROM "RentalApplication" ra
JOIN "TenantCandidateScope" tcs ON ra."candidateScopeId" = tcs.id
WHERE v."listingId" = ra."listingId"
  AND v."candidateId" = tcs."creatorUserId"
  AND v."applicationId" IS NULL;
```

### Commandes Prisma

```bash
# 1. Mettre a jour le schema.prisma avec les modifications ci-dessus
# 2. Generer la migration
npx prisma migrate dev --name add_candidate_selection_system

# 3. Si besoin de backfill, executer le SQL manuellement
npx prisma db execute --file ./prisma/backfill-visit-application.sql

# 4. Regenerer le client
npx prisma generate
```

---

## Annexe : Requetes Prisma courantes

### Recuperer le classement des candidats pour un listing

```typescript
const ranking = await prisma.candidateEvaluation.findMany({
  where: {
    application: {
      listingId: listingId,
      status: { in: ['VISIT_CONFIRMED', 'SHORTLISTED', 'FINALIST'] },
    },
  },
  include: {
    scores: true,
    application: {
      include: {
        candidateScope: {
          include: { creatorUser: true },
        },
      },
    },
  },
  orderBy: { compositeScore: 'desc' },
});
```

### Faire avancer un candidat au round suivant

```typescript
await prisma.$transaction([
  // Creer la decision
  prisma.selectionDecision.create({
    data: {
      selectionProcessId: processId,
      applicationId: applicationId,
      round: 'APPLIED',
      isAdvanced: true,
      rankInRound: 1,
    },
  }),
  // Mettre a jour le statut de la candidature
  prisma.rentalApplication.update({
    where: { id: applicationId },
    data: { status: 'SHORTLISTED' },
  }),
]);
```

### Eliminer un candidat avec raison structuree

```typescript
await prisma.$transaction([
  prisma.selectionDecision.create({
    data: {
      selectionProcessId: processId,
      applicationId: applicationId,
      round: 'SHORTLISTED',
      isAdvanced: false,
      eliminationReason: 'INSUFFICIENT_INCOME',
      rankInRound: 5,
    },
  }),
  prisma.rentalApplication.update({
    where: { id: applicationId },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
    },
  }),
]);
```

### Comparer N candidats sur les memes criteres

```typescript
const comparison = await prisma.evaluationScore.groupBy({
  by: ['criterion'],
  where: {
    evaluation: {
      applicationId: { in: applicationIds },
    },
  },
  _avg: { score: true },
  _min: { score: true },
  _max: { score: true },
});

// Ou pour une vue detaillee :
const detailed = await prisma.candidateEvaluation.findMany({
  where: { applicationId: { in: applicationIds } },
  include: { scores: true },
  orderBy: { compositeScore: 'desc' },
});
```

### Calculer le score composite (logique serveur)

```typescript
function computeCompositeScore(
  scores: { criterion: EvaluationCriterion; score: number }[],
  config: { criterion: EvaluationCriterion; weight: number; isActive: boolean }[]
): number {
  const activeConfig = config.filter(c => c.isActive);
  const weightMap = new Map(activeConfig.map(c => [c.criterion, c.weight]));

  let weightedSum = 0;
  let totalWeight = 0;

  for (const s of scores) {
    const weight = weightMap.get(s.criterion);
    if (weight !== undefined) {
      weightedSum += s.score * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
}
```
