// lib/vetuste.ts
// ============================================================
// Grille de vétusté — Calculs d'abattement pour retenues sur dépôt
// ============================================================
//
// Sources : recommandations ALUR, guides ANIL, pratiques CDC courants.
// Il n'existe pas de grille officielle unique — ces valeurs sont
// des moyennes défendables issues de la jurisprudence et des accords collectifs.
// Le propriétaire peut personnaliser la grille par bien (VetusteGrid en BDD).

export interface VetusteGridItem {
  elementType: string;
  lifespan: number;          // Durée de vie en années
  annualDepreciation: number; // Taux annuel (ex: 0.10 = 10%)
  franchiseYears: number;    // Années sans abattement
}

export const DEFAULT_VETUSTE_GRID: VetusteGridItem[] = [
  { elementType: 'Peinture / Papier peint', lifespan: 10, annualDepreciation: 0.10, franchiseYears: 0 },
  { elementType: 'Moquette', lifespan: 7, annualDepreciation: 0.143, franchiseYears: 0 },
  { elementType: 'Parquet (massif)', lifespan: 25, annualDepreciation: 0.04, franchiseYears: 5 },
  { elementType: 'Parquet (stratifié / contrecollé)', lifespan: 12, annualDepreciation: 0.083, franchiseYears: 2 },
  { elementType: 'Carrelage / Faïence', lifespan: 20, annualDepreciation: 0.05, franchiseYears: 3 },
  { elementType: 'Lino / Vinyle', lifespan: 10, annualDepreciation: 0.10, franchiseYears: 0 },
  { elementType: 'Robinetterie', lifespan: 15, annualDepreciation: 0.067, franchiseYears: 2 },
  { elementType: 'Appareils sanitaires', lifespan: 20, annualDepreciation: 0.05, franchiseYears: 3 },
  { elementType: 'Volets / Stores', lifespan: 15, annualDepreciation: 0.067, franchiseYears: 2 },
  { elementType: 'Placards', lifespan: 20, annualDepreciation: 0.05, franchiseYears: 3 },
  { elementType: 'Prises / Interrupteurs', lifespan: 20, annualDepreciation: 0.05, franchiseYears: 3 },
  { elementType: 'Joints (silicone)', lifespan: 5, annualDepreciation: 0.20, franchiseYears: 0 },
];

/**
 * Calcule le pourcentage de vétusté applicable.
 *
 * Formule : vétusté = min((occupationYears - franchiseYears) × annualRate, maxVetuste)
 * Si occupationYears < franchiseYears → vétusté = 0%
 *
 * @returns Pourcentage de vétusté entre 0 et maxVetuste (défaut 0.80 = 80%)
 */
export function calculateVetuste(params: {
  annualRate: number;
  occupationYears: number;
  franchiseYears?: number;
  maxVetuste?: number;
}): number {
  const { annualRate, occupationYears, franchiseYears = 0, maxVetuste = 0.80 } = params;

  const effectiveYears = occupationYears - franchiseYears;
  if (effectiveYears <= 0) return 0;

  return Math.min(effectiveYears * annualRate, maxVetuste);
}

/**
 * Calcule la part du locataire après application de la vétusté.
 *
 * Part locataire = coût réparation × (1 - vétusté)
 */
export function calculateTenantShare(params: {
  repairCostCents: number;
  vetustePct: number;
}): number {
  const { repairCostCents, vetustePct } = params;
  return Math.round(repairCostCents * (1 - vetustePct));
}

/**
 * Trouve la meilleure correspondance dans la grille de vétusté
 * pour un type de nature/élément donné.
 *
 * Ex: "Parquet massif" → match "Parquet (massif)"
 *     "Carrelage" → match "Carrelage / Faïence"
 */
export function findVetusteMatch(
  natures: string[],
  grid: VetusteGridItem[] = DEFAULT_VETUSTE_GRID
): VetusteGridItem | null {
  for (const nature of natures) {
    const lower = nature.toLowerCase();
    const match = grid.find((item) => {
      const itemLower = item.elementType.toLowerCase();
      return itemLower.includes(lower) || lower.includes(itemLower.split(' ')[0]);
    });
    if (match) return match;
  }
  return null;
}

/**
 * Calcule la durée d'occupation en années à partir des dates de bail.
 */
export function calculateOccupationYears(
  leaseStartDate: Date,
  exitDate: Date = new Date()
): number {
  const diffMs = exitDate.getTime() - leaseStartDate.getTime();
  return diffMs / (365.25 * 24 * 60 * 60 * 1000);
}
