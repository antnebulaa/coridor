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

    const shortTermIncome = ctx.loyerCourteDureeBrut ?? 0;
    const longTermIncome = ctx.loyerAnnuelBrut - shortTermIncome;

    // Seuil longue durée : 77 700€
    if (longTermIncome > LOCATION_MEUBLEE.MICRO_BIC.longue_duree.seuil) {
      return {
        eligible: false,
        reason: `Recettes longue durée (${longTermIncome.toLocaleString('fr-FR')} €) supérieures au seuil micro-BIC de ${LOCATION_MEUBLEE.MICRO_BIC.longue_duree.seuil.toLocaleString('fr-FR')} €.`,
      };
    }

    // Seuil courte durée (classé : 77 700€ / non classé : 15 000€)
    if (shortTermIncome > 0) {
      const shortTermRule = ctx.isSeasonalClassified
        ? LOCATION_MEUBLEE.MICRO_BIC.courte_duree_classe
        : LOCATION_MEUBLEE.MICRO_BIC.courte_duree_non_classe;
      if (shortTermIncome > shortTermRule.seuil) {
        return {
          eligible: false,
          reason: `Recettes courte durée (${shortTermIncome.toLocaleString('fr-FR')} €) supérieures au seuil micro-BIC ${ctx.isSeasonalClassified ? 'classé' : 'non classé'} de ${shortTermRule.seuil.toLocaleString('fr-FR')} €.`,
        };
      }
    }

    return { eligible: true };
  },

  calculateAnnualTax(params: TaxCalculationParams): TaxCalculationResult {
    const { loyerAnnuelBrut, revenuGlobal, nombreParts } = params;
    const shortTermIncome = params.loyerCourteDureeBrut ?? 0;
    const longTermIncome = loyerAnnuelBrut - shortTermIncome;

    // Abattement longue durée : 50%
    const taxableLongTerm = longTermIncome * (1 - LOCATION_MEUBLEE.MICRO_BIC.longue_duree.abattement);

    // Abattement courte durée : 50% (classé) ou 30% (non classé)
    const shortTermAbattement = params.isSeasonalClassified
      ? LOCATION_MEUBLEE.MICRO_BIC.courte_duree_classe.abattement
      : LOCATION_MEUBLEE.MICRO_BIC.courte_duree_non_classe.abattement;
    const taxableShortTerm = shortTermIncome * (1 - shortTermAbattement);

    const revenuImposable = Math.round(taxableLongTerm + taxableShortTerm);

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
