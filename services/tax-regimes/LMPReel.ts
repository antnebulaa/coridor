import { TaxSimulatorService } from '../TaxSimulatorService';
import { LMP } from '@/lib/fiscalRules';
import type {
  TaxRegimeCalculator,
  TaxCalculationParams,
  TaxCalculationResult,
  ApplicabilityContext,
} from './types';

/**
 * LMP Réel — Loueur en Meublé Professionnel au régime réel.
 *
 * Différences majeures avec le LMNP :
 *   - Cotisations sociales SSI (~35-45 %) au lieu de PS 17.2 %
 *   - Le déficit BIC s'impute sur le revenu global (pas limité aux BIC)
 *   - Plus-value professionnelle : exonération possible après 5 ans
 *     si recettes < 90 000 € (CGI art. 151 septies)
 *
 * Conditions cumulatives LMP (CGI art. 155 IV) :
 *   1. Recettes annuelles brutes TTC > 23 000 €
 *   2. Recettes > autres revenus d'activité du foyer fiscal
 *
 * ⚠️ Le taux SSI de 40 % est une estimation simplifiée.
 * Le taux réel varie entre 35 % et 45 % selon le bénéfice.
 * Consultez un expert-comptable pour un calcul précis.
 */
export const LMPReel: TaxRegimeCalculator = {
  id: 'lmp_reel',
  label: 'LMP Réel',
  category: 'MEUBLEE',

  isApplicable(ctx: ApplicabilityContext) {
    if (!ctx.isFurnished) {
      return { eligible: false, reason: 'Le LMP ne s\'applique qu\'à la location meublée.' };
    }
    // Condition 1 : recettes > 23 000 €
    if (ctx.loyerAnnuelBrut <= LMP.seuil_recettes) {
      return {
        eligible: false,
        reason: `Recettes meublées (${ctx.loyerAnnuelBrut.toLocaleString('fr-FR')} €) inférieures au seuil LMP de ${LMP.seuil_recettes.toLocaleString('fr-FR')} €.`,
      };
    }
    // Condition 2 : recettes > autres revenus d'activité du foyer
    if (ctx.revenuGlobal > 0 && ctx.loyerAnnuelBrut <= ctx.revenuGlobal) {
      return {
        eligible: false,
        reason: `Recettes meublées (${ctx.loyerAnnuelBrut.toLocaleString('fr-FR')} €) inférieures aux autres revenus du foyer (${ctx.revenuGlobal.toLocaleString('fr-FR')} €).`,
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
      amortissementBien,
      amortissementMobilier,
      amortissementTravaux,
      revenuGlobal,
      nombreParts,
    } = params;

    // Charges déductibles (identique au LMNP réel)
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
      // En LMP, le déficit s'impute sur le revenu global (différence clé vs LMNP)
      resultatFiscal = resultatAvantAmortissement;
      amortissementReportable = amortissementTotal;
    }

    // Cotisations sociales SSI sur le bénéfice (minimum applicable)
    const benefice = Math.max(0, resultatFiscal);
    const cotisationsSSI = Math.max(
      LMP.cotisations_minimum,
      Math.round(benefice * LMP.cotisations_sociales_taux),
    );

    // IR : en LMP, le déficit s'impute sur le revenu global
    let impotRevenu: number;
    if (resultatFiscal >= 0) {
      const irSans = TaxSimulatorService.calculerIR(revenuGlobal, nombreParts);
      const irAvec = TaxSimulatorService.calculerIR(
        revenuGlobal + benefice,
        nombreParts,
      );
      impotRevenu = irAvec - irSans;
    } else {
      // Déficit BIC LMP imputable sur le revenu global (sans plafond)
      const revenuGlobalReduit = Math.max(0, revenuGlobal + resultatFiscal);
      const irSans = TaxSimulatorService.calculerIR(revenuGlobal, nombreParts);
      const irAvec = TaxSimulatorService.calculerIR(revenuGlobalReduit, nombreParts);
      impotRevenu = irAvec - irSans; // négatif = économie d'impôt
    }

    const totalImposition = impotRevenu + cotisationsSSI;
    const tauxEffectif =
      loyerAnnuelBrut > 0
        ? Math.round((totalImposition / loyerAnnuelBrut) * 10000) / 10000
        : 0;

    return {
      revenuImposable: benefice,
      impotRevenu,
      prelevementsSociaux: cotisationsSSI,
      totalImposition,
      tauxEffectif,
      deficitReportable:
        amortissementReportable > 0 ? amortissementReportable : undefined,
    };
  },
};
