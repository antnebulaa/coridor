import { TaxSimulatorService } from '../TaxSimulatorService';
import { PRELEVEMENTS_SOCIAUX } from '@/lib/fiscalRules';
import type {
  TaxRegimeCalculator,
  TaxCalculationParams,
  TaxCalculationResult,
  ApplicabilityContext,
} from './types';

/**
 * Dispositif Denormandie — Réduction d'impôt pour investissement locatif ancien
 * avec travaux de rénovation.
 *
 * Toujours actif pour les nouveaux achats (prorogé jusqu'au 31/12/2027).
 *
 * Mêmes taux de réduction que le Pinel recentré :
 *   - 6 ans  → 9 %
 *   - 9 ans  → 12 %
 *   - 12 ans → 14 %
 *
 * Condition : travaux ≥ 25 % du coût total de l'opération (achat + travaux).
 * Les travaux doivent améliorer la performance énergétique d'au moins 20 %
 * (ou 30 % pour les logements individuels), ou porter sur au moins 2
 * des 5 types de travaux éligibles.
 *
 * Plafond d'investissement : 300 000 € (identique Pinel)
 * Pas de restriction de zone géographique (contrairement au Pinel).
 *
 * Source : CGI art. 199 novovicies, VII bis — Loi de finances 2019, art. 226
 */

const DENORMANDIE_MAX_PRICE = 300_000;
const DENORMANDIE_MIN_TRAVAUX_RATIO = 0.25; // 25% du coût total

const DENORMANDIE_REDUCTIONS: Record<string, { duration: number; rate: number }> = {
  denormandie_6:  { duration: 6,  rate: 0.09 },
  denormandie_9:  { duration: 9,  rate: 0.12 },
  denormandie_12: { duration: 12, rate: 0.14 },
};

function createDenormandieCalculator(
  id: 'denormandie_6' | 'denormandie_9' | 'denormandie_12',
): TaxRegimeCalculator {
  const { duration, rate } = DENORMANDIE_REDUCTIONS[id];

  return {
    id,
    label: `Denormandie ${duration} ans`,
    category: 'DEFISCALISATION',

    isApplicable(ctx: ApplicabilityContext) {
      if (ctx.isFurnished) {
        return { eligible: false, reason: 'Le dispositif Denormandie ne s\'applique qu\'à la location nue.' };
      }
      // Vérifier la condition des 25% de travaux
      const coutTotal = ctx.purchasePrice + ctx.travauxDeductibles;
      if (coutTotal > 0 && ctx.travauxDeductibles / coutTotal < DENORMANDIE_MIN_TRAVAUX_RATIO) {
        return {
          eligible: false,
          reason: `Les travaux (${ctx.travauxDeductibles.toLocaleString('fr-FR')} €) doivent représenter au moins 25 % du coût total de l'opération (${coutTotal.toLocaleString('fr-FR')} €).`,
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
      } = params;

      // Base éligible : prix d'achat + travaux, plafonné à 300 000 €
      const coutTotal = purchasePrice + travauxDeductibles;
      const baseEligible = Math.min(coutTotal, DENORMANDIE_MAX_PRICE);

      // Réduction d'impôt annuelle
      const reductionTotale = Math.round(baseEligible * rate);
      const reductionAnnuelle = Math.round(reductionTotale / duration);

      // Fiscalité courante : régime réel foncier
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

      // Appliquer la réduction Denormandie
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

export const Denormandie6 = createDenormandieCalculator('denormandie_6');
export const Denormandie9 = createDenormandieCalculator('denormandie_9');
export const Denormandie12 = createDenormandieCalculator('denormandie_12');
