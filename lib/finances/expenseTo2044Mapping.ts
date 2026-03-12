/**
 * Mapping entre les catégories de dépenses Coridor (enum ExpenseCategory)
 * et les lignes de la déclaration 2044 (revenus fonciers).
 *
 * Source : formulaire 2044 de la DGFiP
 * https://www.impots.gouv.fr/formulaire/2044/declaration-des-revenus-fonciers
 */

export const EXPENSE_TO_2044: Record<
  string,
  { ligne: string; description2044: string; isDeductible: boolean }
> = {
  // ─── Ligne 221 : Frais d'administration et de gestion ───
  GENERAL_CHARGES: {
    ligne: '221',
    description2044: "Frais d'administration et de gestion",
    isDeductible: true,
  },
  BUILDING_CHARGES: {
    ligne: '221',
    description2044: "Frais d'administration et de gestion",
    isDeductible: true,
  },
  CARETAKER: {
    ligne: '221',
    description2044: "Frais d'administration et de gestion",
    isDeductible: true,
  },
  ELEVATOR: {
    ligne: '221',
    description2044: "Frais d'administration et de gestion",
    isDeductible: true,
  },

  // ─── Ligne 223 : Primes d'assurance ───
  INSURANCE: {
    ligne: '223',
    description2044: "Primes d'assurance",
    isDeductible: true,
  },
  INSURANCE_GLI: {
    ligne: '223',
    description2044: "Primes d'assurance",
    isDeductible: true,
  },

  // ─── Ligne 224 : Dépenses de réparation, d'entretien et d'amélioration ───
  MAINTENANCE: {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },
  COLD_WATER: {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },
  HOT_WATER: {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },
  ELECTRICITY_COMMON: {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },
  ELECTRICITY_PRIVATE: {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },
  HEATING_COLLECTIVE: {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },
  METERS: {
    ligne: '224',
    description2044: "Dépenses de réparation, d'entretien",
    isDeductible: true,
  },

  // ─── Ligne 227 : Taxes foncières ───
  TAX_PROPERTY: {
    ligne: '227',
    description2044: 'Taxes foncières',
    isDeductible: true,
  },

  // ─── Non déductibles ───
  PARKING: {
    ligne: '',
    description2044: 'Non déductible (parking)',
    isDeductible: false,
  },
  OTHER: {
    ligne: '',
    description2044: 'Autre (vérifier déductibilité)',
    isDeductible: false,
  },
};

const LIGNE_DESCRIPTIONS: Record<string, string> = {
  '221': "Frais d'administration et de gestion",
  '222': 'Autres frais de gestion (forfait 20 €/lot)',
  '223': "Primes d'assurance",
  '224': "Dépenses de réparation, d'entretien",
  '227': 'Taxes foncières',
  '250': "Intérêts d'emprunt",
};

/**
 * Agrège les dépenses par ligne 2044.
 *
 * @param expenses — dépenses avec catégorie et montant déductible
 * @param propertyCount — nombre de biens loués (pour le forfait 20€/lot ligne 222)
 * @param yearlyLoanInterest — intérêts d'emprunt de l'année (en euros, pas centimes)
 */
export function aggregateExpensesFor2044(
  expenses: { category: string; amountDeductibleCents: number | null }[],
  propertyCount: number = 0,
  yearlyLoanInterest: number = 0
): { ligne: string; description: string; montant: number }[] {
  const byLigne: Record<string, number> = {};

  for (const expense of expenses) {
    const mapping = EXPENSE_TO_2044[expense.category];
    if (!mapping || !mapping.isDeductible || !mapping.ligne) continue;

    const deductible = expense.amountDeductibleCents ?? 0;
    if (deductible <= 0) continue;

    byLigne[mapping.ligne] = (byLigne[mapping.ligne] || 0) + deductible;
  }

  // Forfait 20€/lot (ligne 222)
  if (propertyCount > 0) {
    byLigne['222'] = propertyCount * 20 * 100; // en centimes
  }

  // Intérêts d'emprunt (ligne 250) — déjà en euros, convertir en centimes
  if (yearlyLoanInterest > 0) {
    byLigne['250'] = Math.round(yearlyLoanInterest * 100);
  }

  return Object.entries(byLigne)
    .filter(([, montant]) => montant > 0)
    .map(([ligne, montant]) => ({
      ligne,
      description: LIGNE_DESCRIPTIONS[ligne] || ligne,
      montant: Math.round(montant / 100), // centimes → euros
    }))
    .sort((a, b) => parseInt(a.ligne) - parseInt(b.ligne));
}

/**
 * Calcule les intérêts d'emprunt de l'année pour un bien
 * via un tableau d'amortissement standard (annuités constantes).
 *
 * @returns intérêts en euros pour l'année demandée, ou 0 si données manquantes
 */
export function calculateYearlyLoanInterest(
  loanAmount: number | null | undefined,
  loanRate: number | null | undefined,
  loanStartDate: Date | string | null | undefined,
  loanEndDate: Date | string | null | undefined,
  forYear: number
): number {
  if (!loanAmount || !loanRate || !loanStartDate || !loanEndDate) return 0;

  const start = new Date(loanStartDate);
  const end = new Date(loanEndDate);
  const monthlyRate = loanRate / 100 / 12;
  const totalMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  if (totalMonths <= 0 || monthlyRate <= 0) return 0;

  // Mensualité constante
  const mensualite =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1);

  // Simuler l'amortissement pour trouver les intérêts de l'année
  let remaining = loanAmount;
  let yearInterest = 0;

  for (let m = 0; m < totalMonths && remaining > 0; m++) {
    const monthDate = new Date(start);
    monthDate.setMonth(monthDate.getMonth() + m);
    const currentYear = monthDate.getFullYear();

    const interest = remaining * monthlyRate;
    const principal = mensualite - interest;

    if (currentYear === forYear) {
      yearInterest += interest;
    } else if (currentYear > forYear) {
      break; // Past the target year
    }

    remaining -= principal;
  }

  return Math.round(yearInterest);
}

/**
 * Calcule le capital restant dû à la date actuelle.
 *
 * @returns capital restant en euros, ou null si données manquantes
 */
export function calculateRemainingDebt(
  loanAmount: number | null | undefined,
  loanRate: number | null | undefined,
  loanStartDate: Date | string | null | undefined,
  loanEndDate: Date | string | null | undefined
): number | null {
  if (!loanAmount || !loanRate || !loanStartDate || !loanEndDate) return null;

  const start = new Date(loanStartDate);
  const end = new Date(loanEndDate);
  const now = new Date();

  if (now >= end) return 0;
  if (now <= start) return loanAmount;

  const monthlyRate = loanRate / 100 / 12;
  const totalMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  const elapsedMonths =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());

  if (monthlyRate === 0) {
    // Prêt à taux zéro
    return Math.round(loanAmount * (1 - elapsedMonths / totalMonths));
  }

  // Formule du capital restant dû après n mensualités
  const remaining =
    loanAmount *
    (Math.pow(1 + monthlyRate, totalMonths) -
      Math.pow(1 + monthlyRate, elapsedMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1);

  return Math.max(0, Math.round(remaining));
}
