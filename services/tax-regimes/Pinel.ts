import { TaxSimulatorService } from '../TaxSimulatorService';
import { PRELEVEMENTS_SOCIAUX } from '@/lib/fiscalRules';
import type {
  TaxRegimeCalculator,
  TaxCalculationParams,
  TaxCalculationResult,
  ApplicabilityContext,
} from './types';

/**
 * Dispositif Pinel — Réduction d'impôt pour investissement locatif neuf.
 *
 * ⚠️ DISPOSITIF EN EXTINCTION DEPUIS FIN 2024.
 * Applicable uniquement aux baux existants ou aux opérations engagées
 * avant le 31/12/2024.
 *
 * Taux de réduction (Pinel recentré / Pinel+, depuis 2024) :
 *   - 6 ans  → 9 %
 *   - 9 ans  → 12 %
 *   - 12 ans → 14 %
 *
 * Plafond d'investissement : 300 000 € (CGI art. 199 novovicies)
 * Plafond au m² : 5 500 €/m²
 *
 * Le bien doit se situer en zone A bis, A ou B1.
 * Le loyer est plafonné selon la zone.
 *
 * Source : CGI art. 199 novovicies
 */

const PINEL_MAX_PRICE = 300_000;
const PINEL_MAX_PRICE_PER_SQM = 5_500;

const PINEL_REDUCTIONS: Record<string, { duration: number; rate: number }> = {
  pinel_6:  { duration: 6,  rate: 0.09 },
  pinel_9:  { duration: 9,  rate: 0.12 },
  pinel_12: { duration: 12, rate: 0.14 },
};

const PINEL_ZONES = ['A_BIS', 'A', 'B1'];

function createPinelCalculator(
  id: 'pinel_6' | 'pinel_9' | 'pinel_12',
): TaxRegimeCalculator {
  const { duration, rate } = PINEL_REDUCTIONS[id];

  return {
    id,
    label: `Pinel ${duration} ans`,
    category: 'DEFISCALISATION',

    isApplicable(ctx: ApplicabilityContext) {
      if (ctx.isFurnished) {
        return { eligible: false, reason: 'Le dispositif Pinel ne s\'applique qu\'à la location nue.' };
      }
      if (ctx.zone && !PINEL_ZONES.includes(ctx.zone)) {
        return {
          eligible: false,
          reason: `Le dispositif Pinel nécessite un bien en zone A bis, A ou B1 (zone actuelle : ${ctx.zone}).`,
        };
      }
      return { eligible: true };
    },

    calculateAnnualTax(params: TaxCalculationParams): TaxCalculationResult {
      const {
        loyerAnnuelBrut,
        interetsEmprunt,
        taxeFonciere,
        assurancePNO,
        fraisGestion,
        chargesCopropriete,
        travauxDeductibles,
        revenuGlobal,
        nombreParts,
        purchasePrice,
        surface,
      } = params;

      // Base éligible Pinel : plafonnée à 300 000 € et 5 500 €/m²
      const plafondSurface = surface > 0 ? surface * PINEL_MAX_PRICE_PER_SQM : Infinity;
      const baseEligible = Math.min(purchasePrice, PINEL_MAX_PRICE, plafondSurface);

      // Réduction d'impôt annuelle
      const reductionTotale = Math.round(baseEligible * rate);
      const reductionAnnuelle = Math.round(reductionTotale / duration);

      // Fiscalité courante : régime réel foncier classique (le Pinel ne change pas le revenu imposable)
      const chargesDeductibles =
        taxeFonciere +
        assurancePNO +
        travauxDeductibles +
        fraisGestion +
        chargesCopropriete +
        interetsEmprunt;

      const revenuFoncierNet = loyerAnnuelBrut - chargesDeductibles;
      const baseImposable = Math.max(0, revenuFoncierNet);

      const irSans = TaxSimulatorService.calculerIR(revenuGlobal, nombreParts);
      const irAvec = TaxSimulatorService.calculerIR(
        revenuGlobal + baseImposable,
        nombreParts,
      );
      const impotRevenuBrut = irAvec - irSans;

      // Appliquer la réduction Pinel (ne peut pas rendre l'IR négatif)
      const impotRevenu = Math.max(0, impotRevenuBrut - reductionAnnuelle);

      const prelevementsSociaux = Math.round(
        baseImposable * PRELEVEMENTS_SOCIAUX.REVENUS_FONCIERS,
      );

      const totalImposition = impotRevenu + prelevementsSociaux;
      const tauxEffectif =
        loyerAnnuelBrut > 0
          ? Math.round((totalImposition / loyerAnnuelBrut) * 10000) / 10000
          : 0;

      return {
        revenuImposable: baseImposable,
        impotRevenu,
        prelevementsSociaux,
        totalImposition,
        tauxEffectif,
        reductionImpot: reductionAnnuelle,
      };
    },
  };
}

export const Pinel6 = createPinelCalculator('pinel_6');
export const Pinel9 = createPinelCalculator('pinel_9');
export const Pinel12 = createPinelCalculator('pinel_12');
