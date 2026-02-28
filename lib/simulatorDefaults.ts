/**
 * Constantes par défaut du simulateur d'investissement locatif — France 2026
 *
 * Valeurs réalistes et documentées pour pré-remplir le formulaire.
 * Mises à jour annuellement.
 *
 * Dernière vérification : février 2026
 */

// ---------------------------------------------------------------------------
// Frais de notaire
// ---------------------------------------------------------------------------

/** Taux de frais de notaire dans l'ancien (~7-8 %) */
export const NOTARY_FEES_OLD = 0.08;

/** Taux de frais de notaire dans le neuf (~2-3 %) */
export const NOTARY_FEES_NEW = 0.03;

// ---------------------------------------------------------------------------
// Financement
// ---------------------------------------------------------------------------

/** Taux d'intérêt crédit immobilier moyen — février 2026, source Observatoire Crédit Logement */
export const DEFAULT_LOAN_RATE = 0.035;

/** Taux d'assurance emprunteur moyen (couverture standard) */
export const DEFAULT_INSURANCE_RATE = 0.0034;

/** Durée de prêt par défaut en années */
export const DEFAULT_LOAN_DURATION = 20;

/** Frais de dossier bancaire par défaut (€) */
export const DEFAULT_BANK_FEES = 0;

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

/** Taux de vacance locative par défaut (~1 mois sur 2 ans = 4.17 %) */
export const DEFAULT_VACANCY_RATE = 0.042;

/** Frais de gestion locative en autogestion */
export const MANAGEMENT_FEE_SELF = 0;

/** Frais de gestion locative via agence (~7-8 %) */
export const MANAGEMENT_FEE_AGENCY = 0.08;

// ---------------------------------------------------------------------------
// Fiscalité
// ---------------------------------------------------------------------------

/** TMI par défaut — la tranche à 30 % est la plus courante */
export const DEFAULT_MARGINAL_TAX_RATE = 0.30;

/** Tranches marginales d'imposition disponibles */
export const TMI_OPTIONS = [0, 0.11, 0.30, 0.41, 0.45] as const;

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

/** Horizon de simulation par défaut (années) */
export const DEFAULT_PROJECTION_YEARS = 20;

/** Revalorisation annuelle du loyer (~IRL) */
export const DEFAULT_ANNUAL_RENT_INCREASE = 0.02;

/** Valorisation annuelle du bien (conservateur) */
export const DEFAULT_ANNUAL_PROPERTY_VALUE_INCREASE = 0.01;

/** Augmentation annuelle des charges */
export const DEFAULT_ANNUAL_CHARGES_INCREASE = 0.02;

// ---------------------------------------------------------------------------
// Comparaison placements
// ---------------------------------------------------------------------------

/** Taux Livret A (plafonné 22 950 €, mais on simule sans plafond pour comparer) */
export const LIVRET_A_RATE = 0.03;

/** Taux assurance-vie fonds euros moyen */
export const ASSURANCE_VIE_RATE = 0.02;

/** Rendement historique moyen S&P 500 (dividendes réinvestis, nominal) */
export const BOURSE_SP500_RATE = 0.07;

// ---------------------------------------------------------------------------
// Plus-value immobilière — Abattements pour durée de détention
// ---------------------------------------------------------------------------

/**
 * Abattements IR sur la plus-value immobilière (taux IR : 19 %)
 * - Années 1 à 5 : 0 %
 * - Années 6 à 21 : 6 % par an
 * - Année 22 : 4 %
 * - À partir de 23 ans : exonération totale
 *
 * Source : CGI art. 150 VC
 */
export const CAPITAL_GAIN_IR_RATE = 0.19;

/**
 * Abattements PS sur la plus-value immobilière (taux PS : 17.2 %)
 * - Années 1 à 5 : 0 %
 * - Années 6 à 21 : 1.65 % par an
 * - Année 22 : 1.60 %
 * - Années 23 à 30 : 9 % par an
 * - À partir de 31 ans : exonération totale
 *
 * Source : CGI art. 150 VC
 */
export const CAPITAL_GAIN_PS_RATE = 0.172;

/**
 * Surtaxe sur les plus-values immobilières > 50 000 €
 * Barème progressif de 2 % à 6 %
 *
 * Source : CGI art. 1609 nonies G
 */
export const CAPITAL_GAIN_SURTAX_THRESHOLD = 50_000;
export const CAPITAL_GAIN_SURTAX_BRACKETS = [
  { min: 50_000, max: 60_000, rate: 0.02 },
  { min: 60_000, max: 100_000, rate: 0.02 },
  { min: 100_000, max: 110_000, rate: 0.03 },
  { min: 110_000, max: 150_000, rate: 0.03 },
  { min: 150_000, max: 160_000, rate: 0.04 },
  { min: 160_000, max: 200_000, rate: 0.04 },
  { min: 200_000, max: 210_000, rate: 0.05 },
  { min: 210_000, max: 250_000, rate: 0.05 },
  { min: 250_000, max: 260_000, rate: 0.06 },
  { min: 260_000, max: Infinity, rate: 0.06 },
] as const;

// ---------------------------------------------------------------------------
// Taux d'actualisation VAN
// ---------------------------------------------------------------------------

/** Taux d'actualisation pour le calcul de la VAN */
export const VAN_DISCOUNT_RATE = 0.03;

// ---------------------------------------------------------------------------
// V2 — Bien & Ameublement
// ---------------------------------------------------------------------------

/** Durée d'amortissement du mobilier en LMNP/LMP réel (années) */
export const DEFAULT_FURNITURE_AMORTIZATION_YEARS = 7;

// ---------------------------------------------------------------------------
// V2 — Locatif
// ---------------------------------------------------------------------------

/** Assurance PNO par défaut (€/an) */
export const DEFAULT_INSURANCE_PNO = 150;

/** Provision entretien/maintenance par défaut (€/an) */
export const DEFAULT_MAINTENANCE_V2 = 300;

/** Frais de dossier bancaire par défaut V2 (€) */
export const DEFAULT_BANK_FEES_V2 = 1000;

/** Taux GLI par défaut (3.5 % du loyer HC annuel) */
export const DEFAULT_GLI_RATE = 0.035;

/** Vacance locative par défaut (semaines/an) — 2 semaines ≈ 3.8 % */
export const DEFAULT_VACANCY_WEEKS = 2;

// ---------------------------------------------------------------------------
// V2 — Garantie bancaire
// ---------------------------------------------------------------------------

/** Coût de garantie en % du montant emprunté, par type */
export const GUARANTEE_RATES: Record<string, number> = {
  CREDIT_LOGEMENT: 0.012,
  HYPOTHEQUE: 0.015,
  PPD: 0.007,
  NONE: 0,
};

// ---------------------------------------------------------------------------
// V2 — Fiscalité foyer
// ---------------------------------------------------------------------------

/** Nombre de parts fiscales de base par situation familiale */
export const FAMILY_TAX_SHARES: Record<string, number> = {
  SINGLE: 1,
  MARRIED: 2,
  DIVORCED: 1,
  WIDOWED: 1,
};

// ---------------------------------------------------------------------------
// V2 — Régimes de défiscalisation
// ---------------------------------------------------------------------------

/**
 * Réductions Pinel (dispositif en extinction depuis fin 2024).
 * Taux Pinel recentré / Pinel+ (applicables aux opérations engagées avant 31/12/2024).
 *
 * Source : CGI art. 199 novovicies, LF 2024 art. 71
 */
export const PINEL_REDUCTIONS = {
  6: 0.09,
  9: 0.12,
  12: 0.14,
} as const;

/** Plafond d'investissement éligible Pinel */
export const PINEL_MAX_PRICE = 300_000;

/** Plafond au m² Pinel */
export const PINEL_MAX_PRICE_PER_SQM = 5_500;

/**
 * Plafonds de loyer Pinel par zone (€/m²/mois) — barème 2024
 *
 * Source : BOI-IR-RICI-360-20-20
 */
export const PINEL_ZONES = {
  A_BIS: 18.89,
  A: 14.03,
  B1: 11.31,
} as const;

// ---------------------------------------------------------------------------
// V2 — SCI IS
// ---------------------------------------------------------------------------

/**
 * Barème IS sociétés — taux réduit PME + taux normal.
 *
 * Source : CGI art. 219-I
 */
export const SCI_IS_RATES = {
  /** Taux réduit jusqu'à 42 500 € de bénéfice */
  REDUCED: 0.15,
  /** Plafond du taux réduit */
  REDUCED_CEILING: 42_500,
  /** Taux normal au-delà */
  NORMAL: 0.25,
} as const;

/**
 * Prélèvement Forfaitaire Unique (flat tax) sur les dividendes.
 * IR 12.8 % + PS 17.2 % = 30 %
 *
 * Source : CGI art. 200 A
 */
export const FLAT_TAX_RATE = 0.30;

// ---------------------------------------------------------------------------
// V2 — LMP
// ---------------------------------------------------------------------------

/**
 * Taux de cotisations sociales SSI pour le LMP.
 * Estimation simplifiée (~35-45 % selon le bénéfice).
 *
 * ⚠️ Le taux réel varie. Consultez un expert-comptable.
 *
 * Source : CSS art. L613-7
 */
export const LMP_SSI_RATE = 0.40;
