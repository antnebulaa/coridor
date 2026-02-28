import { TaxSimulatorService } from '../TaxSimulatorService';
import { LOCATION_NUE, PRELEVEMENTS_SOCIAUX } from '@/lib/fiscalRules';
import type {
  TaxRegimeCalculator,
  TaxCalculationParams,
  TaxCalculationResult,
  ApplicabilityContext,
} from './types';

export const MicroFoncier: TaxRegimeCalculator = {
  id: 'micro_foncier',
  label: 'Micro-foncier',
  category: 'NUE',

  isApplicable(ctx: ApplicabilityContext) {
    if (ctx.isFurnished) {
      return { eligible: false, reason: 'Le micro-foncier ne s\'applique qu\'à la location nue.' };
    }
    if (ctx.loyerAnnuelBrut > LOCATION_NUE.MICRO_FONCIER.seuil) {
      return {
        eligible: false,
        reason: `Revenus fonciers bruts (${ctx.loyerAnnuelBrut.toLocaleString('fr-FR')} €) supérieurs au seuil micro-foncier de ${LOCATION_NUE.MICRO_FONCIER.seuil.toLocaleString('fr-FR')} €.`,
      };
    }
    return { eligible: true };
  },

  calculateAnnualTax(params: TaxCalculationParams): TaxCalculationResult {
    const { loyerAnnuelBrut, revenuGlobal, nombreParts } = params;

    const revenuImposable = Math.round(
      loyerAnnuelBrut * (1 - LOCATION_NUE.MICRO_FONCIER.abattement),
    );

    const irSans = TaxSimulatorService.calculerIR(revenuGlobal, nombreParts);
    const irAvec = TaxSimulatorService.calculerIR(
      revenuGlobal + revenuImposable,
      nombreParts,
    );
    const impotRevenu = irAvec - irSans;

    const prelevementsSociaux = Math.round(
      revenuImposable * PRELEVEMENTS_SOCIAUX.REVENUS_FONCIERS,
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
