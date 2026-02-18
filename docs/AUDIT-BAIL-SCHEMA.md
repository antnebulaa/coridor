# AUDIT BAIL - Schema Prisma vs Conformite Legale Francaise

> Date : 2026-02-17
> Perimetre : `prisma/schema.prisma`, `services/LeaseService.ts`, `components/documents/LeaseDocument.tsx`, `app/api/leases/[applicationId]/sign/route.ts`, `services/YousignService.ts`

---

## 1. Tableau de Synthese

Legende :
- **Existe** : le champ est present dans le schema et correctement utilise
- **Partiel** : le champ existe mais est incomplet, mal place, ou pas utilise correctement
- **Manquant** : le champ n'existe pas dans le schema

### A. Identite des parties

| Donnee | Model actuel | Champ | Statut | Priorite |
|---|---|---|---|---|
| Nom | User | `lastName` | Existe | - |
| Prenom | User | `firstName` | Existe | - |
| Email | User | `email` | Existe | - |
| Telephone | User | `phoneNumber` | **Partiel** | **P0** |
| Date de naissance | User | `birthDate` | Existe | - |
| Lieu de naissance | User | `birthPlace` | Existe | - |
| Adresse postale | User | `addressLine1`, `zipCode`, `city`, `country` | Existe | - |
| Complement adresse | User | `building`, `apartment` | Existe | - |
| Nationalite | User | - | Manquant | P2 |

### B. Description du logement

| Donnee | Model actuel | Champ | Statut | Priorite |
|---|---|---|---|---|
| Adresse complete | Property | `addressLine1`, `zipCode`, `city` | Existe | - |
| Surface habitable | RentalUnit | `surface` | Existe | - |
| Nombre de pieces | Listing | `roomCount` | **Partiel** | **P1** |
| Type de bien | Property | `category` | Existe | - |
| Etage | Property | `floor` | Existe | - |
| Nombre d'etages total | Property | `totalFloors` | Existe | - |
| Annee de construction | Property | `constructionYear` | Existe | - |
| Periode de construction | Property | `constructionPeriod` | Existe | - |
| Type de chauffage | Property | `heatingSystem` | Existe | - |
| Production eau chaude | Property | - | **Manquant** | **P1** |
| Acces fibre/internet | Property | `hasFiber` | Existe | - |
| Cave | Property | - | **Manquant** | **P1** |
| Parking / Garage | Property | - | **Manquant** | **P1** |
| Grenier | Property | - | **Manquant** | P2 |
| Parties communes | Property | partiellement via booleans | **Partiel** | **P1** |
| Equipements meuble | Furniture | 13 champs obligatoires | Existe | - |
| Nombre de pieces (Property) | Property | - | **Manquant** | **P1** |

### C. Montants financiers

| Donnee | Model actuel | Champ | Statut | Priorite |
|---|---|---|---|---|
| Loyer hors charges | Listing | `price` | Existe | - |
| Charges (provision/forfait) | Listing | `charges` (Json) | **Partiel** | **P1** |
| Depot de garantie | Listing | `securityDeposit` | Existe | - |
| Loyer de reference (zone tendue) | - | - | **Manquant** | **P1** |
| Loyer de reference majore | - | - | **Manquant** | **P1** |
| Complement de loyer | - | - | **Manquant** | **P1** |
| Honoraires agence | - | - | **Manquant** | P2 |
| Jour de paiement mensuel | Listing | - | **Manquant** | **P1** |
| Mode de paiement | Listing | - | **Manquant** | P2 |
| Loyer precedent locataire | - | - | **Manquant** | **P1** |
| Date dernier versement precedent | - | - | **Manquant** | **P1** |

### D. Dates et duree

| Donnee | Model actuel | Champ | Statut | Priorite |
|---|---|---|---|---|
| Date d'effet du bail | LeaseFinancials | `startDate` | **Partiel** | **P1** |
| Date de fin bail | RentalApplication | `leaseEndDate` | Existe | - |
| Date d'entree dans les lieux | TenantCandidateScope | `targetMoveInDate` | **Partiel** | **P1** |
| Duree du bail (mois) | - | calcule dynamiquement | **Partiel** | **P1** |

### E. Diagnostics

| Donnee | Model actuel | Champ | Statut | Priorite |
|---|---|---|---|---|
| DPE (note energie) | Property | `dpe` | Existe | - |
| GES (note) | Property | `ges` | Existe | - |
| Date DPE | Property | `dpeDate` | Existe | - |
| Expiration DPE | Property | `dpeExpiryDate` | Existe | - |
| Diagnostic electrique | Property | `electricalDiagnosticDate`, `electricalInstallYear` | Existe | - |
| Diagnostic gaz | Property | `gasDiagnosticDate`, `gasInstallYear`, `hasGasInstallation` | Existe | - |
| ERP (risques) | Property | `erpDate` | **Partiel** | **P1** |
| Plomb (CREP) | Property | - | **Manquant** | **P1** |
| Amiante | Property | - | **Manquant** | **P1** |
| Bruit (aeroport) | Property | - | **Manquant** | P2 |
| Termites | Property | - | **Manquant** | P2 |
| Assainissement | Property | - | **Manquant** | P2 |

### F. Clauses et metadata

| Donnee | Model actuel | Champ | Statut | Priorite |
|---|---|---|---|---|
| Zone tendue (oui/non) | - | - | **Manquant** | **P0** |
| Type de bail | Listing.leaseType + Application.specificLeaseRequest | - | **Partiel** | P2 |
| Composition foyer | TenantCandidateScope | `compositionType`, `childCount` | Existe | - |
| Motif bail mobilite | - | - | **Manquant** | **P1** |
| Nombre d'occupants | TenantCandidateScope | `membersIds` (calcule) | Partiel | P2 |

---

## 2. Analyse Detaillee et Propositions

### 2.1 [P0] Telephone - Critique pour Yousign OTP SMS

**Probleme** : Le champ `phoneNumber` existe sur `User` mais :
1. Il est optionnel (`String?`)
2. Il n'est **PAS passe** aux signers Yousign dans `sign/route.ts` : un numero fictif `+33612345678` est utilise en dur (voir ligne 68 et 78)
3. Il n'est **PAS inclus** dans `LeaseConfig` (ni dans `landlord`, ni dans `tenants`)
4. En production, Yousign enverra un OTP SMS au vrai numero -- le bail ne pourra PAS etre signe sans numero reel

**Statut code actuel** :
```typescript
// sign/route.ts, ligne 68
phone_number: "+33612345678" // MOCK PHONE for Sandbox!
```

**Proposition schema** : Le champ existe deja sur `User.phoneNumber`. Pas de modification schema necessaire.

**Proposition code** (hors scope schema mais critique) :
1. Ajouter `phoneNumber` dans `LeaseConfig.landlord` et `LeaseConfig.tenants[]`
2. Dans `LeaseService.generateLeaseConfig()`, passer `landlord.phoneNumber` et `member.phoneNumber`
3. Dans `sign/route.ts`, utiliser le vrai numero au lieu du mock
4. Ajouter une validation front-end : rendre `phoneNumber` obligatoire avant signature (format E.164)

### 2.2 [P0] Zone Tendue

**Probleme** : La zone tendue determine :
- L'encadrement des loyers (loyer de reference)
- Le preavis reduit (1 mois au lieu de 3 pour bail nu)
- L'obligation de mentionner le loyer du precedent locataire
- Le complement de loyer

Aucune donnee de zone tendue n'existe dans le schema. Le code actuel dans `LeaseDocument.tsx` affiche une section "Zone Tendue" (section IV.4) mais les valeurs sont toujours vides (`undefined`).

**Proposition schema** :
```prisma
model Property {
  // ... champs existants ...

  // ---- ZONE TENDUE / ENCADREMENT DES LOYERS ----
  isZoneTendue            Boolean   @default(false)
  referenceRent           Float?    // Loyer de reference (EUR/m2/mois)
  referenceRentIncreased  Float?    // Loyer de reference majore (EUR/m2/mois)
  rentSupplement          Float?    // Complement de loyer (EUR)
  rentSupplementJustification String? // Justification du complement
  previousRent            Float?    // Dernier loyer applique au precedent locataire (EUR)
  previousRentDate        DateTime? @db.Date // Date du dernier versement
  previousTenantLeaveDate DateTime? @db.Date // Date de depart du precedent locataire
}
```

### 2.3 [P1] Production d'eau chaude sanitaire

**Probleme** : Le bail doit mentionner le mode de production d'eau chaude. Le code actuel dans `LeaseService.ts` utilise un fallback en dur :
```typescript
waterHeatingType: mapHeating("IND_ELEC"), // Fallback if not in model
```

**Proposition schema** :
```prisma
model Property {
  // ... champs existants ...
  waterHeatingSystem  String?  // Memes codes que heatingSystem: IND_ELEC, COL_GAZ, etc.
}
```

### 2.4 [P1] Nombre de pieces principales (Property)

**Probleme** : `roomCount` n'existe que sur `Listing` (commercial, optionnel) et non sur `Property` ou `RentalUnit`. Le code `LeaseService.ts` accede a `property.roomCount` (ligne 274) mais ce champ n'existe PAS sur le model Property -- il sera toujours `undefined`. La valeur affichee dans le bail sera `undefined` ou `0`.

**Proposition schema** :
```prisma
model RentalUnit {
  // ... champs existants ...
  roomCount   Int?    // Nombre de pieces principales (au sens loi Carrez)
}
```
Cela permettra de stocker l'information au bon niveau (le lot locatif). La valeur du Listing resterait un override commercial.

### 2.5 [P1] Annexes du logement (Cave, Parking, Garage)

**Probleme** : Le bail doit lister les locaux accessoires (cave, parking, grenier). Le code actuel retourne un tableau vide :
```typescript
ancillary_premises: [], // Populate if available
```
Aucun champ n'existe dans le schema pour modeliser ces annexes.

**Proposition schema** :
```prisma
model Property {
  // ... champs existants ...

  // ---- ANNEXES / LOCAUX ACCESSOIRES ----
  hasCave           Boolean   @default(false)
  caveReference     String?   // Numero ou identifiant de la cave
  hasParking        Boolean   @default(false)
  parkingReference  String?   // Numero de place de parking
  hasGarage         Boolean   @default(false)
  garageReference   String?
  hasAttic          Boolean   @default(false) // Grenier
  atticReference    String?
}
```

### 2.6 [P1] Parties communes

**Probleme** : Le bail doit decrire les parties communes. Il existe des booleans eparpilles (`hasElevator`, `hasBikeRoom`, `hasDigicode`, `hasIntercom`, `hasCaretaker`, `hasPool`) mais le code actuel ne les utilise pas pour construire la liste -- il retourne un hardcode :
```typescript
common_areas: ["Ascenseur (si applicable)"]
```

**Proposition** : Pas de modification schema necessaire. Les champs existent. La correction est dans `LeaseService.ts` pour construire dynamiquement la liste a partir des booleans existants :
```typescript
const commonAreas: string[] = [];
if (property.hasElevator) commonAreas.push("Ascenseur");
if (property.hasBikeRoom) commonAreas.push("Local velos");
if (property.hasDigicode) commonAreas.push("Digicode");
if (property.hasIntercom) commonAreas.push("Interphone");
if (property.hasCaretaker) commonAreas.push("Gardien/Concierge");
if (property.hasPool) commonAreas.push("Piscine");
// ... etc
```

### 2.7 [P1] Charges : structure Json ambigue

**Probleme** : Le champ `Listing.charges` est de type `Json?`. Le code dans `LeaseService.ts` tente de parser cette valeur de 4 facons differentes (nombre, string, objet avec `.amount`, objet avec `.value`). Cela est fragile et source de bugs.

**Proposition schema** :
```prisma
model Listing {
  // Remplacer charges Json? par :
  chargesAmount     Int?      // Montant des charges en euros
  chargesIncluded   Boolean   @default(false) // Charges incluses dans le prix ?
  chargesType       String?   // "PROVISION" ou "FORFAIT"
}
```
Note : cette migration necessite un script pour convertir les donnees Json existantes.

### 2.8 [P1] Jour de paiement du loyer

**Probleme** : Le bail indique "le paiement s'effectuera le X de chaque mois". Le code actuel utilise un hardcode :
```typescript
payment_date: 1, // 1st of month
```
Aucun champ ne permet au bailleur de choisir le jour de paiement.

**Proposition schema** :
```prisma
model Listing {
  // ... champs existants ...
  paymentDay   Int   @default(1)  // Jour du mois (1-28)
}
```

### 2.9 [P1] Mode de paiement

**Probleme** : Le bail mentionne le mode de paiement. Le code actuel utilise un hardcode :
```typescript
payment_method: "Virement Bancaire"
```

**Proposition schema** :
```prisma
model Listing {
  // ... champs existants ...
  paymentMethod   String   @default("VIREMENT") // VIREMENT, PRELEVEMENT, CHEQUE, ESPECES
}
```

### 2.10 [P1] Date d'effet et date d'entree dans les lieux

**Probleme** : Le code actuel utilise `new Date()` (date du jour) comme date d'effet :
```typescript
effective_date: new Date().toISOString().split('T')[0],
```
La date d'effet peut etre differente de la date de signature ET de la date d'entree. La date d'entree est stockee sur `TenantCandidateScope.targetMoveInDate` mais c'est une "cible" et non une date definitive.

**Proposition schema** :
```prisma
model RentalApplication {
  // ... champs existants ...
  leaseStartDate    DateTime? @db.Date  // Date d'effet du bail (peut != date de signature)
  moveInDate        DateTime? @db.Date  // Date reelle d'entree dans les lieux
}
```

### 2.11 [P1] Duree du bail stockee

**Probleme** : La duree est calculee dynamiquement dans `calculateContractData()` et non stockee. Cela fonctionne mais empeche toute modification manuelle par le bailleur (ex : bail meuble de 2 ans, ou bail mobilite de 4 mois au lieu de 10).

**Proposition schema** :
```prisma
model RentalApplication {
  // ... champs existants ...
  leaseDurationMonths  Int?  // Duree du bail en mois (si null, calcul automatique)
}
```

### 2.12 [P1] Diagnostics manquants : Plomb (CREP) et Amiante

**Probleme** : Le bail doit obligatoirement mentionner les diagnostics plomb (logements avant 1949) et amiante (logements avant 1997). Ces champs n'existent pas.

**Proposition schema** :
```prisma
model Property {
  // ... champs existants ...

  // ---- DIAGNOSTICS COMPLEMENTAIRES ----
  leadDiagnosticDate      DateTime? @db.Date  // Date du CREP (plomb)
  leadDiagnosticResult    String?              // "POSITIF", "NEGATIF", "NON_APPLICABLE"
  asbestosDiagnosticDate  DateTime? @db.Date  // Date du diagnostic amiante
  asbestosDiagnosticResult String?             // "PRESENCE", "ABSENCE", "NON_APPLICABLE"
  noiseDiagnosticDate     DateTime? @db.Date  // Plan d'exposition au bruit (aeroport)
  noiseDiagnosticResult   String?             // Zone A/B/C/D ou NON_APPLICABLE
}
```

### 2.13 [P1] ERP (Etat des Risques et Pollutions)

**Probleme** : Seul `erpDate` existe. Il manque le contenu (zones a risques identifiees) et la reference du document.

**Proposition schema** :
```prisma
model Property {
  // ... champs existants ...
  erpDocumentUrl    String?   // URL du document ERP
  erpZones          String[]  // Zones identifiees (inondation, sismique, radon, etc.)
}
```

### 2.14 [P1] Motif du bail mobilite

**Probleme** : Le bail mobilite exige la mention du motif (formation professionnelle, etudes, stage, engagement volontaire, mutation, mission temporaire). Le champ n'existe pas.

**Proposition schema** :
```prisma
model RentalApplication {
  // ... champs existants ...
  mobilityReason   String?  // Motif du bail mobilite (formation, stage, mutation, etc.)
}
```

### 2.15 [P2] Nationalite

**Probleme** : Optionnel mais parfois demande sur les baux. Pas bloquant legalement.

**Proposition schema** :
```prisma
model User {
  // ... champs existants ...
  nationality   String?
}
```

### 2.16 [P2] Mode de paiement et Honoraires agence

Deja traites dans 2.9 et couverts par la structure `agency_fees` dans LeaseConfig. Le schema n'a pas besoin de stocker les honoraires agence tant que Coridor reste P2P (pas d'intermediaire professionnel). Si un mode "agence partenaire" est prevu, ajouter :

```prisma
model Listing {
  // ... champs existants ...
  agencyFeesAmount   Int?  // Honoraires TTC en euros (null = pas d'agence)
}
```

---

## 3. Synthese des Modifications

### Migrations P0 (Bloquant Production)

| Model | Modification | Impact |
|---|---|---|
| *(Code)* | Passer le vrai `phoneNumber` a Yousign | **Bloque la signature en prod** |
| Property | Ajouter `isZoneTendue Boolean @default(false)` | Conformite legale encadrement loyers |
| Property | Ajouter `referenceRent Float?` | Zone tendue |
| Property | Ajouter `referenceRentIncreased Float?` | Zone tendue |

### Migrations P1 (Conformite Legale)

| Model | Modification | Impact |
|---|---|---|
| Property | Ajouter `waterHeatingSystem String?` | Mention bail obligatoire |
| Property | Ajouter `hasCave`, `hasParking`, `hasGarage`, `hasAttic` + references | Mention bail obligatoire |
| Property | Ajouter `rentSupplement Float?`, `rentSupplementJustification String?` | Zone tendue |
| Property | Ajouter `previousRent Float?`, `previousRentDate DateTime?` | Zone tendue |
| Property | Ajouter diagnostics plomb/amiante/bruit | Annexes obligatoires |
| Property | Ajouter `erpDocumentUrl String?`, `erpZones String[]` | Annexes obligatoires |
| RentalUnit | Ajouter `roomCount Int?` | Mention bail obligatoire |
| Listing | Remplacer `charges Json?` par `chargesAmount Int?` + `chargesType String?` | Fiabilite donnees |
| Listing | Ajouter `paymentDay Int @default(1)` | Mention bail |
| Listing | Ajouter `paymentMethod String @default("VIREMENT")` | Mention bail |
| RentalApplication | Ajouter `leaseStartDate DateTime?`, `moveInDate DateTime?` | Dates du bail |
| RentalApplication | Ajouter `leaseDurationMonths Int?` | Duree personnalisable |
| RentalApplication | Ajouter `mobilityReason String?` | Bail mobilite |

### Migrations P2 (Ameliorations)

| Model | Modification | Impact |
|---|---|---|
| User | Ajouter `nationality String?` | Informations complementaires |
| Listing | Ajouter `agencyFeesAmount Int?` | Si partenariats agences |
| Property | Ajouter `noiseDiagnosticDate`, `noiseDiagnosticResult` | Zones aeroport |

---

## 4. Schema Prisma Propose (Diff)

```prisma
// ============================================================
// MODIFICATIONS PROPERTY
// ============================================================

model Property {
  // ... (champs existants inchanges) ...

  // ---- ZONE TENDUE / ENCADREMENT DES LOYERS ----      [P0]
  isZoneTendue              Boolean   @default(false)
  referenceRent             Float?    // EUR/m2/mois
  referenceRentIncreased    Float?    // EUR/m2/mois
  rentSupplement            Float?    // EUR                 [P1]
  rentSupplementJustification String?                        [P1]
  previousRent              Float?    // EUR                 [P1]
  previousRentDate          DateTime? @db.Date               [P1]
  previousTenantLeaveDate   DateTime? @db.Date               [P1]

  // ---- EQUIPEMENTS ----                                  [P1]
  waterHeatingSystem        String?

  // ---- ANNEXES / LOCAUX ACCESSOIRES ----                 [P1]
  hasCave                   Boolean   @default(false)
  caveReference             String?
  hasParking                Boolean   @default(false)
  parkingReference          String?
  hasGarage                 Boolean   @default(false)
  garageReference           String?
  hasAttic                  Boolean   @default(false)
  atticReference            String?

  // ---- DIAGNOSTICS COMPLEMENTAIRES ----                  [P1]
  leadDiagnosticDate        DateTime? @db.Date
  leadDiagnosticResult      String?
  asbestosDiagnosticDate    DateTime? @db.Date
  asbestosDiagnosticResult  String?
  erpDocumentUrl            String?
  erpZones                  String[]

  // ---- DIAGNOSTICS COMPLEMENTAIRES ----                  [P2]
  noiseDiagnosticDate       DateTime? @db.Date
  noiseDiagnosticResult     String?
}

// ============================================================
// MODIFICATIONS RENTAL UNIT
// ============================================================

model RentalUnit {
  // ... (champs existants inchanges) ...
  roomCount     Int?    // Nombre de pieces principales      [P1]
}

// ============================================================
// MODIFICATIONS LISTING
// ============================================================

model Listing {
  // ... (champs existants inchanges) ...

  // Remplacer charges Json? par :                          [P1]
  chargesAmount     Int?
  chargesIncluded   Boolean   @default(false)
  chargesType       String?   // "PROVISION" | "FORFAIT"

  paymentDay        Int       @default(1)                   [P1]
  paymentMethod     String    @default("VIREMENT")          [P1]

  agencyFeesAmount  Int?                                    [P2]
}

// ============================================================
// MODIFICATIONS RENTAL APPLICATION
// ============================================================

model RentalApplication {
  // ... (champs existants inchanges) ...
  leaseStartDate       DateTime? @db.Date                   [P1]
  moveInDate           DateTime? @db.Date                   [P1]
  leaseDurationMonths  Int?                                 [P1]
  mobilityReason       String?                              [P1]
}

// ============================================================
// MODIFICATIONS USER
// ============================================================

model User {
  // ... (champs existants inchanges) ...
  nationality   String?                                     [P2]
}
```

---

## 5. Bugs / Problemes de Code Identifies (hors schema)

Ces problemes ne sont pas des modifications de schema mais ont ete identifies pendant l'audit :

### 5.1 `property.roomCount` n'existe pas
- **Fichier** : `services/LeaseService.ts`, ligne 274
- **Code** : `roomCount: property.roomCount`
- **Probleme** : `roomCount` n'est PAS un champ de `Property`. Il est sur `Listing`. Cela retournera toujours `undefined`.
- **Fix** : Utiliser `application.listing.roomCount` ou ajouter `roomCount` sur `RentalUnit`.

### 5.2 `property.description` n'existe pas
- **Fichier** : `services/LeaseService.ts`, ligne 275
- **Code** : `description: property.description`
- **Probleme** : `description` n'est PAS un champ de `Property`. Il est sur `Listing`.
- **Fix** : Utiliser `application.listing.description`.

### 5.3 `rentalUnit.price` et `rentalUnit.charges` n'existent pas
- **Fichier** : `services/LeaseService.ts`, lignes 391-413
- **Code** : `const rentHC = rentalUnit.price;` et `rentalUnit.charges`
- **Probleme** : `price` et `charges` sont des champs de `Listing`, pas de `RentalUnit`. Le code accede aux mauvais champs.
- **Fix** : Passer l'objet `listing` (et non `rentalUnit`) a `calculateContractData()`.

### 5.4 `rentalUnit.securityDeposit` n'existe pas
- **Fichier** : `services/LeaseService.ts`, ligne 443
- **Probleme** : `securityDeposit` est sur `Listing`, pas sur `RentalUnit`.
- **Fix** : Utiliser `application.listing.securityDeposit`.

### 5.5 Telephone hardcode pour Yousign
- **Fichier** : `app/api/leases/[applicationId]/sign/route.ts`, lignes 68 et 78
- **Probleme** : `phone_number: "+33612345678"` -- En production, Yousign enverra l'OTP a ce faux numero.
- **Fix** : Recuperer le vrai `phoneNumber` depuis les users.

### 5.6 Parsing du nom pour Yousign fragile
- **Fichier** : `app/api/leases/[applicationId]/sign/route.ts`, lignes 65-66
- **Code** : `first_name: t.name.split(' ')[0]`
- **Probleme** : Si `LeaseConfig.tenants[].name` est construit comme `"Jean Pierre Dupont"`, le prenom sera `"Jean"` et le nom `"Pierre Dupont"`. Mais si `firstName`/`lastName` sont disponibles, il vaut mieux les passer directement.
- **Fix** : Ajouter `firstName` et `lastName` dans `LeaseConfig.tenants[]` et `LeaseConfig.landlord`.

---

## 6. Plan de Migration Recommande

### Phase 1 : Corrections critiques (P0) -- Avant mise en prod
1. Migration Prisma : ajouter `isZoneTendue`, `referenceRent`, `referenceRentIncreased` sur Property
2. Fix code : passer le vrai `phoneNumber` a Yousign (pas de migration schema)
3. Fix code : corriger les acces `property.roomCount`, `rentalUnit.price`, etc.

### Phase 2 : Conformite legale (P1) -- Sprint suivant
1. Migration Prisma : tous les champs P1 (une seule migration)
2. Migration de donnees : convertir `Listing.charges` (Json) vers les nouveaux champs structures
3. Mise a jour `LeaseService.generateLeaseConfig()` pour utiliser les nouveaux champs
4. Mise a jour `LeaseDocument.tsx` pour afficher les diagnostics et annexes

### Phase 3 : Ameliorations (P2) -- Backlog
1. Migration Prisma : champs P2
2. Integration API zone tendue (data.gouv.fr) pour remplissage automatique de `isZoneTendue`
3. Integration API loyers de reference (observatoire des loyers) si applicable

---

## 7. References Legales

- **Loi n 89-462 du 6 juillet 1989** : contenu obligatoire du bail
- **Decret n 2015-587 du 29 mai 2015** : contrat type de location (annexe)
- **Loi ALUR (2014)** : encadrement des loyers, zone tendue
- **Loi ELAN (2018)** : bail mobilite
- **Arrete du 29 mai 2015** : notice d'information obligatoire
- **Article 3-3 de la loi du 6 juillet 1989** : liste des diagnostics obligatoires
