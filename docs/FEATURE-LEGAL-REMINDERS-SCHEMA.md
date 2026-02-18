# Feature : Rappels Legaux Automatiques - Analyse du Schema

> Analyse du schema Prisma actuel pour identifier les donnees existantes et manquantes
> en vue d'implementer un systeme de rappels legaux automatiques pour proprietaires bailleurs.

---

## 1. Etat des lieux du schema actuel

### 1.1 Diagnostics obligatoires

| Obligation legale | Donnee necessaire | Existe ? | Champ / Model | Commentaire |
|---|---|---|---|---|
| **DPE** - Classe energetique | Lettre DPE (A-G) | OUI | `Property.dpe` (`String?`) | Stocke comme "A", "B", etc. |
| **DPE** - Annee du diagnostic | Annee du DPE | OUI | `Property.dpe_year` (`Int?`) | Annee seule, pas la date precise |
| **DPE** - Couts energie | Min/Max annuel | OUI | `Property.energy_cost_min`, `Property.energy_cost_max` (`Int?`) | Couts en euros |
| **DPE** - Date d'expiration | Date expiration DPE | NON | -- | Le DPE est valide 10 ans. Calculable depuis `dpe_year` mais imprecis (mois/jour inconnus) |
| **GES** - Classe GES | Lettre GES | OUI | `Property.ges` (`String?`) | -- |
| **Amiante** - Eligibilite | Annee de construction | OUI | `Property.constructionYear` (`Int?`) + `Property.constructionPeriod` (`String?`) | Avant 1997 = diagnostic obligatoire |
| **Amiante** - Date diagnostic | Date du diagnostic amiante | NON | -- | Manquant |
| **Plomb (CREP)** - Eligibilite | Annee de construction | OUI | `Property.constructionYear` / `Property.constructionPeriod` | Avant 1949 = diagnostic obligatoire |
| **Plomb (CREP)** - Date diagnostic | Date du diagnostic plomb | NON | -- | Valide 1 an si positif, illimite si negatif |
| **Plomb (CREP)** - Resultat | Positif/Negatif | NON | -- | Necessaire pour determiner la duree de validite |
| **Electricite** - Date diagnostic | Date du diagnostic elec | NON | -- | Valide 6 ans pour location. Obligatoire si installation > 15 ans |
| **Electricite** - Age installation | Date/Annee installation | NON | -- | -- |
| **Gaz** - Date diagnostic | Date du diagnostic gaz | NON | -- | Valide 6 ans pour location. Obligatoire si installation > 15 ans |
| **Gaz** - Age installation | Date/Annee installation | NON | -- | -- |
| **ERP** (Etat des Risques) | Date du diagnostic ERP | NON | -- | Valide 6 mois seulement |
| **Chauffage** - Type | Type de chauffage | OUI | `Property.heatingSystem` (`String?`) | Codes : COL_GAZ, IND_ELEC, etc. |
| **Vitrage** | Type de vitrage | OUI | `Property.glazingType` (`String?`) | SIMPLE, DOUBLE, TRIPLE |

### 1.2 Bail et duree

| Obligation legale | Donnee necessaire | Existe ? | Champ / Model | Commentaire |
|---|---|---|---|---|
| **Type de bail** | Meuble/Vide/Etudiant/Mobilite | OUI (deductible) | `RentalUnit.isFurnished` + `RentalApplication.specificLeaseRequest` + `Listing.leaseType` | Le `LeaseService` calcule le `LeaseTemplateId` |
| **Date de debut du bail** | Date d'effet | OUI | `LeaseFinancials.startDate` (`DateTime @db.Date`) | Le premier `LeaseFinancials` avec `endDate = null` donne la date courante |
| **Date de fin du bail** | Date d'expiration | NON (calculable) | -- | Calculable depuis `startDate` + duree legale (3 ans vide, 1 an meuble, 9 mois etudiant, variable mobilite) |
| **Duree du bail** | Nombre de mois | NON (calculable) | -- | Determine par le `LeaseService.calculateContractData()` selon le template |
| **Statut du bail** | Signe/Brouillon/En attente | OUI | `RentalApplication.leaseStatus` (`LeaseStatus`: DRAFT, PENDING_SIGNATURE, SIGNED) | -- |
| **Date de candidature** | Date de soumission | OUI | `RentalApplication.appliedAt` (`DateTime`) | -- |
| **Conge bailleur** | Preavis 6 mois (vide) / 3 mois (meuble) | NON (calculable) | -- | Calculable depuis date de fin de bail - delai legal |
| **Conge locataire** | Preavis 1 ou 3 mois | NON (calculable) | -- | -- |
| **Date de signature electronique** | URL du bail signe | OUI | `RentalApplication.signedLeaseUrl` + `RentalApplication.yousignSignatureId` | Via Yousign |

### 1.3 Loyer et revision

| Obligation legale | Donnee necessaire | Existe ? | Champ / Model | Commentaire |
|---|---|---|---|---|
| **Loyer hors charges** | Montant en centimes | OUI | `LeaseFinancials.baseRentCents` (`Int`) | Historise via les enregistrements successifs |
| **Charges** | Provision sur charges | OUI | `LeaseFinancials.serviceChargesCents` (`Int`) | -- |
| **Loyer listing** | Prix annonce | OUI | `Listing.price` (`Int`) | Prix en euros (pas centimes) |
| **Charges listing** | Charges annonce | OUI | `Listing.charges` (`Json?`) | Format `{ amount: number, included: boolean }` |
| **Depot de garantie listing** | Montant | OUI | `Listing.securityDeposit` (`Int?`) | -- |
| **Revision IRL** - Trimestre | Trimestre de reference | OUI | `RentalApplication.indexationQuarter` (`Int?`) | 1, 2, 3 ou 4 |
| **Revision IRL** - Valeur de base | Index de base | OUI | `RentalApplication.baseIndexValue` (`Float?`) | Valeur IRL a la signature |
| **Indices IRL** | Table des indices | OUI | `RentIndex` model | `year`, `quarter`, `value`, `publishedAt` |
| **Historique financier** | Revisions successives | OUI | `LeaseFinancials[]` sur `RentalApplication` | Chaque revision cree un nouvel enregistrement |
| **Zone tendue** | Indicateur zone tendue | NON (API externe) | -- | Utilise via `/api/rent-control` qui appelle l'API Paris OpenData. Pas stocke en BDD |
| **Encadrement des loyers** | Loyer de reference | NON (API externe) | -- | Calcule a la volee via API, pas persiste |
| **Gel des loyers DPE F/G** | Classe DPE | OUI | `Property.dpe` | Si F ou G, gel des loyers depuis 2022 |

### 1.4 Charges et regularisation

| Obligation legale | Donnee necessaire | Existe ? | Champ / Model | Commentaire |
|---|---|---|---|---|
| **Charges recuperables** | Categorie + montant | OUI | `Expense` model | `category`, `amountTotalCents`, `isRecoverable`, `recoverableRatio` |
| **Frequence** | Periodicite | OUI | `Expense.frequency` (`ExpenseFrequency`) | ONCE, MONTHLY, QUARTERLY, YEARLY |
| **Justificatif** | Document | OUI | `Expense.proofUrl` (`String?`) | -- |
| **Regularisation** | Historique | OUI | `ReconciliationHistory` model | `periodStart`, `periodEnd`, `totalRealChargesCents`, `totalProvisionsCents`, `finalBalanceCents` |
| **Items de regularisation** | Detail par depense | OUI | `ReconciliationItem` (table pivot) | Lie `ReconciliationHistory` a `Expense` |
| **Verrouillage** | Depenses finalisees | OUI | `Expense.isFinalized` (`Boolean`) | Empeche la modification apres regularisation |
| **Date derniere regularisation** | Derniere date | OUI (deductible) | `ReconciliationHistory.createdAt` ou `periodEnd` | Filtre par `leaseId` + tri par date |
| **Deductibilite fiscale** | Montant deductible | OUI | `Expense.amountDeductibleCents` (`Int?`) | -- |

### 1.5 Depot de garantie

| Obligation legale | Donnee necessaire | Existe ? | Champ / Model | Commentaire |
|---|---|---|---|---|
| **Montant** | Montant du depot | OUI | `Listing.securityDeposit` (`Int?`) | En euros. Aussi calcule par `LeaseService` |
| **Date de debut de bail** | Pour calcul de restitution | OUI | `LeaseFinancials.startDate` | -- |
| **Date de fin de bail** | Declencheur restitution | NON | -- | Pas de champ explicite de fin de bail / remise des cles |
| **Date de remise des cles** | Debut du delai de restitution | NON | -- | Delai legal : 1 mois (EDL conforme) ou 2 mois |

### 1.6 Assurance

| Obligation legale | Donnee necessaire | Existe ? | Champ / Model | Commentaire |
|---|---|---|---|---|
| **Assurance PNO** (proprietaire) | Depense trackee | OUI (partiel) | `Expense` avec `category: INSURANCE` | Suivi financier uniquement, pas de date d'expiration |
| **Assurance GLI** | Depense trackee | OUI (partiel) | `Expense` avec `category: INSURANCE_GLI` | Idem |
| **Attestation assurance locataire** | Document du locataire | NON | -- | Le bailleur doit verifier annuellement. Aucun champ ni model |
| **Date derniere attestation** | Date de reception | NON | -- | -- |

### 1.7 Etat des lieux (EDL)

| Obligation legale | Donnee necessaire | Existe ? | Champ / Model | Commentaire |
|---|---|---|---|---|
| **EDL d'entree** | Document / Date | NON | -- | Mentionne dans `LeaseDocument.tsx` comme annexe mais pas stocke |
| **EDL de sortie** | Document / Date | NON | -- | Necessaire pour calculer le delai de restitution du depot |
| **Type d'EDL** | Amiable / Huissier | OUI (partiel) | `LeaseConfig.agency_fees.inventory_check_type` | Utilise dans la generation du bail, mais pas persiste en BDD |

### 1.8 Fiscalite

| Obligation legale | Donnee necessaire | Existe ? | Champ / Model | Commentaire |
|---|---|---|---|---|
| **Revenus fonciers** | Somme des loyers percus | OUI (calculable) | `LeaseFinancials` + `RentReceipt` | Calculable depuis les quittances |
| **Charges deductibles** | Depenses deductibles | OUI | `Expense.amountDeductibleCents` | -- |
| **Taxe fonciere** | Montant | OUI | `Expense` avec `category: TAX_PROPERTY` | -- |
| **Prix d'achat** | Pour calcul amortissement | OUI | `Property.purchasePrice` (`Int?`) | En euros |
| **Date limite declaration** | Echeance annuelle | NON | -- | Generalement mi-mai, mais pourrait etre un rappel systeme |
| **Regime fiscal** | Micro-foncier / Reel | NON | -- | Le proprietaire ne l'a pas renseigne |

### 1.9 Mobilier (Decence meublee)

| Obligation legale | Donnee necessaire | Existe ? | Champ / Model | Commentaire |
|---|---|---|---|---|
| **Inventaire mobilier** | Liste du mobilier | OUI | `Furniture` model | 13 elements obligatoires + optionnels |
| **Conformite decence** | Tous les obligatoires = true | OUI (calculable) | `Furniture.*` | Verifiable programmatiquement |

### 1.10 Quittances de loyer

| Obligation legale | Donnee necessaire | Existe ? | Champ / Model | Commentaire |
|---|---|---|---|---|
| **Generation mensuelle** | Quittance PDF | OUI | `RentReceipt` model | `pdfUrl`, `sentAt`, `periodStart/End` |
| **Envoi au locataire** | Date d'envoi | OUI | `RentReceipt.sentAt` (`DateTime?`) | -- |
| **Montants detailles** | Loyer + Charges | OUI | `RentReceipt.rentAmountCents`, `chargesAmountCents`, `totalAmountCents` | -- |
| **Cron de generation** | Automatisation | OUI | `/api/cron/generate-receipts/route.ts` | Cron job existant |

---

## 2. Donnees manquantes - Par priorite

### Priorite 1 - Critique (bloque les rappels principaux)

| Donnee manquante | Utilisation | Ajout recommande | Model cible |
|---|---|---|---|
| `dpeExpiryDate` | Expiration du DPE (validite 10 ans) | `DateTime? @db.Date` | `Property` |
| `leadDiagnosticDate` | Date du diagnostic plomb (CREP) | `DateTime? @db.Date` | `Property` |
| `leadDiagnosticPositive` | Resultat du CREP (positif = validite 1 an) | `Boolean?` | `Property` |
| `asbestosDiagnosticDate` | Date du diagnostic amiante | `DateTime? @db.Date` | `Property` |
| `electricalDiagnosticDate` | Date du diagnostic electricite | `DateTime? @db.Date` | `Property` |
| `gasDiagnosticDate` | Date du diagnostic gaz | `DateTime? @db.Date` | `Property` |
| `erpDate` | Date du dernier ERP (validite 6 mois) | `DateTime? @db.Date` | `Property` |
| `leaseEndDate` | Date explicite de fin de bail | `DateTime? @db.Date` | **Nouveau champ ou calculable** |

### Priorite 2 - Important (ameliore la precision des rappels)

| Donnee manquante | Utilisation | Ajout recommande | Model cible |
|---|---|---|---|
| `dpeDate` | Date precise du DPE (pas seulement l'annee) | `DateTime? @db.Date` | `Property` |
| `electricalInstallYear` | Annee installation electrique (> 15 ans = diagnostic obligatoire) | `Int?` | `Property` |
| `gasInstallYear` | Annee installation gaz | `Int?` | `Property` |
| `hasGasInstallation` | Presence d'une installation gaz | `Boolean @default(false)` | `Property` |
| `tenantInsuranceLastDate` | Derniere attestation d'assurance recue | `DateTime?` | `RentalApplication` |
| `tenantInsuranceDocUrl` | URL du document d'attestation | `String?` | `RentalApplication` |
| `keysReturnDate` | Date de remise des cles (fin de bail) | `DateTime?` | `RentalApplication` |

### Priorite 3 - Nice-to-have (completude du systeme)

| Donnee manquante | Utilisation | Ajout recommande | Model cible |
|---|---|---|---|
| `isRentControlled` | Logement en zone tendue | `Boolean @default(false)` | `Property` |
| `rentControlReferencePrice` | Loyer de reference encadrement | `Int?` | `Property` |
| `taxRegime` | Regime fiscal (MICRO_FONCIER, REEL) | `String?` | `User` ou nouveau model |
| `inventoryCheckInDate` | Date EDL d'entree | `DateTime?` | `RentalApplication` |
| `inventoryCheckInUrl` | Document EDL d'entree | `String?` | `RentalApplication` |
| `inventoryCheckOutDate` | Date EDL de sortie | `DateTime?` | `RentalApplication` |
| `inventoryCheckOutUrl` | Document EDL de sortie | `String?` | `RentalApplication` |
| `pnoInsuranceExpiryDate` | Expiration assurance PNO | `DateTime?` | `Property` |

---

## 3. Proposition : Model LegalReminder

### 3.1 Enums

```prisma
enum LegalReminderType {
  // Diagnostics
  DPE_EXPIRY
  LEAD_DIAGNOSTIC_EXPIRY
  ASBESTOS_DIAGNOSTIC_EXPIRY
  ELECTRICAL_DIAGNOSTIC_EXPIRY
  GAS_DIAGNOSTIC_EXPIRY
  ERP_EXPIRY

  // Bail
  LEASE_RENEWAL
  LEASE_END_NOTICE_LANDLORD    // Conge bailleur (6 mois avant pour vide, 3 pour meuble)
  LEASE_END_NOTICE_TENANT      // Rappel au locataire
  LEASE_EXPIRY

  // Loyer
  RENT_REVISION_IRL
  RENT_FREEZE_DPE_FG           // Gel loyer pour DPE F ou G

  // Charges
  CHARGES_REGULARIZATION       // Regularisation annuelle des charges

  // Depot de garantie
  DEPOSIT_RETURN_DEADLINE      // Restitution dans 1 ou 2 mois apres fin de bail

  // Assurance
  TENANT_INSURANCE_CHECK       // Verification annuelle attestation
  PNO_INSURANCE_EXPIRY         // Expiration assurance proprietaire

  // Etat des lieux
  INVENTORY_CHECK_IN           // Rappel EDL d'entree
  INVENTORY_CHECK_OUT          // Rappel EDL de sortie

  // Fiscalite
  TAX_DECLARATION_DEADLINE     // Declaration revenus fonciers (mi-mai)

  // Decence
  DECENCY_COMPLIANCE           // Mise en conformite decence energetique
  FURNITURE_COMPLIANCE         // Completude mobilier meuble

  // Quittances
  RENT_RECEIPT_SEND            // Envoi quittance mensuelle

  // Autre
  CUSTOM                       // Rappel personnalise par le proprietaire
}

enum LegalReminderStatus {
  PENDING                      // A venir
  UPCOMING                     // Bientot (dans le delai de rappel)
  NOTIFIED                     // Notification envoyee
  COMPLETED                    // Action realisee
  DISMISSED                    // Ignore par l'utilisateur
  OVERDUE                      // En retard (dueDate depassee)
}

enum LegalReminderPriority {
  LOW                          // Information
  MEDIUM                       // A planifier
  HIGH                         // Urgent
  CRITICAL                     // Obligation legale imminente
}
```

### 3.2 Model principal

```prisma
model LegalReminder {
  id                    String                @id @default(uuid())

  // -- Qui est concerne --
  userId                String                // Le proprietaire bailleur
  propertyId            String?               // Le bien concerne (si applicable)
  rentalApplicationId   String?               // Le bail concerne (si applicable)

  // -- Type et contenu --
  type                  LegalReminderType
  priority              LegalReminderPriority @default(MEDIUM)
  title                 String                // Ex: "DPE expire dans 2 mois"
  description           String?               // Details et explication legale
  legalReference        String?               // Ex: "Art. 3-3 Loi 89-462"
  actionUrl             String?               // Lien vers l'action a realiser dans l'app

  // -- Echeances --
  dueDate               DateTime              // Date limite legale
  reminderDate          DateTime              // Date a laquelle envoyer le 1er rappel
  secondReminderDate    DateTime?             // Optionnel : 2e rappel plus proche
  recurrenceRule        String?               // Pour rappels recurrents (ex: "YEARLY", "MONTHLY")
  nextOccurrence        DateTime?             // Prochaine occurrence si recurrent

  // -- Statut --
  status                LegalReminderStatus   @default(PENDING)
  completedAt           DateTime?
  dismissedAt           DateTime?
  dismissReason         String?

  // -- Notification --
  notifiedAt            DateTime?             // Date du 1er rappel envoye
  secondNotifiedAt      DateTime?             // Date du 2e rappel envoye
  notificationChannels  String[]              // ["EMAIL", "PUSH", "IN_APP"]

  // -- Source --
  isAutoGenerated       Boolean               @default(true)  // Genere par le systeme vs cree manuellement
  sourceField           String?               // Champ source (ex: "Property.dpeExpiryDate")

  // -- Metadata --
  metadata              Json?                 // Donnees supplementaires libres
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt

  // -- Relations --
  user                  User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  property              Property?             @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  rentalApplication     RentalApplication?    @relation(fields: [rentalApplicationId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([propertyId])
  @@index([rentalApplicationId])
  @@index([dueDate])
  @@index([reminderDate])
  @@index([status])
  @@index([type])
  @@index([userId, status])
  @@index([userId, dueDate])
}
```

### 3.3 Relations a ajouter sur les models existants

```prisma
// Sur User :
model User {
  // ... champs existants ...
  legalReminders  LegalReminder[]
}

// Sur Property :
model Property {
  // ... champs existants ...
  legalReminders  LegalReminder[]
}

// Sur RentalApplication :
model RentalApplication {
  // ... champs existants ...
  legalReminders  LegalReminder[]
}
```

---

## 4. Proposition : Nouveaux champs sur les models existants

### 4.1 Property -- Diagnostics

```prisma
model Property {
  // ... champs existants ...

  // ---- DIAGNOSTICS IMMOBILIERS ----

  // DPE (Diagnostic de Performance Energetique)
  // Existant : dpe (String?), dpe_year (Int?), energy_cost_min/max (Int?), ges (String?)
  dpeDate               DateTime?  @db.Date  // Date precise du DPE (remplace dpe_year a terme)
  dpeExpiryDate         DateTime?  @db.Date  // Date d'expiration (dpeDate + 10 ans)

  // Plomb - CREP (Constat de Risque d'Exposition au Plomb)
  // Obligatoire si constructionYear < 1949
  leadDiagnosticDate    DateTime?  @db.Date
  leadDiagnosticPositive Boolean?             // true = positif (validite 1 an), false = negatif (illimite)

  // Amiante (Diagnostic Technique Amiante - DTA)
  // Obligatoire si constructionYear < 1997
  asbestosDiagnosticDate DateTime? @db.Date
  asbestosPositive       Boolean?             // Si positif, controle periodique obligatoire

  // Electricite
  // Obligatoire si installation > 15 ans
  electricalDiagnosticDate DateTime? @db.Date  // Validite 6 ans (location)
  electricalInstallYear    Int?                // Annee de l'installation electrique

  // Gaz
  // Obligatoire si installation > 15 ans
  gasDiagnosticDate     DateTime?  @db.Date   // Validite 6 ans (location)
  gasInstallYear        Int?                   // Annee de l'installation gaz
  hasGasInstallation    Boolean    @default(false)  // Le logement a-t-il le gaz ?

  // ERP (Etat des Risques et Pollutions)
  erpDate               DateTime?  @db.Date   // Validite 6 mois seulement

  // Zone tendue
  isRentControlled      Boolean    @default(false)  // Cache local pour ne pas requeter l'API a chaque fois
  rentControlReferencePrice Int?               // Loyer de reference en euros

  // Assurance PNO
  pnoInsuranceExpiryDate DateTime? @db.Date
}
```

### 4.2 RentalApplication -- Bail / Assurance / EDL

```prisma
model RentalApplication {
  // ... champs existants ...

  // ---- FIN DE BAIL ----
  leaseEndDate          DateTime?  @db.Date   // Date de fin de bail (calculee ou saisie)
  keysReturnDate        DateTime?             // Date effective de remise des cles

  // ---- ASSURANCE LOCATAIRE ----
  tenantInsuranceLastDate  DateTime?           // Date de la derniere attestation recue
  tenantInsuranceDocUrl    String?             // URL du document

  // ---- ETAT DES LIEUX ----
  inventoryCheckInDate   DateTime?  @db.Date  // Date de l'EDL d'entree
  inventoryCheckInUrl    String?              // Document EDL entree (PDF/photo)
  inventoryCheckOutDate  DateTime?  @db.Date  // Date de l'EDL de sortie
  inventoryCheckOutUrl   String?              // Document EDL sortie
  inventoryCheckType     String?              // "AMICABLE" ou "HUISSIER"
}
```

### 4.3 NotificationPreferences -- Rappels legaux

```prisma
model NotificationPreferences {
  // ... champs existants ...

  // ---- RAPPELS LEGAUX ----
  enableLegalReminders    Boolean @default(true)
  legalReminderLeadDays   Int     @default(30)   // Combien de jours avant l'echeance
}
```

---

## 5. Architecture du systeme de rappels

### 5.1 Vue d'ensemble

```
+---------------------+       +---------------------+       +---------------------+
|  EVENEMENTS         |       |  MOTEUR DE RAPPELS  |       |  NOTIFICATIONS      |
|  DECLENCHEURS       | ----> |  (ReminderEngine)   | ----> |  (Multi-canal)      |
+---------------------+       +---------------------+       +---------------------+
| - Creation Property |       | - Calcul echeances  |       | - In-app (Notif)    |
| - Signature bail    |       | - Creation rappels  |       | - Push (Web Push)   |
| - Modif diagnostic  |       | - Mise a jour statut|       | - Email (sendEmail) |
| - Cron quotidien    |       | - Recurrence        |       +---------------------+
| - Regularisation    |       +---------------------+
+---------------------+
```

### 5.2 Service principal : `ReminderEngine`

```typescript
// services/ReminderEngine.ts

class ReminderEngine {

  /**
   * Recalcule TOUS les rappels pour un proprietaire.
   * Appele lors d'un changement majeur (creation de bien, signature bail, etc.)
   */
  static async syncRemindersForUser(userId: string): Promise<void>;

  /**
   * Recalcule les rappels pour un bien specifique.
   * Appele lors de la modification d'un champ diagnostic.
   */
  static async syncRemindersForProperty(propertyId: string): Promise<void>;

  /**
   * Recalcule les rappels pour un bail specifique.
   * Appele lors de la signature ou modification d'un bail.
   */
  static async syncRemindersForLease(applicationId: string): Promise<void>;

  /**
   * Cron quotidien : met a jour les statuts des rappels
   * - PENDING -> UPCOMING (si reminderDate atteinte)
   * - UPCOMING -> OVERDUE (si dueDate depassee)
   * - Envoie les notifications planifiees
   */
  static async dailyCronJob(): Promise<CronResult>;

  /**
   * Marque un rappel comme complete.
   */
  static async completeReminder(reminderId: string): Promise<void>;

  /**
   * Marque un rappel comme ignore.
   */
  static async dismissReminder(reminderId: string, reason?: string): Promise<void>;
}
```

### 5.3 Calculateurs par type

Chaque type de rappel a sa propre logique de calcul d'echeance :

```typescript
// services/reminders/DiagnosticReminders.ts

// DPE : expire 10 ans apres la date du diagnostic
function calculateDpeReminder(property: Property): ReminderData | null {
  if (!property.dpeExpiryDate) return null;
  return {
    type: 'DPE_EXPIRY',
    dueDate: property.dpeExpiryDate,
    reminderDate: subMonths(property.dpeExpiryDate, 3), // 3 mois avant
    secondReminderDate: subMonths(property.dpeExpiryDate, 1), // 1 mois avant
    priority: 'HIGH',
  };
}

// Plomb : 1 an si positif, illimite si negatif
function calculateLeadReminder(property: Property): ReminderData | null {
  if (!property.constructionYear || property.constructionYear >= 1949) return null;
  if (!property.leadDiagnosticDate) {
    // Pas de diagnostic alors que c'est obligatoire
    return { type: 'LEAD_DIAGNOSTIC_EXPIRY', dueDate: new Date(), priority: 'CRITICAL' };
  }
  if (property.leadDiagnosticPositive) {
    const expiry = addYears(property.leadDiagnosticDate, 1);
    return { type: 'LEAD_DIAGNOSTIC_EXPIRY', dueDate: expiry, ... };
  }
  return null; // Negatif = pas de rappel
}

// Amiante : pas de date d'expiration si negatif. Controle tous les 3 ans si positif.
function calculateAsbestosReminder(property: Property): ReminderData | null;

// Electricite : 6 ans de validite
function calculateElectricalReminder(property: Property): ReminderData | null;

// Gaz : 6 ans de validite
function calculateGasReminder(property: Property): ReminderData | null;

// ERP : 6 mois de validite (renouveler a chaque nouveau bail)
function calculateErpReminder(property: Property): ReminderData | null;
```

```typescript
// services/reminders/LeaseReminders.ts

// Conge bailleur : 6 mois avant (vide) ou 3 mois avant (meuble)
function calculateLandlordNoticeReminder(lease, leaseType): ReminderData | null;

// Revision IRL : a la date anniversaire du bail
function calculateRentRevisionReminder(lease, financials): ReminderData | null;

// Regularisation des charges : annuelle
function calculateChargesRegularizationReminder(lease, lastReconciliation): ReminderData | null;

// Attestation assurance locataire : annuelle
function calculateTenantInsuranceReminder(lease): ReminderData | null;

// Restitution depot de garantie : 1 ou 2 mois apres remise des cles
function calculateDepositReturnReminder(lease): ReminderData | null;
```

```typescript
// services/reminders/TaxReminders.ts

// Declaration fiscale : chaque annee mi-mai
function calculateTaxDeclarationReminder(userId: string): ReminderData;

// Gel des loyers DPE F/G
function calculateRentFreezeReminder(property: Property, lease): ReminderData | null {
  if (property.dpe === 'F' || property.dpe === 'G') {
    return {
      type: 'RENT_FREEZE_DPE_FG',
      priority: 'CRITICAL',
      title: 'Gel des loyers - DPE ' + property.dpe,
      description: 'La revision du loyer est interdite pour les logements classes F ou G.',
    };
  }
  return null;
}
```

### 5.4 Cron job

```typescript
// app/api/cron/legal-reminders/route.ts

export async function GET(request: Request) {
  // 1. Verifier CRON_SECRET
  // 2. Trouver les rappels ou reminderDate <= now() ET status = PENDING
  // 3. Passer en UPCOMING + envoyer notification
  // 4. Trouver les rappels ou dueDate < now() ET status != COMPLETED/DISMISSED
  // 5. Passer en OVERDUE + envoyer notification urgente
  // 6. Generer les rappels recurrents (nextOccurrence)
}
```

---

## 6. Evenements declencheurs

### 6.1 Tableau des evenements

| Evenement | Declencheur technique | Rappels concernes |
|---|---|---|
| **Creation d'un bien** (`Property`) | `POST /api/properties` | Diagnostics (DPE, Plomb, Amiante, Elec, Gaz si applicable) |
| **Modification diagnostic** | `PUT /api/properties/[id]` (champs diagnostic) | Recalcul du rappel correspondant |
| **Signature du bail** | `POST /api/webhooks/yousign` (callback Yousign) | Bail (fin, conge), IRL, Charges, Assurance locataire, EDL |
| **Modification financiere** | `LeaseService.indexRent()` | Mise a jour du rappel IRL pour l'annee suivante |
| **Regularisation des charges** | `commitRegularization()` | Report du rappel regularisation a l'annee suivante |
| **Fin de bail / Remise des cles** | Action manuelle du proprietaire | Depot de garantie, EDL de sortie |
| **Cron quotidien** | `/api/cron/legal-reminders` (tous les jours a 8h) | Tous les rappels (mise a jour des statuts + notifications) |
| **Changement de DPE** | Mise a jour du champ `dpe` sur `Property` | Gel des loyers si F/G, rappel DPE |
| **Annee civile** | 1er janvier (via cron) | Declaration fiscale, nouveau cycle de regularisation |
| **Reception attestation assurance** | Action manuelle | Report du rappel assurance a l'annee suivante |

### 6.2 Points d'integration dans le code existant

| Fichier existant | Modification necessaire |
|---|---|
| `app/api/webhooks/yousign/route.ts` | Apres signature du bail : appeler `ReminderEngine.syncRemindersForLease(applicationId)` |
| `services/LeaseService.ts` (`indexRent`) | Apres revision : mettre a jour le rappel IRL |
| `app/actions/regularization.ts` (`commitRegularization`) | Apres commit : mettre a jour le rappel de regularisation |
| `app/api/listings/route.ts` (creation listing) | Apres creation : generer les rappels diagnostics |
| `app/api/listings/[listingId]/route.ts` (mise a jour) | Si champs diagnostic modifies : recalculer les rappels |
| Nouveau : `app/api/cron/legal-reminders/route.ts` | Cron quotidien pour le traitement batch |

### 6.3 Infrastructure de notification existante (reutilisable)

Le projet dispose deja de toute l'infrastructure necessaire :

- **In-app** : Model `Notification` + `createNotification()` dans `libs/notifications.ts`
- **Push** : Model `PushSubscription` + `sendPushNotification()` dans `app/lib/sendPushNotification.ts`
- **Email** : `sendEmail()` dans `lib/email.ts`
- **Preferences** : Model `NotificationPreferences` avec toggles et DND
- **Cron** : Pattern etabli avec `/api/cron/*` + `CRON_SECRET` + Vercel/externe

---

## 7. Resume des echeances legales

Pour reference, voici les durees de validite a implementer dans le `ReminderEngine` :

| Diagnostic / Obligation | Validite | Delai de rappel recommande |
|---|---|---|
| DPE | 10 ans | 3 mois + 1 mois avant |
| Plomb (CREP) positif | 1 an | 2 mois avant |
| Plomb (CREP) negatif | Illimitee | Aucun rappel |
| Amiante negatif | Illimitee | Aucun rappel |
| Amiante positif | 3 ans (controle periodique) | 3 mois avant |
| Electricite (location) | 6 ans | 3 mois + 1 mois avant |
| Gaz (location) | 6 ans | 3 mois + 1 mois avant |
| ERP | 6 mois | 1 mois + 1 semaine avant |
| Conge bailleur (vide) | 6 mois avant fin bail | 7 mois avant |
| Conge bailleur (meuble) | 3 mois avant fin bail | 4 mois avant |
| Revision IRL | Date anniversaire | 1 mois avant |
| Regularisation charges | Annuelle | 2 mois avant fin d'annee civile |
| Attestation assurance locataire | Annuelle | A la date anniversaire du bail |
| Restitution depot de garantie | 1 mois (EDL conforme) / 2 mois | Immediat apres remise des cles |
| Declaration fiscale | Mi-mai chaque annee | 1er avril |
| Gel loyer DPE F/G | Permanent tant que F/G | Alerte permanente |

---

## 8. Migration Prisma estimee

La migration ajouterait :
- **~15 champs** sur `Property` (diagnostics + zone tendue)
- **~7 champs** sur `RentalApplication` (fin de bail, assurance, EDL)
- **~2 champs** sur `NotificationPreferences`
- **1 nouveau model** `LegalReminder` avec 2 enums (`LegalReminderType`, `LegalReminderStatus`, `LegalReminderPriority`)
- **3 relations** a ajouter (User, Property, RentalApplication)
- **~8 index** sur `LegalReminder` pour les requetes performantes

Tous les nouveaux champs sont **optionnels** (`?`), donc la migration est **non-destructive** et compatible avec les donnees existantes.
