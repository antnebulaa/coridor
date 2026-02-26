/**
 * Rent Estimator Constants
 *
 * All adjustment factors are applied to the HC (hors charges) rent after
 * converting from ANIL's CC (charges comprises) data.
 *
 * Sources: ANIL methodology, market observation, ADIL guidelines
 */

// ── Charges Conversion (CC → HC) ──────────────────────────────────
// ANIL data is Charges Comprises. We subtract estimated charges to get HC.

export const CHARGES_PER_SQM = {
  apartment: 2.5, // €/m²/mois — copro, entretien, ascenseur, eau froide
  house: 1.0, // €/m²/mois — ordures ménagères, eau
} as const;

// ── Furnished Adjustment ──────────────────────────────────────────
// ANIL data is non-meublé. Meublé commands a premium.

export const FURNISHED_PREMIUM = 0.11; // +11% default

// ── DPE Adjustment ────────────────────────────────────────────────

export const DPE_ADJUSTMENT: Record<string, number> = {
  A: 0.05, // +5%
  B: 0.03, // +3%
  C: 0.01, // +1%
  D: 0.0, // Baseline (most common)
  E: -0.03, // -3%
  F: -0.08, // -8% (gel des loyers)
  G: -0.15, // -15% (interdit à la location from 2025)
};

// ── Floor Adjustment ──────────────────────────────────────────────

export const FLOOR_ADJUSTMENT = {
  ground: -0.03, // RDC: -3%
  highWithElevator: 0.03, // Étages 4+ avec ascenseur: +3%
  highNoElevator: -0.02, // Étages 4+ sans ascenseur: -2%
} as const;

// ── Parking Adjustment ────────────────────────────────────────────
// Fixed EUR/month, not percentage-based

export const PARKING_PREMIUM_EUR = 80; // €/mois

// ── Balcony/Terrace Adjustment ────────────────────────────────────

export const BALCONY_PREMIUM = 0.04; // +4%

// ── Construction Period Adjustment ────────────────────────────────

export const CONSTRUCTION_PERIOD_ADJUSTMENT: Record<string, number> = {
  'Avant 1949': -0.02,
  '1949 - 1974': -0.01,
  '1975 - 1989': 0.0,
  '1990 - 2005': 0.01,
  '2005+': 0.03,
};

// ── Terrace / Loggia Adjustment ──────────────────────────────────
// Terrace: outdoor space, usually > 5m². Higher premium than balcony.
// Loggia: covered outdoor space, between balcony and terrace in value.

export const TERRACE_PREMIUM = 0.06; // +6%
export const LOGGIA_PREMIUM = 0.05; // +5%

// ── Air Conditioning Adjustment ─────────────────────────────────

export const AIR_CONDITIONING_PREMIUM = 0.03; // +3%

// ── Equipped Kitchen Adjustment ─────────────────────────────────

export const EQUIPPED_KITCHEN_PREMIUM = 0.02; // +2%

// ── Cellar (Cave) Adjustment ────────────────────────────────────
// Storage space, especially valued in cities. Additive like parking.

export const CELLAR_PREMIUM_EUR = 20; // €/mois

// ── Garage Adjustment ───────────────────────────────────────────
// More valuable than open parking. Replaces parking premium if both.

export const GARAGE_PREMIUM_EUR = 120; // €/mois

// ── Garden Adjustment ───────────────────────────────────────────

export const GARDEN_PREMIUM = 0.05; // +5%

// ── Courtyard (Cour privative) Adjustment ───────────────────────

export const COURTYARD_PREMIUM = 0.03; // +3%

// ── Property SubType Adjustment ─────────────────────────────────

export const PROPERTY_SUBTYPE_ADJUSTMENT: Record<string, number> = {
  duplex: 0.05, // +5%
  triplex: 0.06, // +6%
  loft: 0.08, // +8%
  penthouse: 0.10, // +10%
  mansarde: -0.02, // -2%
};

// ── Confidence Thresholds ─────────────────────────────────────────

export const CONFIDENCE = {
  HIGH: { minObservations: 100, minRSquared: 0.7 },
  MEDIUM: { minObservations: 30, minRSquared: 0.0 },
} as const;

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

// ── ANIL Attribution ──────────────────────────────────────────────

export const ANIL_ATTRIBUTION =
  'Estimations ANIL, à partir des données du Groupe SeLoger et Leboncoin';
