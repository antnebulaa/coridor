/**
 * Calculateurs de rappels pour les taxes et obligations propriétaire.
 *
 * 11 types :
 * - PROPERTY_TAX_DEADLINE : Taxe foncière (TFPB)
 * - TEOM_RECOVERY : Récupération TEOM auprès du locataire
 * - VACANT_PROPERTY_TAX : Taxe sur les logements vacants (TLV)
 * - SECONDARY_RESIDENCE_TAX : Taxe d'habitation résidence secondaire
 * - CFE_DEADLINE : Cotisation Foncière des Entreprises (meublé)
 * - SOCIAL_CONTRIBUTIONS_INFO : Prélèvements sociaux CSG/CRDS (informatif)
 * - OCCUPANCY_DECLARATION : Déclaration d'occupation impots.gouv.fr
 * - PNO_INSURANCE_RENEWAL : Renouvellement assurance PNO
 * - BOILER_MAINTENANCE_CHECK : Vérification entretien chaudière/clim
 * - ENERGY_BAN_DEADLINE : Interdiction location passoire énergétique
 * - SMOKE_DETECTOR_CHECK : Vérification détecteur de fumée
 *
 * Chaque fonction est pure : elle prend les données nécessaires et retourne
 * un ReminderData ou null si la condition n'est pas remplie.
 */

import { addYears, subMonths, differenceInMonths } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReminderData {
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  legalReference?: string;
  actionUrl?: string;
  dueDate: Date;
  reminderDate: Date;
  secondReminderDate?: Date;
  recurrenceRule?: string;
  metadata?: Record<string, unknown>;
}

/** Subset of Property fields needed by the calculators. */
interface PropertyInput {
  id: string;
  title: string;
  isZoneTendue: boolean;
  vacantSince?: Date | null;
  propertyTaxAmountCents?: number | null;
  teomAmountCents?: number | null;
  pnoInsuranceExpiryDate?: Date | null;
  pnoInsuranceProvider?: string | null;
  heatingSystem?: string | null;
  lastBoilerMaintenanceDate?: Date | null;
  dpe?: string | null;
  smokeDetectorInstalledAt?: Date | null;
  smokeDetectorCheckedAt?: Date | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert centimes to euros string with French formatting. */
function centsToEuros(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ---------------------------------------------------------------------------
// 1. PROPERTY_TAX_DEADLINE — Taxe foncière
// ---------------------------------------------------------------------------

/**
 * Rappel annuel de taxe foncière (TFPB).
 * Tout propriétaire est redevable. Échéance : 15 octobre.
 */
export function calculatePropertyTaxReminder(
  property: PropertyInput,
  year: number,
): ReminderData {
  const dueDate = new Date(year, 9, 15); // 15 octobre

  const amountInfo = property.propertyTaxAmountCents
    ? `Montant estimé : ${centsToEuros(property.propertyTaxAmountCents)}. `
    : '';

  return {
    type: 'PROPERTY_TAX_DEADLINE',
    priority: 'HIGH',
    title: `Taxe foncière ${year} — ${property.title}`,
    description: `${amountInfo}Échéance le 15 octobre. Pensez à vérifier votre avis sur impots.gouv.fr.`,
    legalReference: 'Art. 1380 CGI',
    actionUrl: '/account/fiscal',
    dueDate,
    reminderDate: new Date(year, 8, 1),       // 1er septembre
    secondReminderDate: new Date(year, 9, 1), // 1er octobre
    recurrenceRule: 'YEARLY',
    metadata: { amountCents: property.propertyTaxAmountCents },
  };
}

// ---------------------------------------------------------------------------
// 2. TEOM_RECOVERY — Récupération TEOM auprès du locataire
// ---------------------------------------------------------------------------

/**
 * Rappel de récupération de la TEOM auprès du locataire.
 * Condition : bien loué (hasActiveLease) et teomAmountCents > 0.
 */
export function calculateTeomRecoveryReminder(
  property: PropertyInput,
  hasActiveLease: boolean,
  year: number,
): ReminderData | null {
  if (!hasActiveLease) return null;
  if (!property.teomAmountCents || property.teomAmountCents <= 0) return null;

  const dueDate = new Date(year, 11, 31); // 31 décembre

  return {
    type: 'TEOM_RECOVERY',
    priority: 'MEDIUM',
    title: `Récupérer la TEOM auprès du locataire — ${property.title}`,
    description: `La TEOM de ${centsToEuros(property.teomAmountCents)} figure sur votre avis de taxe foncière. Elle est récupérable auprès du locataire dans les charges. Pensez à la régulariser.`,
    legalReference: 'Décret 87-713, Art. 8',
    actionUrl: '/account/fiscal',
    dueDate,
    reminderDate: new Date(year, 10, 1), // 1er novembre
    recurrenceRule: 'YEARLY',
    metadata: { amountCents: property.teomAmountCents },
  };
}

// ---------------------------------------------------------------------------
// 3. VACANT_PROPERTY_TAX — Taxe logements vacants (TLV)
// ---------------------------------------------------------------------------

/**
 * Alerte TLV pour les biens vacants en zone tendue depuis plus de 10 mois.
 * Condition : isZoneTendue && vacantSince renseigné && vacant > 10 mois.
 */
export function calculateVacantPropertyTaxReminder(
  property: PropertyInput,
): ReminderData | null {
  if (!property.isZoneTendue) return null;
  if (!property.vacantSince) return null;

  const now = new Date();
  const monthsVacant = differenceInMonths(now, property.vacantSince);
  if (monthsVacant < 10) return null;

  const isFirstYear = monthsVacant < 24;
  const taxRate = isFirstYear ? '17 %' : '34 %';

  return {
    type: 'VACANT_PROPERTY_TAX',
    priority: 'CRITICAL',
    title: `Taxe logement vacant — ${property.title}`,
    description: `Votre bien est vacant depuis ${monthsVacant} mois en zone tendue. La TLV s'applique au taux de ${taxRate} de la valeur locative. Publiez une annonce pour éviter cette taxe.`,
    legalReference: 'Art. 232 CGI',
    actionUrl: '/properties',
    dueDate: addYears(property.vacantSince, 1),
    reminderDate: now,
    metadata: { monthsVacant, taxRate },
  };
}

// ---------------------------------------------------------------------------
// 4. SECONDARY_RESIDENCE_TAX — Taxe d'habitation résidence secondaire
// ---------------------------------------------------------------------------

/**
 * Rappel taxe d'habitation résidence secondaire.
 * Condition : bien meublé (isFurnished) et pas de locataire (hasActiveLease = false).
 */
export function calculateSecondaryResidenceTaxReminder(
  property: PropertyInput,
  isFurnished: boolean,
  hasActiveLease: boolean,
  year: number,
): ReminderData | null {
  if (!isFurnished) return null;
  if (hasActiveLease) return null;

  const dueDate = new Date(year, 11, 15); // 15 décembre

  return {
    type: 'SECONDARY_RESIDENCE_TAX',
    priority: 'MEDIUM',
    title: `Taxe d'habitation résidence secondaire — ${property.title}`,
    description: `Votre bien meublé n'est pas loué. Il est considéré comme résidence secondaire et la taxe d'habitation s'applique (non supprimée pour les résidences secondaires). Certaines communes appliquent une surtaxe.`,
    legalReference: 'Art. 1407 CGI',
    actionUrl: '/account/fiscal',
    dueDate,
    reminderDate: new Date(year, 10, 1), // 1er novembre
    recurrenceRule: 'YEARLY',
  };
}

// ---------------------------------------------------------------------------
// 5. CFE_DEADLINE — Cotisation Foncière des Entreprises (meublé)
// ---------------------------------------------------------------------------

/**
 * Rappel CFE pour les loueurs en meublé.
 * Condition : isFurnished === true (location meublée = BIC).
 */
export function calculateCfeReminder(
  property: PropertyInput,
  isFurnished: boolean,
  year: number,
): ReminderData | null {
  if (!isFurnished) return null;

  const dueDate = new Date(year, 11, 15); // 15 décembre

  return {
    type: 'CFE_DEADLINE',
    priority: 'HIGH',
    title: `CFE ${year} — ${property.title}`,
    description: `En tant que loueur en meublé, vous êtes redevable de la CFE. Vérifiez votre avis sur impots.gouv.fr (espace professionnel). Déductible de vos revenus BIC.`,
    legalReference: 'Art. 1447 CGI',
    actionUrl: '/account/fiscal',
    dueDate,
    reminderDate: new Date(year, 10, 15),      // 15 novembre
    secondReminderDate: new Date(year, 11, 1), // 1er décembre
    recurrenceRule: 'YEARLY',
  };
}

// ---------------------------------------------------------------------------
// 6. SOCIAL_CONTRIBUTIONS_INFO — Prélèvements sociaux CSG/CRDS
// ---------------------------------------------------------------------------

/**
 * Rappel informatif sur les prélèvements sociaux (17,2 %).
 * Condition : totalRevenueFoncierCents > 0.
 * Note : userId n'est pas utilisé dans le calcul mais passé pour cohérence
 * avec la signature attendue par le ReminderEngine (rappel au niveau user).
 */
export function calculateSocialContributionsReminder(
  _userId: string,
  year: number,
  totalRevenueFoncierCents: number,
): ReminderData | null {
  if (totalRevenueFoncierCents <= 0) return null;

  const estimatedCsgCents = Math.round(totalRevenueFoncierCents * 0.172);
  const dueDate = new Date(year + 1, 4, 15); // 15 mai N+1

  return {
    type: 'SOCIAL_CONTRIBUTIONS_INFO',
    priority: 'LOW',
    title: `Prélèvements sociaux ${year} — estimation`,
    description: `Sur vos revenus fonciers nets de ${centsToEuros(totalRevenueFoncierCents)}, les prélèvements sociaux (CSG/CRDS) sont estimés à ~${centsToEuros(estimatedCsgCents)} (17,2 %). Ce montant sera prélevé automatiquement après votre déclaration.`,
    legalReference: 'Art. L136-7 CSS',
    actionUrl: '/account/fiscal',
    dueDate,
    reminderDate: new Date(year + 1, 3, 1), // 1er avril N+1
    recurrenceRule: 'YEARLY',
    metadata: {
      revenueFoncierCents: totalRevenueFoncierCents,
      estimatedCsgCents,
    },
  };
}

// ---------------------------------------------------------------------------
// 7. OCCUPANCY_DECLARATION — Déclaration d'occupation
// ---------------------------------------------------------------------------

/**
 * Rappel de déclaration d'occupation (obligatoire depuis 2023).
 * S'applique à tous les propriétaires.
 * Note : userId n'est pas utilisé dans le calcul mais passé pour cohérence.
 */
export function calculateOccupancyDeclarationReminder(
  _userId: string,
  year: number,
): ReminderData {
  const dueDate = new Date(year, 6, 1); // 1er juillet

  return {
    type: 'OCCUPANCY_DECLARATION',
    priority: 'HIGH',
    title: `Déclaration d'occupation ${year}`,
    description: `Obligatoire depuis 2023 : déclarez l'occupation de chacun de vos biens sur impots.gouv.fr (rubrique "Gérer mes biens immobiliers"). Indiquez si le bien est loué, vacant ou occupé, et l'identité des occupants.`,
    legalReference: 'Art. 1418 CGI (loi de finances 2020)',
    actionUrl: '/properties',
    dueDate,
    reminderDate: new Date(year, 4, 1),        // 1er mai
    secondReminderDate: new Date(year, 5, 1),  // 1er juin
    recurrenceRule: 'YEARLY',
  };
}

// ---------------------------------------------------------------------------
// 8. PNO_INSURANCE_RENEWAL — Assurance PNO
// ---------------------------------------------------------------------------

/**
 * Rappel de renouvellement de l'assurance PNO.
 * Condition : pnoInsuranceExpiryDate renseigné.
 */
export function calculatePnoInsuranceReminder(
  property: PropertyInput,
): ReminderData | null {
  if (!property.pnoInsuranceExpiryDate) return null;

  const expiry = property.pnoInsuranceExpiryDate;

  const providerInfo = property.pnoInsuranceProvider
    ? ` (${property.pnoInsuranceProvider})`
    : '';

  return {
    type: 'PNO_INSURANCE_RENEWAL',
    priority: 'HIGH',
    title: `Renouvellement assurance PNO — ${property.title}`,
    description: `Votre assurance PNO${providerInfo} expire bientôt. En copropriété, cette assurance est obligatoire (loi Alur). Pensez à la renouveler ou à comparer les offres.`,
    legalReference: 'Loi Alur 2014, Art. 9-1 Loi 65-557',
    actionUrl: '/properties',
    dueDate: expiry,
    reminderDate: subMonths(expiry, 2),
    secondReminderDate: subMonths(expiry, 1),
    recurrenceRule: 'YEARLY',
  };
}

// ---------------------------------------------------------------------------
// 9. BOILER_MAINTENANCE_CHECK — Entretien chaudière
// ---------------------------------------------------------------------------

/**
 * Rappel d'entretien annuel de la chaudière.
 * Condition : heatingSystem contient 'gaz', 'fioul' ou 'pompe'.
 */
export function calculateBoilerMaintenanceReminder(
  property: PropertyInput,
): ReminderData | null {
  if (!property.heatingSystem) return null;

  const hs = property.heatingSystem.toLowerCase();
  const needsMaintenance =
    hs.includes('gaz') || hs.includes('fioul') || hs.includes('pompe');
  if (!needsMaintenance) return null;

  const lastMaintenance = property.lastBoilerMaintenanceDate;
  const now = new Date();

  const dueDate = lastMaintenance ? addYears(lastMaintenance, 1) : now;

  return {
    type: 'BOILER_MAINTENANCE_CHECK',
    priority: lastMaintenance ? 'MEDIUM' : 'HIGH',
    title: `Entretien chaudière — ${property.title}`,
    description: lastMaintenance
      ? `L'entretien annuel de la chaudière est à la charge du locataire, mais vous devez vous assurer qu'il est effectué. Demandez l'attestation.`
      : `Aucun entretien chaudière n'a été enregistré pour ce bien. L'entretien annuel est obligatoire. Demandez l'attestation au locataire.`,
    legalReference: 'Décret 2009-649 du 9 juin 2009',
    actionUrl: '/properties',
    dueDate,
    reminderDate: lastMaintenance ? subMonths(dueDate, 2) : now,
    secondReminderDate: lastMaintenance ? subMonths(dueDate, 1) : undefined,
    recurrenceRule: 'YEARLY',
  };
}

// ---------------------------------------------------------------------------
// 10. ENERGY_BAN_DEADLINE — Interdiction location passoire énergétique
// ---------------------------------------------------------------------------

/**
 * Alerte d'interdiction de location pour les passoires énergétiques.
 * Condition : DPE = G (interdit depuis 2025), F (2028), E (2034).
 * Distinct de RENT_FREEZE_DPE_FG (gel des loyers) : les deux peuvent coexister.
 */
export function calculateEnergyBanReminder(
  property: PropertyInput,
): ReminderData | null {
  const dpe = property.dpe?.toUpperCase();
  if (!dpe) return null;

  let banDate: Date | null = null;
  let isBanned = false;

  switch (dpe) {
    case 'G':
      banDate = new Date(2025, 0, 1);
      isBanned = true;
      break;
    case 'F':
      banDate = new Date(2028, 0, 1);
      break;
    case 'E':
      banDate = new Date(2034, 0, 1);
      break;
    default:
      return null;
  }

  const now = new Date();

  if (isBanned) {
    return {
      type: 'ENERGY_BAN_DEADLINE',
      priority: 'CRITICAL',
      title: `INTERDIT DE LOUER — DPE ${dpe} — ${property.title}`,
      description: `Depuis le 1er janvier 2025, les logements classés G sont interdits à la location. Vous devez réaliser des travaux de rénovation énergétique avant de pouvoir relouer ce bien. Les baux en cours restent valides, mais aucun nouveau bail ne peut être signé.`,
      legalReference: 'Loi Climat et Résilience 2021, Art. 160',
      actionUrl: '/properties',
      dueDate: banDate,
      reminderDate: now,
    };
  }

  const monthsUntilBan = differenceInMonths(banDate, now);

  return {
    type: 'ENERGY_BAN_DEADLINE',
    priority: monthsUntilBan <= 24 ? 'HIGH' : 'MEDIUM',
    title: `Interdiction de location DPE ${dpe} — ${property.title}`,
    description: `Les logements classés ${dpe} seront interdits à la location à partir du ${banDate.toLocaleDateString('fr-FR')}. Anticipez les travaux de rénovation énergétique.`,
    legalReference: 'Loi Climat et Résilience 2021, Art. 160',
    actionUrl: '/properties',
    dueDate: banDate,
    reminderDate: subMonths(banDate, 24),
    secondReminderDate: subMonths(banDate, 12),
  };
}

// ---------------------------------------------------------------------------
// 11. SMOKE_DETECTOR_CHECK — Détecteur de fumée (DAAF)
// ---------------------------------------------------------------------------

/**
 * Rappel de vérification ou d'installation du détecteur de fumée.
 * Obligatoire depuis mars 2015 (loi Morange). Durée de vie ~10 ans.
 */
export function calculateSmokeDetectorReminder(
  property: PropertyInput,
): ReminderData | null {
  const now = new Date();

  // Pas de détecteur enregistré : rappel immédiat
  if (!property.smokeDetectorInstalledAt && !property.smokeDetectorCheckedAt) {
    return {
      type: 'SMOKE_DETECTOR_CHECK',
      priority: 'HIGH',
      title: `Détecteur de fumée manquant — ${property.title}`,
      description: `Un DAAF (détecteur avertisseur autonome de fumée) est obligatoire dans tout logement depuis mars 2015. L'installation incombe au propriétaire bailleur. Vérifiez que votre locataire en dispose.`,
      legalReference: 'Loi Morange 2010, Art. L129-8 CCH',
      actionUrl: '/properties',
      dueDate: now,
      reminderDate: now,
    };
  }

  // Rappel annuel de vérification
  const lastCheck = property.smokeDetectorCheckedAt || property.smokeDetectorInstalledAt;
  const nextCheck = addYears(lastCheck!, 1);

  // Remplacement si installé depuis plus de 9 ans (durée de vie ~10 ans)
  const installDate = property.smokeDetectorInstalledAt;
  const needsReplacement =
    installDate != null && differenceInMonths(now, installDate) >= 108;

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
    actionUrl: '/properties',
    dueDate: nextCheck,
    reminderDate: subMonths(nextCheck, 1),
    recurrenceRule: 'YEARLY',
  };
}
