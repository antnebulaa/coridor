/**
 * Registry des régimes fiscaux — point d'entrée unique.
 *
 * Usage :
 *   getRegime('micro_foncier')           → calculateur unique
 *   getApplicableRegimes(ctx)            → régimes éligibles avec raison
 *   getAllRegimes()                       → tous les calculateurs
 */

import type {
  TaxRegime,
  TaxRegimeCalculator,
  ApplicabilityContext,
} from './types';

import { MicroFoncier } from './MicroFoncier';
import { ReelFoncier } from './ReelFoncier';
import { MicroBIC } from './MicroBIC';
import { LMNPReel } from './LMNPReel';
import { LMPReel } from './LMPReel';
import { SCIIS } from './SCIIS';
import { Pinel6, Pinel9, Pinel12 } from './Pinel';
import { Denormandie6, Denormandie9, Denormandie12 } from './Denormandie';

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const REGISTRY: Record<string, TaxRegimeCalculator> = {
  micro_foncier: MicroFoncier,
  reel: ReelFoncier,
  micro_bic: MicroBIC,
  reel_lmnp: LMNPReel,
  lmp_reel: LMPReel,
  sci_is: SCIIS,
  pinel_6: Pinel6,
  pinel_9: Pinel9,
  pinel_12: Pinel12,
  denormandie_6: Denormandie6,
  denormandie_9: Denormandie9,
  denormandie_12: Denormandie12,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Retourne le calculateur pour un régime donné. */
export function getRegime(id: TaxRegime): TaxRegimeCalculator | undefined {
  if (id === 'auto') return undefined;
  return REGISTRY[id];
}

/**
 * Retourne tous les régimes applicables au contexte donné,
 * avec la raison d'inéligibilité pour les régimes exclus.
 */
export function getApplicableRegimes(ctx: ApplicabilityContext): {
  regime: TaxRegimeCalculator;
  eligible: boolean;
  reason?: string;
}[] {
  return Object.values(REGISTRY).map((regime) => {
    const result = regime.isApplicable(ctx);
    return { regime, ...result };
  });
}

/** Retourne tous les calculateurs enregistrés. */
export function getAllRegimes(): TaxRegimeCalculator[] {
  return Object.values(REGISTRY);
}

// Re-export types
export type { TaxRegime, TaxRegimeCalculator, ApplicabilityContext } from './types';
export type {
  TaxCalculationParams,
  TaxCalculationResult,
  TaxRegimeCategory,
} from './types';
