import { TaxSimulatorService } from '../TaxSimulatorService';
import { PRELEVEMENTS_SOCIAUX } from '@/lib/fiscalRules';
import type {
  TaxRegimeCalculator,
  TaxCalculationParams,
  TaxCalculationResult,
  ApplicabilityContext,
} from './types';

export const LMNPReel: TaxRegimeCalculator = {
  id: 'reel_lmnp',
  label: 'Réel LMNP',
  category: 'MEUBLEE',

  isApplicable(ctx: ApplicabilityContext) {
    if (!ctx.isFurnished) {
      return { eligible: false, reason: 'Le réel LMNP ne s\'applique qu\'à la location meublée.' };
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
      amortissementBien,
      amortissementMobilier,
      amortissementTravaux,
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

    const amortissementTotal =
      amortissementBien + amortissementMobilier + amortissementTravaux;

    const resultatAvantAmortissement = loyerAnnuelBrut - chargesDeductibles;

    let resultatFiscal: number;
    let amortissementReportable = 0;

    if (resultatAvantAmortissement > 0) {
      const amortissementImpute = Math.min(
        amortissementTotal,
        resultatAvantAmortissement,
      );
      amortissementReportable = amortissementTotal - amortissementImpute;
      resultatFiscal = resultatAvantAmortissement - amortissementImpute;
    } else {
      resultatFiscal = resultatAvantAmortissement;
      amortissementReportable = amortissementTotal;
    }

    const baseImposable = Math.max(0, resultatFiscal);

    const irSans = TaxSimulatorService.calculerIR(revenuGlobal, nombreParts);
    const irAvec = TaxSimulatorService.calculerIR(
      revenuGlobal + baseImposable,
      nombreParts,
    );
    const impotRevenu = irAvec - irSans;

    const prelevementsSociaux = Math.round(
      baseImposable * PRELEVEMENTS_SOCIAUX.REVENUS_BIC_LMNP,
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
      deficitReportable:
        amortissementReportable > 0 ? amortissementReportable : undefined,
    };
  },
};
