import { TaxSimulatorService } from '../TaxSimulatorService';
import { PRELEVEMENTS_SOCIAUX, DEFICIT_FONCIER } from '@/lib/fiscalRules';
import type {
  TaxRegimeCalculator,
  TaxCalculationParams,
  TaxCalculationResult,
  ApplicabilityContext,
} from './types';

export const ReelFoncier: TaxRegimeCalculator = {
  id: 'reel',
  label: 'Réel 2044',
  category: 'NUE',

  isApplicable(ctx: ApplicabilityContext) {
    if (ctx.isFurnished) {
      return { eligible: false, reason: 'Le réel foncier ne s\'applique qu\'à la location nue.' };
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
    } = params;

    const chargesDeductibles =
      taxeFonciere +
      assurancePNO +
      travauxDeductibles +
      fraisGestion +
      chargesCopropriete +
      interetsEmprunt;

    const revenuFoncierNet = loyerAnnuelBrut - chargesDeductibles;

    if (revenuFoncierNet >= 0) {
      const irSans = TaxSimulatorService.calculerIR(revenuGlobal, nombreParts);
      const irAvec = TaxSimulatorService.calculerIR(
        revenuGlobal + revenuFoncierNet,
        nombreParts,
      );
      const impotRevenu = irAvec - irSans;
      const prelevementsSociaux = Math.round(
        revenuFoncierNet * PRELEVEMENTS_SOCIAUX.REVENUS_FONCIERS,
      );
      const totalImposition = impotRevenu + prelevementsSociaux;
      const tauxEffectif =
        loyerAnnuelBrut > 0
          ? Math.round((totalImposition / loyerAnnuelBrut) * 10000) / 10000
          : 0;

      return {
        revenuImposable: revenuFoncierNet,
        impotRevenu,
        prelevementsSociaux,
        totalImposition,
        tauxEffectif,
      };
    }

    // Déficit foncier
    const deficitTotal = Math.abs(revenuFoncierNet);
    const chargesHorsInterets = chargesDeductibles - interetsEmprunt;
    const deficitHorsInterets = Math.max(
      0,
      Math.min(deficitTotal, chargesHorsInterets - loyerAnnuelBrut),
    );
    const imputationRevenuGlobal = Math.min(
      deficitHorsInterets,
      DEFICIT_FONCIER.plafond_revenu_global,
    );
    const deficitReportable = deficitTotal - imputationRevenuGlobal;
    const revenuGlobalReduit = Math.max(0, revenuGlobal - imputationRevenuGlobal);

    const irSans = TaxSimulatorService.calculerIR(revenuGlobal, nombreParts);
    const irAvec = TaxSimulatorService.calculerIR(revenuGlobalReduit, nombreParts);
    const impotRevenu = irAvec - irSans;

    const totalImposition = impotRevenu;
    const tauxEffectif =
      loyerAnnuelBrut > 0
        ? Math.round((totalImposition / loyerAnnuelBrut) * 10000) / 10000
        : 0;

    return {
      revenuImposable: 0,
      impotRevenu,
      prelevementsSociaux: 0,
      totalImposition,
      tauxEffectif,
      deficitFoncier: imputationRevenuGlobal,
      deficitReportable: deficitReportable > 0 ? deficitReportable : undefined,
    };
  },
};
