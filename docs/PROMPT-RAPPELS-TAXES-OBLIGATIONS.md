# Ajout Rappels Taxes & Obligations Propriétaire — Extension ReminderEngine

## Contexte

Le système de rappels légaux existe et fonctionne (`ReminderEngine`, model `LegalReminder`, cron quotidien, 14 types actuels). Mais il ne couvre que les obligations liées au bail et aux diagnostics. Il manque **toutes les taxes et impôts** que le propriétaire bailleur doit payer — taxe foncière, TLV, CFE, etc. — ainsi que des obligations administratives récurrentes.

**Ce qui existe déjà :**
- Model `LegalReminder` avec enum `LegalReminderType`, `LegalReminderStatus`, `LegalReminderPriority`
- `ReminderEngine.ts` avec `syncRemindersForUser`, `syncRemindersForProperty`, `syncRemindersForLease`, `dailyCronJob`
- Calculateurs dans `services/reminders/DiagnosticReminders.ts`, `LeaseReminders.ts`, `TaxReminders.ts`
- Cron quotidien `/api/cron/legal-reminders/`
- Infrastructure notification : in-app, push, email

**Ce qu'on ajoute :** 11 nouveaux types de rappels. Aucun changement de structure — on étend l'enum, on ajoute des calculateurs, et on branche sur le cron existant.

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Schema & Migration (Prisma, enum, champs Property)

**Mission :** Étendre l'enum `LegalReminderType` avec les 11 nouveaux types. Ajouter les champs nécessaires sur `Property` pour alimenter les conditions de déclenchement.

**Fichiers à modifier :**
- `prisma/schema.prisma` — Étendre l'enum + ajouter champs Property

### Agent 2 — Calculateurs de rappels (logique métier)

**Mission :** Créer le fichier `services/reminders/TaxAndPropertyReminders.ts` avec un calculateur pour chaque nouveau type. Chaque calculateur retourne un `ReminderData` ou `null` selon les conditions.

**Fichiers à produire :**
- `services/reminders/TaxAndPropertyReminders.ts` — **Nouveau**

**Fichiers à modifier :**
- `services/ReminderEngine.ts` — Appeler les nouveaux calculateurs dans `syncRemindersForProperty` et `syncRemindersForUser`

### Agent 3 — Intégration & Tests

**Mission :** Brancher les nouveaux calculateurs dans le cron existant, s'assurer que la migration est propre, vérifier les cas limites.

**Fichiers à modifier :**
- `services/ReminderEngine.ts` — Intégration dans les flows existants
- Migration Prisma

---

## AGENT 1 — SCHEMA & MIGRATION

### Extension de l'enum `LegalReminderType`

Ajouter ces 11 valeurs à l'enum existante :

```prisma
enum LegalReminderType {
  // ... types existants (ne pas toucher) ...

  // ===== NOUVEAUX — Taxes & impôts =====
  PROPERTY_TAX_DEADLINE           // Taxe foncière (TFPB)
  TEOM_RECOVERY                   // Récupération TEOM auprès du locataire
  VACANT_PROPERTY_TAX             // Taxe sur les logements vacants (TLV)
  SECONDARY_RESIDENCE_TAX         // Taxe d'habitation résidence secondaire
  CFE_DEADLINE                    // Cotisation Foncière des Entreprises (meublé)
  SOCIAL_CONTRIBUTIONS_INFO       // Prélèvements sociaux CSG/CRDS (informatif)

  // ===== NOUVEAUX — Obligations administratives =====
  OCCUPANCY_DECLARATION           // Déclaration d'occupation impots.gouv.fr
  PNO_INSURANCE_RENEWAL           // Renouvellement assurance PNO
  BOILER_MAINTENANCE_CHECK        // Vérification entretien chaudière/clim
  ENERGY_BAN_DEADLINE             // Interdiction location passoire énergétique
  SMOKE_DETECTOR_CHECK            // Vérification détecteur de fumée
}
```

### Nouveaux champs sur `Property`

Ajouter les champs nécessaires pour alimenter les conditions. Tous optionnels :

```prisma
model Property {
  // ... champs existants ...

  // ===== NOUVEAUX — Taxes =====
  propertyTaxAmount        Float?              // Montant taxe foncière (pour info)
  teomAmount               Float?              // Montant TEOM (récupérable)
  isInTenseZone            Boolean @default(false) // Zone tendue (>50k habitants) — pour TLV
  vacantSince              DateTime?           // Date depuis laquelle le bien est vacant (null si occupé)
  isFurnished              Boolean @default(false) // Meublé (pour CFE et taxe d'hab secondaire)

  // ===== NOUVEAUX — Obligations =====
  pnoInsuranceExpiryDate   DateTime?           // Date expiration assurance PNO
  pnoInsuranceProvider     String?             // Nom assureur PNO
  heatingType              String?             // "GAS_BOILER" | "ELECTRIC" | "HEAT_PUMP" | "OTHER" | null
  lastBoilerMaintenanceDate DateTime?          // Dernière date entretien chaudière
  smokeDetectorInstalledAt  DateTime?          // Date installation DAAF
  smokeDetectorCheckedAt    DateTime?          // Dernière vérification
}
```

**Note :** vérifier si `isInTenseZone` (zoneTendue) et `isFurnished` existent déjà dans le schema. Si oui, les réutiliser. Ne pas créer de doublons.

### Migration

```bash
npx prisma migrate dev --name add-tax-and-property-reminder-fields
```

Non-destructive : tous les nouveaux champs sont optionnels.

---

## AGENT 2 — CALCULATEURS

### Fichier `services/reminders/TaxAndPropertyReminders.ts`

Chaque fonction suit le pattern existant : prend les données du bien/user, retourne un `ReminderData | null`.

```typescript
// services/reminders/TaxAndPropertyReminders.ts

import { Property, RentalApplication } from '@prisma/client';
import { subMonths, subDays, addYears, isBefore, differenceInMonths } from 'date-fns';

interface ReminderData {
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  legalReference?: string;
  dueDate: Date;
  reminderDate: Date;
  secondReminderDate?: Date;
  recurrenceRule?: string;
  metadata?: Record<string, any>;
}
```

### 1. PROPERTY_TAX_DEADLINE — Taxe foncière

```typescript
function calculatePropertyTaxReminder(property: Property, year: number): ReminderData {
  // Échéance : 15 octobre de chaque année (20 octobre si paiement en ligne)
  const dueDate = new Date(year, 9, 15); // mois 9 = octobre (0-indexed)

  return {
    type: 'PROPERTY_TAX_DEADLINE',
    priority: 'HIGH',
    title: `Taxe foncière ${year} — ${property.title}`,
    description: property.propertyTaxAmount
      ? `Montant estimé : ${property.propertyTaxAmount} €. Échéance le 15 octobre. Pensez à vérifier votre avis sur impots.gouv.fr.`
      : `Échéance le 15 octobre. Vérifiez votre avis sur impots.gouv.fr.`,
    legalReference: 'Art. 1380 CGI',
    dueDate,
    reminderDate: new Date(year, 8, 1),         // 1er septembre
    secondReminderDate: new Date(year, 9, 1),   // 1er octobre
    recurrenceRule: 'YEARLY',
    metadata: { amount: property.propertyTaxAmount },
  };
}
```

| Paramètre | Valeur |
|-----------|--------|
| **Condition** | Toujours (tout propriétaire paie la taxe foncière) |
| **Échéance** | 15 octobre chaque année |
| **1er rappel** | 1er septembre (45 jours avant) |
| **2e rappel** | 1er octobre (15 jours avant) |
| **Priorité** | HIGH |
| **Récurrence** | YEARLY |
| **Référence légale** | Art. 1380 CGI |

---

### 2. TEOM_RECOVERY — Récupération TEOM

```typescript
function calculateTeomRecoveryReminder(
  property: Property,
  activeLease: RentalApplication | null,
  year: number
): ReminderData | null {
  // Condition : bien loué + TEOM renseignée
  if (!activeLease || !property.teomAmount || property.teomAmount <= 0) return null;

  // Rappel après réception de l'avis de taxe foncière (novembre)
  const dueDate = new Date(year, 11, 31); // 31 décembre

  return {
    type: 'TEOM_RECOVERY',
    priority: 'MEDIUM',
    title: `Récupérer la TEOM auprès du locataire — ${property.title}`,
    description: `La TEOM de ${property.teomAmount} € figure sur votre avis de taxe foncière. Elle est récupérable auprès du locataire dans les charges. Pensez à la régulariser.`,
    legalReference: 'Décret 87-713, Art. 8',
    dueDate,
    reminderDate: new Date(year, 10, 1),  // 1er novembre
    recurrenceRule: 'YEARLY',
    metadata: { amount: property.teomAmount },
  };
}
```

| Paramètre | Valeur |
|-----------|--------|
| **Condition** | Bien loué ET teomAmount > 0 |
| **Échéance** | 31 décembre (régularisation annuelle) |
| **1er rappel** | 1er novembre (après réception avis TF) |
| **Priorité** | MEDIUM |
| **Récurrence** | YEARLY |
| **Référence légale** | Décret 87-713 du 26 août 1987, Art. 8 |

---

### 3. VACANT_PROPERTY_TAX — Taxe logements vacants (TLV)

```typescript
function calculateVacantPropertyTaxReminder(property: Property): ReminderData | null {
  // Condition : bien en zone tendue + vacant depuis plus de 12 mois
  if (!property.isInTenseZone) return null;
  if (!property.vacantSince) return null;

  const monthsVacant = differenceInMonths(new Date(), property.vacantSince);
  if (monthsVacant < 10) return null; // Alerter avant les 12 mois

  const isFirstYear = monthsVacant < 24;
  const taxRate = isFirstYear ? '17%' : '34%';

  return {
    type: 'VACANT_PROPERTY_TAX',
    priority: 'CRITICAL',
    title: `Taxe logement vacant — ${property.title}`,
    description: `Votre bien est vacant depuis ${monthsVacant} mois en zone tendue. La TLV s'applique au taux de ${taxRate} de la valeur locative. Publiez une annonce pour éviter cette taxe.`,
    legalReference: 'Art. 232 CGI',
    dueDate: addYears(property.vacantSince, 1), // 1 an après début vacance
    reminderDate: new Date(), // Immédiat
    metadata: { monthsVacant, taxRate },
  };
}
```

| Paramètre | Valeur |
|-----------|--------|
| **Condition** | `isInTenseZone === true` ET `vacantSince` renseigné ET vacant > 10 mois |
| **Échéance** | 12 mois après début de vacance |
| **1er rappel** | Immédiat dès que la condition est remplie (10 mois) |
| **Priorité** | CRITICAL |
| **Récurrence** | Non (alerte permanente tant que vacant) |
| **Référence légale** | Art. 232 CGI |
| **Mise à jour automatique de `vacantSince`** | Quand un bail se termine → `vacantSince = bail.endDate`. Quand un bail est signé → `vacantSince = null` |

---

### 4. SECONDARY_RESIDENCE_TAX — Taxe d'habitation résidence secondaire

```typescript
function calculateSecondaryResidenceTaxReminder(
  property: Property,
  activeLease: RentalApplication | null,
  year: number
): ReminderData | null {
  // Condition : bien meublé + pas de locataire au 1er janvier
  // Un bien meublé sans locataire = résidence secondaire du propriétaire
  if (!property.isFurnished) return null;
  if (activeLease) return null; // Si loué, c'est le locataire qui paie (ou personne si TH supprimée)

  const dueDate = new Date(year, 11, 15); // Mi-décembre

  return {
    type: 'SECONDARY_RESIDENCE_TAX',
    priority: 'MEDIUM',
    title: `Taxe d'habitation résidence secondaire — ${property.title}`,
    description: `Votre bien meublé n'est pas loué. Il est considéré comme résidence secondaire et la taxe d'habitation s'applique (non supprimée pour les résidences secondaires). Certaines communes appliquent une surtaxe.`,
    legalReference: 'Art. 1407 CGI',
    dueDate,
    reminderDate: new Date(year, 10, 1),  // 1er novembre
    recurrenceRule: 'YEARLY',
  };
}
```

| Paramètre | Valeur |
|-----------|--------|
| **Condition** | `isFurnished === true` ET pas de bail actif |
| **Échéance** | Mi-décembre chaque année |
| **1er rappel** | 1er novembre |
| **Priorité** | MEDIUM |
| **Récurrence** | YEARLY |
| **Référence légale** | Art. 1407 CGI |

---

### 5. CFE_DEADLINE — Cotisation Foncière des Entreprises

```typescript
function calculateCfeReminder(
  property: Property,
  year: number
): ReminderData | null {
  // Condition : location meublée uniquement (BIC = activité commerciale)
  if (!property.isFurnished) return null;

  const dueDate = new Date(year, 11, 15); // 15 décembre

  return {
    type: 'CFE_DEADLINE',
    priority: 'HIGH',
    title: `CFE ${year} — ${property.title}`,
    description: `En tant que loueur en meublé, vous êtes redevable de la CFE. Vérifiez votre avis sur impots.gouv.fr (espace professionnel). Déductible de vos revenus BIC.`,
    legalReference: 'Art. 1447 CGI',
    dueDate,
    reminderDate: new Date(year, 10, 15), // 15 novembre
    secondReminderDate: new Date(year, 11, 1), // 1er décembre
    recurrenceRule: 'YEARLY',
  };
}
```

| Paramètre | Valeur |
|-----------|--------|
| **Condition** | `isFurnished === true` (location meublée = BIC) |
| **Échéance** | 15 décembre chaque année |
| **1er rappel** | 15 novembre |
| **2e rappel** | 1er décembre |
| **Priorité** | HIGH |
| **Récurrence** | YEARLY |
| **Référence légale** | Art. 1447 CGI |

---

### 6. SOCIAL_CONTRIBUTIONS_INFO — Prélèvements sociaux CSG/CRDS

```typescript
function calculateSocialContributionsReminder(
  userId: string,
  year: number,
  totalRevenueFoncier: number
): ReminderData | null {
  // Condition : le proprio a des revenus fonciers > 0
  if (totalRevenueFoncier <= 0) return null;

  const estimatedCSG = Math.round(totalRevenueFoncier * 0.172); // 17.2%
  const dueDate = new Date(year + 1, 4, 15); // Mi-mai N+1 (avec la déclaration)

  return {
    type: 'SOCIAL_CONTRIBUTIONS_INFO',
    priority: 'LOW',
    title: `Prélèvements sociaux ${year} — estimation`,
    description: `Sur vos revenus fonciers nets de ${totalRevenueFoncier} €, les prélèvements sociaux (CSG/CRDS) sont estimés à ~${estimatedCSG} € (17,2%). Ce montant sera prélevé automatiquement après votre déclaration.`,
    legalReference: 'Art. L136-7 CSS',
    dueDate,
    reminderDate: new Date(year + 1, 3, 1), // 1er avril N+1
    recurrenceRule: 'YEARLY',
    metadata: { revenueFoncier: totalRevenueFoncier, estimatedAmount: estimatedCSG },
  };
}
```

| Paramètre | Valeur |
|-----------|--------|
| **Condition** | Revenus fonciers nets > 0 sur l'année |
| **Échéance** | Mi-mai N+1 (en même temps que la déclaration de revenus) |
| **1er rappel** | 1er avril N+1 (avec le rappel TAX_DECLARATION_DEADLINE existant) |
| **Priorité** | LOW (informatif — le prélèvement est automatique) |
| **Récurrence** | YEARLY |
| **Référence légale** | Art. L136-7 Code de la Sécurité Sociale |

---

### 7. OCCUPANCY_DECLARATION — Déclaration d'occupation

```typescript
function calculateOccupancyDeclarationReminder(
  userId: string,
  year: number
): ReminderData {
  // Obligatoire pour TOUS les propriétaires depuis 2023
  const dueDate = new Date(year, 6, 1); // 1er juillet

  return {
    type: 'OCCUPANCY_DECLARATION',
    priority: 'HIGH',
    title: `Déclaration d'occupation ${year}`,
    description: `Obligatoire depuis 2023 : déclarez l'occupation de chacun de vos biens sur impots.gouv.fr (rubrique "Gérer mes biens immobiliers"). Indiquez si le bien est loué, vacant ou occupé, et l'identité des occupants.`,
    legalReference: 'Art. 1418 CGI (loi de finances 2020)',
    dueDate,
    reminderDate: new Date(year, 4, 1),   // 1er mai
    secondReminderDate: new Date(year, 5, 1), // 1er juin
    recurrenceRule: 'YEARLY',
  };
}
```

| Paramètre | Valeur |
|-----------|--------|
| **Condition** | Toujours (obligatoire pour tout propriétaire) |
| **Échéance** | 1er juillet chaque année |
| **1er rappel** | 1er mai |
| **2e rappel** | 1er juin |
| **Priorité** | HIGH |
| **Récurrence** | YEARLY |
| **Référence légale** | Art. 1418 CGI |

---

### 8. PNO_INSURANCE_RENEWAL — Assurance PNO

```typescript
function calculatePnoInsuranceReminder(property: Property): ReminderData | null {
  // Condition : copropriété (obligatoire loi Alur) ou bien renseigné
  if (!property.pnoInsuranceExpiryDate) return null;

  return {
    type: 'PNO_INSURANCE_RENEWAL',
    priority: 'HIGH',
    title: `Renouvellement assurance PNO — ${property.title}`,
    description: property.pnoInsuranceProvider
      ? `Votre assurance PNO (${property.pnoInsuranceProvider}) expire bientôt. En copropriété, cette assurance est obligatoire (loi Alur). Pensez à la renouveler ou à comparer les offres.`
      : `Votre assurance PNO expire bientôt. En copropriété, cette assurance est obligatoire (loi Alur).`,
    legalReference: 'Loi Alur 2014, Art. 9-1 Loi 65-557',
    dueDate: property.pnoInsuranceExpiryDate,
    reminderDate: subMonths(property.pnoInsuranceExpiryDate, 2), // 2 mois avant
    secondReminderDate: subMonths(property.pnoInsuranceExpiryDate, 1), // 1 mois avant
    recurrenceRule: 'YEARLY',
  };
}
```

| Paramètre | Valeur |
|-----------|--------|
| **Condition** | `pnoInsuranceExpiryDate` renseigné |
| **Échéance** | Date d'expiration de l'assurance |
| **1er rappel** | 2 mois avant expiration |
| **2e rappel** | 1 mois avant expiration |
| **Priorité** | HIGH |
| **Récurrence** | YEARLY |
| **Référence légale** | Loi Alur 2014, Art. 9-1 Loi 65-557 |

---

### 9. BOILER_MAINTENANCE_CHECK — Entretien chaudière

```typescript
function calculateBoilerMaintenanceReminder(property: Property): ReminderData | null {
  // Condition : chauffage gaz ou fioul (pas électrique)
  if (!property.heatingType) return null;
  if (!['GAS_BOILER', 'OIL_BOILER', 'HEAT_PUMP'].includes(property.heatingType)) return null;

  const lastMaintenance = property.lastBoilerMaintenanceDate;
  // Si jamais fait : rappel immédiat. Sinon : 1 an après le dernier entretien
  const dueDate = lastMaintenance
    ? addYears(lastMaintenance, 1)
    : new Date();

  return {
    type: 'BOILER_MAINTENANCE_CHECK',
    priority: lastMaintenance ? 'MEDIUM' : 'HIGH',
    title: `Entretien chaudière — ${property.title}`,
    description: lastMaintenance
      ? `L'entretien annuel de la chaudière est à la charge du locataire, mais vous devez vous assurer qu'il est effectué. Demandez l'attestation.`
      : `Aucun entretien chaudière n'a été enregistré pour ce bien. L'entretien annuel est obligatoire. Demandez l'attestation au locataire.`,
    legalReference: 'Décret 2009-649 du 9 juin 2009',
    dueDate,
    reminderDate: lastMaintenance ? subMonths(dueDate, 2) : new Date(),
    secondReminderDate: lastMaintenance ? subMonths(dueDate, 1) : undefined,
    recurrenceRule: 'YEARLY',
  };
}
```

| Paramètre | Valeur |
|-----------|--------|
| **Condition** | `heatingType` ∈ {GAS_BOILER, OIL_BOILER, HEAT_PUMP} |
| **Échéance** | 1 an après dernier entretien (ou immédiat si jamais fait) |
| **1er rappel** | 2 mois avant échéance |
| **2e rappel** | 1 mois avant échéance |
| **Priorité** | MEDIUM (ou HIGH si jamais fait) |
| **Récurrence** | YEARLY |
| **Référence légale** | Décret 2009-649 du 9 juin 2009 |

---

### 10. ENERGY_BAN_DEADLINE — Interdiction location passoire énergétique

```typescript
function calculateEnergyBanReminder(property: Property): ReminderData | null {
  // Calendrier d'interdiction :
  // G : interdit depuis 1er janvier 2025
  // F : interdit à partir du 1er janvier 2028
  // E : interdit à partir du 1er janvier 2034
  const dpe = property.dpe; // 'A' | 'B' | ... | 'G'
  if (!dpe) return null;

  let banDate: Date | null = null;
  let isBanned = false;

  switch (dpe) {
    case 'G':
      banDate = new Date(2025, 0, 1);
      isBanned = true; // Déjà interdit
      break;
    case 'F':
      banDate = new Date(2028, 0, 1);
      break;
    case 'E':
      banDate = new Date(2034, 0, 1);
      break;
    default:
      return null; // A, B, C, D : pas concerné
  }

  if (isBanned) {
    return {
      type: 'ENERGY_BAN_DEADLINE',
      priority: 'CRITICAL',
      title: `INTERDIT DE LOUER — DPE ${dpe} — ${property.title}`,
      description: `Depuis le 1er janvier 2025, les logements classés G sont interdits à la location. Vous devez réaliser des travaux de rénovation énergétique avant de pouvoir relouer ce bien. Les baux en cours restent valides, mais aucun nouveau bail ne peut être signé.`,
      legalReference: 'Loi Climat et Résilience 2021, Art. 160',
      dueDate: banDate,
      reminderDate: new Date(), // Immédiat
    };
  }

  // Pas encore interdit mais ça arrive
  return {
    type: 'ENERGY_BAN_DEADLINE',
    priority: differenceInMonths(banDate, new Date()) <= 24 ? 'HIGH' : 'MEDIUM',
    title: `Interdiction de location DPE ${dpe} — ${property.title}`,
    description: `Les logements classés ${dpe} seront interdits à la location à partir du ${banDate.toLocaleDateString('fr-FR')}. Anticipez les travaux de rénovation énergétique.`,
    legalReference: 'Loi Climat et Résilience 2021, Art. 160',
    dueDate: banDate,
    reminderDate: subMonths(banDate, 24), // 2 ans avant
    secondReminderDate: subMonths(banDate, 12), // 1 an avant
  };
}
```

| Paramètre | Valeur |
|-----------|--------|
| **Condition** | DPE = G, F ou E |
| **Échéance** | G → 01/01/2025 (passé), F → 01/01/2028, E → 01/01/2034 |
| **1er rappel** | 2 ans avant échéance (ou immédiat si déjà interdit) |
| **2e rappel** | 1 an avant échéance |
| **Priorité** | CRITICAL si déjà interdit, HIGH si < 2 ans, MEDIUM sinon |
| **Récurrence** | Non (alerte permanente tant que DPE non amélioré) |
| **Référence légale** | Loi Climat et Résilience 2021, Art. 160 |
| **Distinct de `RENT_FREEZE_DPE_FG`** | Oui — le gel des loyers empêche la révision, l'interdiction empêche de signer un nouveau bail. Les deux peuvent coexister |

---

### 11. SMOKE_DETECTOR_CHECK — Détecteur de fumée

```typescript
function calculateSmokeDetectorReminder(property: Property): ReminderData | null {
  // Obligatoire depuis mars 2015 (loi Morange)
  // Durée de vie d'un DAAF : ~10 ans. Vérification annuelle recommandée
  if (!property.smokeDetectorInstalledAt && !property.smokeDetectorCheckedAt) {
    // Pas de détecteur enregistré
    return {
      type: 'SMOKE_DETECTOR_CHECK',
      priority: 'HIGH',
      title: `Détecteur de fumée manquant — ${property.title}`,
      description: `Un DAAF (détecteur avertisseur autonome de fumée) est obligatoire dans tout logement depuis mars 2015. L'installation incombe au propriétaire bailleur. Vérifiez que votre locataire en dispose.`,
      legalReference: 'Loi Morange 2010, Art. L129-8 CCH',
      dueDate: new Date(),
      reminderDate: new Date(),
    };
  }

  // Si installé, rappel annuel de vérification
  const lastCheck = property.smokeDetectorCheckedAt || property.smokeDetectorInstalledAt;
  const nextCheck = addYears(lastCheck!, 1);

  // Remplacement si > 10 ans
  const installDate = property.smokeDetectorInstalledAt;
  const needsReplacement = installDate && differenceInMonths(new Date(), installDate) >= 108; // 9 ans

  return {
    type: 'SMOKE_DETECTOR_CHECK',
    priority: needsReplacement ? 'HIGH' : 'LOW',
    title: needsReplacement
      ? `Remplacement DAAF à prévoir — ${property.title}`
      : `Vérification détecteur de fumée — ${property.title}`,
    description: needsReplacement
      ? `Le DAAF a été installé il y a plus de 9 ans. La durée de vie moyenne est de 10 ans. Prévoyez le remplacement.`
      : `Vérifiez le bon fonctionnement du détecteur de fumée (bouton test). L'entretien courant est à la charge du locataire.`,
    legalReference: 'Loi Morange 2010, Art. L129-8 CCH',
    dueDate: nextCheck,
    reminderDate: subMonths(nextCheck, 1),
    recurrenceRule: 'YEARLY',
  };
}
```

| Paramètre | Valeur |
|-----------|--------|
| **Condition** | Toujours (obligatoire dans tout logement) |
| **Échéance** | 1 an après dernière vérification (ou immédiat si jamais enregistré) |
| **1er rappel** | 1 mois avant échéance |
| **Priorité** | HIGH si pas installé ou > 9 ans, LOW sinon |
| **Récurrence** | YEARLY |
| **Référence légale** | Loi Morange 2010, Art. L129-8 CCH |

---

## AGENT 3 — INTÉGRATION

### Branchement dans `ReminderEngine.ts`

Dans `syncRemindersForProperty(propertyId)`, ajouter les appels aux nouveaux calculateurs :

```typescript
// Dans syncRemindersForProperty :
import {
  calculatePropertyTaxReminder,
  calculateTeomRecoveryReminder,
  calculateVacantPropertyTaxReminder,
  calculateSecondaryResidenceTaxReminder,
  calculateCfeReminder,
  calculatePnoInsuranceReminder,
  calculateBoilerMaintenanceReminder,
  calculateEnergyBanReminder,
  calculateSmokeDetectorReminder,
} from './reminders/TaxAndPropertyReminders';

// Ajouter dans le tableau de rappels à calculer :
const newReminders = [
  calculatePropertyTaxReminder(property, currentYear),
  calculateTeomRecoveryReminder(property, activeLease, currentYear),
  calculateVacantPropertyTaxReminder(property),
  calculateSecondaryResidenceTaxReminder(property, activeLease, currentYear),
  calculateCfeReminder(property, currentYear),
  calculatePnoInsuranceReminder(property),
  calculateBoilerMaintenanceReminder(property),
  calculateEnergyBanReminder(property),
  calculateSmokeDetectorReminder(property),
].filter(Boolean);
```

Dans `syncRemindersForUser(userId)`, ajouter :

```typescript
import { calculateOccupancyDeclarationReminder, calculateSocialContributionsReminder } from './reminders/TaxAndPropertyReminders';

// Rappels au niveau utilisateur (pas par bien) :
const userReminders = [
  calculateOccupancyDeclarationReminder(userId, currentYear),
  calculateSocialContributionsReminder(userId, currentYear, totalRevenueFoncier),
];
```

### Mise à jour automatique de `vacantSince`

Ajouter la logique suivante dans les événements de bail :

```typescript
// Quand un bail se termine (fin de bail, résiliation) :
await prisma.property.update({
  where: { id: propertyId },
  data: { vacantSince: new Date() },
});

// Quand un nouveau bail est signé :
await prisma.property.update({
  where: { id: propertyId },
  data: { vacantSince: null },
});
```

Points d'intégration :
- `app/api/webhooks/yousign/route.ts` → à la signature → `vacantSince = null`
- Fin de bail (action manuelle ou automatique) → `vacantSince = new Date()`

---

## TABLEAU RÉCAPITULATIF

| Type | Condition | Échéance | 1er rappel | 2e rappel | Priorité | Récurrence |
|------|-----------|----------|------------|-----------|----------|------------|
| `PROPERTY_TAX_DEADLINE` | Toujours | 15 oct. | 1er sept. | 1er oct. | HIGH | YEARLY |
| `TEOM_RECOVERY` | Bien loué + TEOM > 0 | 31 déc. | 1er nov. | — | MEDIUM | YEARLY |
| `VACANT_PROPERTY_TAX` | Zone tendue + vacant > 10 mois | 12 mois vacance | Immédiat | — | CRITICAL | Non |
| `SECONDARY_RESIDENCE_TAX` | Meublé + pas de locataire | Mi-déc. | 1er nov. | — | MEDIUM | YEARLY |
| `CFE_DEADLINE` | Meublé | 15 déc. | 15 nov. | 1er déc. | HIGH | YEARLY |
| `SOCIAL_CONTRIBUTIONS_INFO` | Rev. fonciers > 0 | Mi-mai N+1 | 1er avril | — | LOW | YEARLY |
| `OCCUPANCY_DECLARATION` | Toujours | 1er juil. | 1er mai | 1er juin | HIGH | YEARLY |
| `PNO_INSURANCE_RENEWAL` | Date expiration renseignée | Date expiration | −2 mois | −1 mois | HIGH | YEARLY |
| `BOILER_MAINTENANCE_CHECK` | Chauffage gaz/fioul/PAC | +1 an dernier entretien | −2 mois | −1 mois | MEDIUM | YEARLY |
| `ENERGY_BAN_DEADLINE` | DPE G, F ou E | Date interdiction | −2 ans | −1 an | CRITICAL/HIGH/MEDIUM | Non |
| `SMOKE_DETECTOR_CHECK` | Toujours | +1 an dernière vérif. | −1 mois | — | LOW/HIGH | YEARLY |

---

## VÉRIFICATIONS

### Agent 1
- [ ] 11 nouveaux types ajoutés à l'enum `LegalReminderType`
- [ ] Nouveaux champs Property ajoutés (tous optionnels)
- [ ] Pas de doublons avec les champs existants (`zoneTendue`, `isFurnished`, etc.)
- [ ] Migration non-destructive
- [ ] `npx prisma generate` → 0 erreurs

### Agent 2
- [ ] 11 calculateurs fonctionnels, retournent `null` si condition non remplie
- [ ] `VACANT_PROPERTY_TAX` en CRITICAL quand vacant > 10 mois
- [ ] `ENERGY_BAN_DEADLINE` distinct de `RENT_FREEZE_DPE_FG` (les deux peuvent coexister)
- [ ] `SOCIAL_CONTRIBUTIONS_INFO` calcule 17.2% du revenu foncier net
- [ ] `PROPERTY_TAX_DEADLINE` se génère pour chaque bien, pas une fois globalement
- [ ] Toutes les `legalReference` sont correctes (vérifier les articles de loi)
- [ ] Descriptions interpolées avec les montants réels quand disponibles

### Agent 3
- [ ] Nouveaux calculateurs branchés dans `syncRemindersForProperty` et `syncRemindersForUser`
- [ ] `vacantSince` mis à jour automatiquement à la fin/signature de bail
- [ ] Le cron existant traite les nouveaux types sans modification (même pipeline PENDING → UPCOMING → OVERDUE)
- [ ] Pas de rappels en double (upsert basé sur type + propertyId + année)
- [ ] `npm run build` → 0 erreurs
