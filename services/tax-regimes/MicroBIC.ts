import { TaxSimulatorService } from '../TaxSimulatorService';
import { LOCATION_MEUBLEE, PRELEVEMENTS_SOCIAUX } from '@/lib/fiscalRules';
import type {
  TaxRegimeCalculator,
  TaxCalculationParams,
  TaxCalculationResult,
  ApplicabilityContext,
} from './types';

export const MicroBIC: TaxRegimeCalculator = {
  id: 'micro_bic',
  label: 'Micro-BIC',
  category: 'MEUBLEE',

  isApplicable(ctx: ApplicabilityContext) {
    if (!ctx.isFurnished) {
      return { eligible: false, reason: 'Le micro-BIC ne s\'applique qu\'à la location meublée.' };
    }
    if (ctx.loyerAnnuelBrut > LOCATION_MEUBLEE.MICRO_BIC.longue_duree.seuil) {
      return {
        eligible: false,
        reason: `Recettes meublées (${ctx.loyerAnnuelBrut.toLocaleString('fr-FR')} €) supérieures au seuil micro-BIC de ${LOCATION_MEUBLEE.MICRO_BIC.longue_duree.seuil.toLocaleString('fr-FR')} €.`,
      };
    }
    return { eligible: true };
  },

  calculateAnnualTax(params: TaxCalculationParams): TaxCalculationResult {
    const { loyerAnnuelBrut, revenuGlobal, nombreParts } = params;

    const revenuImposable = Math.round(
      loyerAnnuelBrut * (1 - LOCATION_MEUBLEE.MICRO_BIC.longue_duree.abattement),
    );

    const irSans = TaxSimulatorService.calculerIR(revenuGlobal, nombreParts);
    const irAvec = TaxSimulatorService.calculerIR(
      revenuGlobal + revenuImposable,
      nombreParts,
    );
    const impotRevenu = irAvec - irSans;

    const prelevementsSociaux = Math.round(
      revenuImposable * PRELEVEMENTS_SOCIAUX.REVENUS_BIC_LMNP,
    );

    const totalImposition = impotRevenu + prelevementsSociaux;
    const tauxEffectif =
      loyerAnnuelBrut > 0
        ? Math.round((totalImposition / loyerAnnuelBrut) * 10000) / 10000
        : 0;

    return {
      revenuImposable,
      impotRevenu,
      prelevementsSociaux,
      totalImposition,
      tauxEffectif,
    };
  },
};
