import {
  SCI_IS_RATES,
  FLAT_TAX_RATE,
} from '@/lib/simulatorDefaults';
import type {
  TaxRegimeCalculator,
  TaxCalculationParams,
  TaxCalculationResult,
  ApplicabilityContext,
} from './types';

/**
 * SCI à l'IS — Société Civile Immobilière soumise à l'Impôt sur les Sociétés.
 *
 * La SCI à l'IS est une personne morale : l'imposition se fait au niveau
 * de la société (IS), puis au niveau de l'associé à la distribution
 * des dividendes (flat tax 30 % ou barème progressif).
 *
 * Spécificités :
 *   - IS à taux réduit 15 % jusqu'à 42 500 € de bénéfice, puis 25 %
 *   - Amortissement du bien (~3 % / an sur 33 ans)
 *   - Dividendes soumis au PFU 30 % (ou option barème IR)
 *   - Plus-value des particuliers NON applicable → PV professionnelle
 *
 * Source : CGI art. 206 (IS), art. 200 A (PFU)
 */

const DEFAULT_BUILDING_AMORTIZATION_RATE = 0.03; // 3% / an (~33 ans)

export const SCIIS: TaxRegimeCalculator = {
  id: 'sci_is',
  label: 'SCI à l\'IS',
  category: 'SOCIETE',

  isApplicable(_ctx: ApplicabilityContext) {
    // La SCI IS est applicable quelle que soit la nature du bail
    // (nue ou meublée). On ne filtre pas sur isFurnished.
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
      purchasePrice,
    } = params;

    // 1. Charges déductibles
    const chargesDeductibles =
      taxeFonciere +
      assurancePNO +
      travauxDeductibles +
      fraisGestion +
      chargesCopropriete +
      interetsEmprunt;

    // 2. Amortissement du bien (terrain non amortissable — estimation 80% construction)
    const valeurConstruction = purchasePrice * 0.80;
    const amortissementBien = Math.round(
      valeurConstruction * DEFAULT_BUILDING_AMORTIZATION_RATE,
    );

    // 3. Résultat fiscal de la SCI
    const resultatFiscal = loyerAnnuelBrut - chargesDeductibles - amortissementBien;
    const benefice = Math.max(0, resultatFiscal);
    const deficitReportable = resultatFiscal < 0 ? Math.abs(resultatFiscal) : 0;

    // 4. IS (barème progressif sociétés)
    let impotSocietes: number;
    if (benefice <= SCI_IS_RATES.REDUCED_CEILING) {
      impotSocietes = Math.round(benefice * SCI_IS_RATES.REDUCED);
    } else {
      impotSocietes = Math.round(
        SCI_IS_RATES.REDUCED_CEILING * SCI_IS_RATES.REDUCED +
        (benefice - SCI_IS_RATES.REDUCED_CEILING) * SCI_IS_RATES.NORMAL,
      );
    }

    // 5. Dividende distribué (on suppose distribution totale du bénéfice net)
    const beneficeNetSociete = benefice - impotSocietes;
    const flatTaxDividendes = Math.round(beneficeNetSociete * FLAT_TAX_RATE);

    // 6. Totaux
    const totalImposition = impotSocietes + flatTaxDividendes;
    const tauxEffectif =
      loyerAnnuelBrut > 0
        ? Math.round((totalImposition / loyerAnnuelBrut) * 10000) / 10000
        : 0;

    return {
      revenuImposable: benefice,
      impotRevenu: impotSocietes,
      prelevementsSociaux: flatTaxDividendes,
      totalImposition,
      tauxEffectif,
      deficitReportable: deficitReportable > 0 ? deficitReportable : undefined,
    };
  },
};
