/**
 * Types pour l'architecture modulaire des régimes fiscaux.
 *
 * Chaque régime implémente TaxRegimeCalculator.
 * Le registry (`index.ts`) expose les fonctions d'accès.
 */

// ---------------------------------------------------------------------------
// Enum régimes
// ---------------------------------------------------------------------------

export type TaxRegime =
  | 'micro_foncier'
  | 'reel'
  | 'micro_bic'
  | 'reel_lmnp'
  | 'lmp_reel'
  | 'sci_is'
  | 'pinel_6'
  | 'pinel_9'
  | 'pinel_12'
  | 'denormandie_6'
  | 'denormandie_9'
  | 'denormandie_12'
  | 'auto';

export type TaxRegimeCategory =
  | 'NUE'
  | 'MEUBLEE'
  | 'SOCIETE'
  | 'DEFISCALISATION';

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export interface TaxCalculationParams {
  loyerAnnuelBrut: number;
  interetsEmprunt: number;
  taxeFonciere: number;
  assurancePNO: number;
  fraisGestion: number;
  chargesCopropriete: number;
  travauxDeductibles: number;

  amortissementBien: number;
  amortissementMobilier: number;
  amortissementTravaux: number;

  revenuGlobal: number;
  nombreParts: number;

  purchasePrice: number;
  surface: number;
  zone?: string;

  // Location saisonnière (courte durée)
  loyerCourteDureeBrut?: number;
  isSeasonalClassified?: boolean;
}

export interface ApplicabilityContext {
  isFurnished: boolean;
  loyerAnnuelBrut: number;
  revenuGlobal: number;
  purchasePrice: number;
  surface: number;
  travauxDeductibles: number;
  zone?: string;

  // Location saisonnière (courte durée)
  loyerCourteDureeBrut?: number;
  isSeasonalClassified?: boolean;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface TaxCalculationResult {
  revenuImposable: number;
  impotRevenu: number;
  prelevementsSociaux: number;
  totalImposition: number;
  tauxEffectif: number;
  deficitFoncier?: number;
  deficitReportable?: number;
  reductionImpot?: number;
}

// ---------------------------------------------------------------------------
// Calculator interface
// ---------------------------------------------------------------------------

export interface TaxRegimeCalculator {
  id: TaxRegime;
  label: string;
  category: TaxRegimeCategory;
  isApplicable(ctx: ApplicabilityContext): {
    eligible: boolean;
    reason?: string;
  };
  calculateAnnualTax(params: TaxCalculationParams): TaxCalculationResult;
}
