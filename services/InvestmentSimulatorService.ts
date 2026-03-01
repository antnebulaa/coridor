/**
 * InvestmentSimulatorService — Moteur de simulation d'investissement locatif
 *
 * Calcule tous les KPIs d'un investissement locatif :
 * rendements, cash-flow, TRI, VAN, comparaison régimes fiscaux,
 * plus-value, comparaison placements, projection année par année.
 *
 * Réutilise les régimes modulaires `services/tax-regimes/` pour les calculs fiscaux.
 * Réutilise lib/fiscalRules.ts et lib/simulatorDefaults.ts pour les constantes.
 */

import {
  getApplicableRegimes,
  getRegime,
} from "./tax-regimes";
import type { TaxCalculationParams, ApplicabilityContext } from "./tax-regimes";
import { TaxSimulatorService } from "./TaxSimulatorService";
import {
  LIVRET_A_RATE,
  ASSURANCE_VIE_RATE,
  BOURSE_SP500_RATE,
  CAPITAL_GAIN_IR_RATE,
  CAPITAL_GAIN_PS_RATE,
  CAPITAL_GAIN_SURTAX_THRESHOLD,
  CAPITAL_GAIN_SURTAX_BRACKETS,
  VAN_DISCOUNT_RATE,
  DEFAULT_FURNITURE_AMORTIZATION_YEARS,
  DEFAULT_GLI_RATE,
  FAMILY_TAX_SHARES,
} from "@/lib/simulatorDefaults";

// ---------------------------------------------------------------------------
// Types Input
// ---------------------------------------------------------------------------

export interface InvestmentInput {
  // === Achat (V1) ===
  purchasePrice: number;
  notaryFeesRate: number;
  renovationCost: number;
  furnitureCost: number;

  // === Financement (V1) ===
  personalContribution: number;
  loanRate: number;
  loanDurationYears: number;
  loanInsuranceRate: number;
  bankFees: number;

  // === Location (V1) ===
  monthlyRent: number;
  monthlyCharges: number;
  propertyTaxYearly: number;
  insuranceYearly: number;
  managementFeesRate: number;
  vacancyRate: number;
  maintenanceYearly: number;
  coprYearly: number;

  // === Fiscalité (V1) ===
  taxRegime: string;
  marginalTaxRate: number;
  isFurnished: boolean;

  // === Projection (V1) ===
  projectionYears: number;
  annualRentIncrease: number;
  annualPropertyValueIncrease: number;
  annualChargesIncrease: number;

  // === V2 — Bien ===
  propertyType?: 'APARTMENT' | 'HOUSE';
  surface?: number;
  address?: string;
  communeCode?: string;
  renovationType?: 'ENERGY' | 'FITOUT' | 'STRUCTURAL';
  furnitureAmortizationYears?: number;

  // === V2 — Financement ===
  downPayment?: number;
  guaranteeType?: 'CREDIT_LOGEMENT' | 'HYPOTHEQUE' | 'PPD' | 'NONE';
  guaranteeCost?: number;

  // === V2 — Locatif ===
  monthlyRentHC?: number;
  monthlyChargesProvision?: number;
  annualPropertyTax?: number;
  annualInsurancePNO?: number;
  annualCoproNonRecoverable?: number;
  managementFeeRate?: number;
  annualMaintenance?: number;
  annualOtherCharges?: number;
  hasGLI?: boolean;
  gliRate?: number;
  vacancyWeeksPerYear?: number;

  // === V2 — Fiscalité ===
  familyStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  annualIncomeDeclarant1?: number;
  annualIncomeDeclarant2?: number;
  taxShares?: number;
  childrenCount?: number;

  // === V2 — Projection ===
  resaleYear?: number;
  resalePrice?: number;

  // === V2 — Acquisition mode ===
  isDonation?: boolean; // true = donation/héritage: bien reçu gratuitement, seuls travaux/mobilier sont un coût
}

// ---------------------------------------------------------------------------
// Normalized Input (internal, resolved V1/V2 fields)
// ---------------------------------------------------------------------------

interface NormalizedInput {
  purchasePrice: number;
  notaryFees: number;
  renovationCost: number;
  furnitureCost: number;
  furnitureAmortizationYears: number;
  renovationType: string;
  isFurnished: boolean;
  propertyType: string;
  surface: number;

  downPayment: number;
  loanRate: number;
  loanDurationYears: number;
  loanInsuranceRate: number;
  guaranteeType: string;
  guaranteeCost: number;
  bankFees: number;

  monthlyRentHC: number;
  monthlyChargesProvision: number;
  annualPropertyTax: number;
  annualInsurancePNO: number;
  annualCoproNonRecoverable: number;
  managementFeeRate: number;
  annualMaintenance: number;
  annualOtherCharges: number;
  hasGLI: boolean;
  gliRate: number;
  vacancyWeeksPerYear: number;

  taxRegime: string;
  marginalTaxRate: number;
  familyStatus: string;
  annualIncome: number;
  taxShares: number;

  projectionYears: number;
  annualRentIncrease: number;
  annualPropertyValueIncrease: number;
  annualChargesIncrease: number;

  // Computed
  totalInvestment: number;
  loanAmount: number;
  vacancyRate: number;
  effectiveAnnualRent: number;
  annualGLI: number;
  totalAnnualCharges: number;
  annualGrossRent: number;
}

// ---------------------------------------------------------------------------
// Types Output
// ---------------------------------------------------------------------------

export type Verdict = 'PROFITABLE' | 'CORRECT' | 'LOW_RETURN' | 'TAX_OPTIMIZED';

export interface InvestmentResult {
  grossYield: number;
  netYield: number;
  netNetYield: number;
  monthlyCashflow: number;
  totalInvestment: number;
  loanAmount: number;
  monthlyLoanPayment: number;

  tri: number;
  van: number;
  breakevenMonth: number | null;

  yearlyTax: number;
  taxRegimeComparison: TaxRegimeComparison[];
  recommendedRegime: string;

  estimatedResalePrice: number;
  capitalGain: number;
  capitalGainTax: number;
  netCapitalGain: number;

  vsLivretA: PlacementComparison;
  vsAssuranceVie: PlacementComparison;
  vsBourseSP500: PlacementComparison;

  yearlyProjection: YearlyProjection[];
  loanAmortization: LoanAmortizationRow[];

  // V2.1 — fiscal impact & verdict
  taxWithoutInvestment: number;
  taxWithInvestment: number;
  taxDifference: number;
  verdict: Verdict;
  verdictMessage: string;
  breakEvenYear: number | null;
}

export interface MonthlyRevenueBreakdown {
  rentHC: number;
  vacancyDeduction: number;
  netRent: number;
}

export interface MonthlyExpenseBreakdown {
  loanPayment: number;
  loanInsurance: number;
  propertyTax: number;
  insurancePNO: number;
  coproCharges: number;
  gli: number;
  management: number;
  maintenance: number;
  otherCharges: number;
  monthlyTax: number;
}

export interface YearlyProjection {
  year: number;
  grossRent: number;
  netRent: number;
  loanPayment: number;
  tax: number;
  cashflow: number;
  cumulativeCashflow: number;
  propertyValue: number;
  remainingLoan: number;
  netWealth: number;
  // V2.1 — breakdowns
  monthlyRevenueBreakdown: MonthlyRevenueBreakdown;
  monthlyExpenseBreakdown: MonthlyExpenseBreakdown;
  savingsEffort: number;
  taxWithout: number;
  taxWith: number;
  totalGain: number;
}

export interface LoanAmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  insurance: number;
  remainingBalance: number;
}

export interface PlacementComparison {
  name: string;
  annualRate: number;
  totalInvested: number;
  finalValue: number;
  totalGain: number;
}

export interface TaxRegimeComparison {
  regime: string;
  label: string;
  yearlyTax: number;
  netCashflow: number;
  isRecommended: boolean;
  eligible: boolean;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class InvestmentSimulatorService {
  // -------------------------------------------------------------------------
  // Normalize — bridge V1 ↔ V2 fields
  // -------------------------------------------------------------------------

  /**
   * Résout les champs V1/V2 en une structure normalisée.
   * Si un champ V2 est présent, il est utilisé ; sinon on dérive depuis le V1.
   */
  private static normalizeInput(input: InvestmentInput): NormalizedInput {
    // Locatif
    const monthlyRentHC = input.monthlyRentHC ?? input.monthlyRent;
    const monthlyChargesProvision = input.monthlyChargesProvision ?? 0;
    const annualPropertyTax = input.annualPropertyTax ?? input.propertyTaxYearly;
    const annualInsurancePNO = input.annualInsurancePNO ?? input.insuranceYearly;
    const annualCoproNonRecoverable =
      input.annualCoproNonRecoverable ?? input.coprYearly;
    const managementFeeRate = input.managementFeeRate ?? input.managementFeesRate;
    const annualMaintenance = input.annualMaintenance ?? input.maintenanceYearly;
    const annualOtherCharges = input.annualOtherCharges ?? 0;
    const hasGLI = input.hasGLI ?? false;
    const gliRate = input.gliRate ?? DEFAULT_GLI_RATE;
    const vacancyWeeksPerYear =
      input.vacancyWeeksPerYear ?? Math.round(input.vacancyRate * 52);

    // Financement
    const downPayment = input.downPayment ?? input.personalContribution;
    const guaranteeType = input.guaranteeType ?? "NONE";
    const guaranteeCost =
      input.guaranteeCost ??
      (guaranteeType !== "NONE"
        ? 0 // Will be computed after loanAmount if not provided
        : 0);

    // Bien
    const furnitureAmortizationYears =
      input.furnitureAmortizationYears ?? DEFAULT_FURNITURE_AMORTIZATION_YEARS;
    const renovationType = input.renovationType ?? "FITOUT";
    const propertyType = input.propertyType ?? "APARTMENT";
    const surface = input.surface ?? 0;

    // Fiscalité foyer
    const familyStatus = input.familyStatus ?? "SINGLE";
    const baseTaxShares = FAMILY_TAX_SHARES[familyStatus] ?? 1;
    const childrenParts = Math.min((input.childrenCount ?? 0), 2) * 0.5
      + Math.max(0, (input.childrenCount ?? 0) - 2) * 1;
    const taxShares = input.taxShares ?? baseTaxShares + childrenParts;

    const annualIncome =
      input.annualIncomeDeclarant1 != null || input.annualIncomeDeclarant2 != null
        ? (input.annualIncomeDeclarant1 ?? 0) + (input.annualIncomeDeclarant2 ?? 0)
        : this.estimateRevenuFromTMI(input.marginalTaxRate);

    // Computed
    const notaryFees = input.isDonation ? 0 : input.purchasePrice * input.notaryFeesRate;
    // For donation/inheritance: the property value is NOT an out-of-pocket cost.
    // Only renovation + furniture + bank fees are actual investment costs.
    const totalInvestment = input.isDonation
      ? input.renovationCost + input.furnitureCost + input.bankFees + guaranteeCost
      : input.purchasePrice + notaryFees + input.renovationCost + input.furnitureCost + input.bankFees + guaranteeCost;
    const loanAmount = Math.max(0, totalInvestment - downPayment);
    const vacancyRate = vacancyWeeksPerYear / 52;
    const annualGrossRent = monthlyRentHC * 12;
    const effectiveAnnualRent = annualGrossRent * (1 - vacancyRate);
    const annualGLI = hasGLI ? annualGrossRent * gliRate : 0;
    const totalAnnualCharges =
      monthlyChargesProvision * 12 +
      annualPropertyTax +
      annualInsurancePNO +
      annualCoproNonRecoverable +
      annualMaintenance +
      annualOtherCharges +
      annualGrossRent * managementFeeRate +
      annualGLI;

    return {
      purchasePrice: input.purchasePrice,
      notaryFees,
      renovationCost: input.renovationCost,
      furnitureCost: input.furnitureCost,
      furnitureAmortizationYears,
      renovationType,
      isFurnished: input.isFurnished,
      propertyType,
      surface,

      downPayment,
      loanRate: input.loanRate,
      loanDurationYears: input.loanDurationYears,
      loanInsuranceRate: input.loanInsuranceRate,
      guaranteeType,
      guaranteeCost,
      bankFees: input.bankFees,

      monthlyRentHC,
      monthlyChargesProvision,
      annualPropertyTax,
      annualInsurancePNO,
      annualCoproNonRecoverable,
      managementFeeRate,
      annualMaintenance,
      annualOtherCharges,
      hasGLI,
      gliRate,
      vacancyWeeksPerYear,

      taxRegime: input.taxRegime,
      marginalTaxRate: input.marginalTaxRate,
      familyStatus,
      annualIncome,
      taxShares,

      projectionYears: input.projectionYears,
      annualRentIncrease: input.annualRentIncrease,
      annualPropertyValueIncrease: input.annualPropertyValueIncrease,
      annualChargesIncrease: input.annualChargesIncrease,

      totalInvestment,
      loanAmount,
      vacancyRate,
      effectiveAnnualRent,
      annualGLI,
      totalAnnualCharges,
      annualGrossRent,
    };
  }

  // -------------------------------------------------------------------------
  // Simulate — main entry point
  // -------------------------------------------------------------------------

  /**
   * Simulation complète. Point d'entrée principal.
   */
  static simulate(input: InvestmentInput): InvestmentResult {
    const n = this.normalizeInput(input);

    // Loan amortization
    const loanAmortization =
      n.loanAmount > 0
        ? this.calculateLoanAmortization({
            loanAmount: n.loanAmount,
            annualRate: n.loanRate,
            durationYears: n.loanDurationYears,
            insuranceRate: n.loanInsuranceRate,
          })
        : [];

    const monthlyLoanPayment =
      loanAmortization.length > 0 ? loanAmortization[0].payment : 0;

    // Yearly projection
    const yearlyProjection = this.projectYearly(
      input,
      n.loanAmount,
      loanAmortization,
    );

    // KPIs Year 1
    const year1 = yearlyProjection[0];
    const netRentBeforeTax = n.effectiveAnnualRent - n.totalAnnualCharges;

    // Yields — for donations, use property value as denominator (not just reno costs)
    const yieldBase = input.isDonation ? n.purchasePrice : n.totalInvestment;
    const grossYield =
      yieldBase > 0
        ? (n.annualGrossRent / yieldBase) * 100
        : 0;
    const netYield =
      yieldBase > 0
        ? (netRentBeforeTax / yieldBase) * 100
        : 0;

    // Tax computation (year 1)
    const taxRegimeComparison = this.compareRegimes(input, loanAmortization);
    const recommended = taxRegimeComparison.find((r) => r.isRecommended);
    const yearlyTax = recommended ? recommended.yearlyTax : 0;
    const recommendedRegime = recommended ? recommended.label : "";

    const netNetYield =
      yieldBase > 0
        ? ((netRentBeforeTax - yearlyTax) / yieldBase) * 100
        : 0;

    const monthlyCashflow = year1 ? year1.cashflow / 12 : 0;

    // Capital gain at end of projection
    const holdingYears = input.resaleYear ?? input.projectionYears;
    const estimatedResalePrice =
      input.resalePrice ??
      input.purchasePrice *
        Math.pow(1 + input.annualPropertyValueIncrease, holdingYears);
    const capitalGainResult = this.calculateCapitalGainTax({
      purchasePrice: input.purchasePrice,
      notaryFees: n.notaryFees,
      renovationCost: input.renovationCost,
      resalePrice: estimatedResalePrice,
      holdingYears,
    });

    // TRI
    const cashflowsForTRI = this.buildTRICashflows(
      n,
      yearlyProjection,
      loanAmortization,
      capitalGainResult.netGain,
      estimatedResalePrice,
    );
    const tri = this.calculateTRI(cashflowsForTRI);

    // VAN
    const van = this.calculateVAN(cashflowsForTRI, VAN_DISCOUNT_RATE);

    // Breakeven
    const breakevenMonth = this.findBreakevenMonth(yearlyProjection);

    // Placement comparisons
    const placements = this.comparePlacements({
      investedAmount: n.downPayment,
      years: input.projectionYears,
    });

    // V2.1 — Fiscal impact
    const taxWithoutInvestment = TaxSimulatorService.calculerIR(n.annualIncome, n.taxShares);
    const taxWithInvestment = taxWithoutInvestment + yearlyTax;
    const taxDifference = taxWithInvestment - taxWithoutInvestment;

    // V2.1 — Breakeven year
    const breakEvenYear = breakevenMonth != null ? Math.ceil(breakevenMonth / 12) : null;

    // V2.1 — Verdict
    const roundedNetNetYield = Math.round(netNetYield * 100) / 100;
    const roundedTri = Math.round(tri * 100) / 100;
    const roundedMonthlyCashflow = Math.round(monthlyCashflow);

    let verdict: Verdict;
    if (taxDifference < -500 && roundedNetNetYield < 3) {
      verdict = 'TAX_OPTIMIZED';
    } else if (roundedMonthlyCashflow >= 0 || (roundedNetNetYield >= 4 && roundedTri >= 6)) {
      verdict = 'PROFITABLE';
    } else if (roundedNetNetYield >= 2 || roundedTri >= 3) {
      verdict = 'CORRECT';
    } else {
      verdict = 'LOW_RETURN';
    }

    const effortStr = roundedMonthlyCashflow < 0
      ? `un effort de ${Math.abs(roundedMonthlyCashflow)}€/mois`
      : `un cash-flow positif de +${roundedMonthlyCashflow}€/mois`;
    const lastYear = yearlyProjection[yearlyProjection.length - 1];
    const patrimoine = lastYear ? lastYear.netWealth : 0;

    const verdictMessages: Record<Verdict, string> = {
      PROFITABLE: `Avec ${effortStr}, vous constituez un patrimoine de ${patrimoine.toLocaleString('fr-FR')}€ en ${input.projectionYears} ans. Rendement net-net : ${roundedNetNetYield}%. Régime recommandé : ${recommendedRegime}.`,
      CORRECT: `Avec ${effortStr}, vous constituez un patrimoine de ${patrimoine.toLocaleString('fr-FR')}€ en ${input.projectionYears} ans. Rendement net-net : ${roundedNetNetYield}%. Régime recommandé : ${recommendedRegime}.`,
      LOW_RETURN: `Ce projet génère un rendement net-net de ${roundedNetNetYield}% avec ${effortStr}. Envisagez de renégocier le prix ou d'optimiser les charges.`,
      TAX_OPTIMIZED: `Ce projet réduit vos impôts de ${Math.abs(taxDifference).toLocaleString('fr-FR')}€/an. Rendement net-net : ${roundedNetNetYield}%. Régime recommandé : ${recommendedRegime}.`,
    };

    return {
      grossYield: Math.round(grossYield * 100) / 100,
      netYield: Math.round(netYield * 100) / 100,
      netNetYield: roundedNetNetYield,
      monthlyCashflow: roundedMonthlyCashflow,
      totalInvestment: Math.round(n.totalInvestment),
      loanAmount: Math.round(n.loanAmount),
      monthlyLoanPayment: Math.round(monthlyLoanPayment),

      tri: roundedTri,
      van: Math.round(van),
      breakevenMonth,

      yearlyTax: Math.round(yearlyTax),
      taxRegimeComparison,
      recommendedRegime,

      estimatedResalePrice: Math.round(estimatedResalePrice),
      capitalGain: Math.round(
        capitalGainResult.netGain + capitalGainResult.total,
      ),
      capitalGainTax: Math.round(capitalGainResult.total),
      netCapitalGain: Math.round(capitalGainResult.netGain),

      vsLivretA: placements[0],
      vsAssuranceVie: placements[1],
      vsBourseSP500: placements[2],

      yearlyProjection,
      loanAmortization,

      // V2.1
      taxWithoutInvestment: Math.round(taxWithoutInvestment),
      taxWithInvestment: Math.round(taxWithInvestment),
      taxDifference: Math.round(taxDifference),
      verdict,
      verdictMessage: verdictMessages[verdict],
      breakEvenYear,
    };
  }

  // -------------------------------------------------------------------------
  // Loan Amortization
  // -------------------------------------------------------------------------

  /**
   * Tableau d'amortissement du crédit mois par mois.
   * Mensualité : M = C × (t/12) / (1 - (1 + t/12)^(-n×12))
   */
  static calculateLoanAmortization(params: {
    loanAmount: number;
    annualRate: number;
    durationYears: number;
    insuranceRate: number;
  }): LoanAmortizationRow[] {
    const { loanAmount, annualRate, durationYears, insuranceRate } = params;
    const totalMonths = durationYears * 12;
    const monthlyRate = annualRate / 12;
    const monthlyInsurance = (loanAmount * insuranceRate) / 12;

    // Monthly payment (principal + interest, excluding insurance)
    let monthlyPaymentPI: number;
    if (monthlyRate === 0) {
      monthlyPaymentPI = loanAmount / totalMonths;
    } else {
      monthlyPaymentPI =
        (loanAmount * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -totalMonths));
    }

    const totalMonthlyPayment = monthlyPaymentPI + monthlyInsurance;

    const rows: LoanAmortizationRow[] = [];
    let remainingBalance = loanAmount;

    for (let m = 1; m <= totalMonths; m++) {
      const interest = remainingBalance * monthlyRate;
      const principal = monthlyPaymentPI - interest;
      remainingBalance = Math.max(0, remainingBalance - principal);

      rows.push({
        month: m,
        payment: Math.round(totalMonthlyPayment * 100) / 100,
        principal: Math.round(principal * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        insurance: Math.round(monthlyInsurance * 100) / 100,
        remainingBalance: Math.round(remainingBalance * 100) / 100,
      });
    }

    return rows;
  }

  // -------------------------------------------------------------------------
  // TRI (Newton-Raphson)
  // -------------------------------------------------------------------------

  /**
   * Calcul du TRI via Newton-Raphson.
   * Flux : cashflows[0] = investissement initial (négatif),
   *        cashflows[1..N] = cash-flows annuels,
   *        dernier flux inclut la revente nette.
   */
  static calculateTRI(cashflows: number[]): number {
    if (cashflows.length < 2) return 0;

    // Initial guess
    let rate = 0.1;
    const maxIterations = 100;
    const precision = 1e-7;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let dnpv = 0; // derivative

      for (let t = 0; t < cashflows.length; t++) {
        const discountFactor = Math.pow(1 + rate, t);
        npv += cashflows[t] / discountFactor;
        if (t > 0) {
          dnpv -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
        }
      }

      if (Math.abs(npv) < precision) return rate * 100;
      if (Math.abs(dnpv) < precision) break;

      const newRate = rate - npv / dnpv;

      // Guard against divergence
      if (newRate < -0.99) {
        rate = -0.5;
        continue;
      }
      if (newRate > 10) {
        rate = 5;
        continue;
      }

      if (Math.abs(newRate - rate) < precision) return newRate * 100;
      rate = newRate;
    }

    return rate * 100;
  }

  // -------------------------------------------------------------------------
  // VAN
  // -------------------------------------------------------------------------

  /**
   * VAN = Σ (flux_t / (1+r)^t)
   */
  static calculateVAN(
    cashflows: number[],
    discountRate: number = VAN_DISCOUNT_RATE,
  ): number {
    let van = 0;
    for (let t = 0; t < cashflows.length; t++) {
      van += cashflows[t] / Math.pow(1 + discountRate, t);
    }
    return van;
  }

  // -------------------------------------------------------------------------
  // Capital gain tax
  // -------------------------------------------------------------------------

  /**
   * Impôt sur la plus-value immobilière avec abattements par durée de détention.
   */
  static calculateCapitalGainTax(params: {
    purchasePrice: number;
    notaryFees: number;
    renovationCost: number;
    resalePrice: number;
    holdingYears: number;
  }): {
    taxIR: number;
    taxPS: number;
    surtax: number;
    total: number;
    netGain: number;
  } {
    const {
      purchasePrice,
      notaryFees,
      renovationCost,
      resalePrice,
      holdingYears,
    } = params;

    // Prix d'acquisition majoré
    const acquisitionPrice = purchasePrice + notaryFees + renovationCost;
    const grossGain = resalePrice - acquisitionPrice;

    if (grossGain <= 0) {
      return { taxIR: 0, taxPS: 0, surtax: 0, total: 0, netGain: grossGain };
    }

    // Abattement IR
    const irAbatement = this.calculateIRAbatement(holdingYears);
    const taxableGainIR = grossGain * (1 - irAbatement);
    const taxIR = Math.round(taxableGainIR * CAPITAL_GAIN_IR_RATE);

    // Abattement PS
    const psAbatement = this.calculatePSAbatement(holdingYears);
    const taxableGainPS = grossGain * (1 - psAbatement);
    const taxPS = Math.round(taxableGainPS * CAPITAL_GAIN_PS_RATE);

    // Surtaxe
    const surtax = this.calculateSurtax(taxableGainIR);

    const total = taxIR + taxPS + surtax;
    const netGain = grossGain - total;

    return { taxIR, taxPS, surtax, total, netGain };
  }

  private static calculateIRAbatement(years: number): number {
    if (years >= 22) return 1; // Exonération totale IR

    let abatement = 0;
    for (let y = 6; y <= Math.min(years, 21); y++) {
      abatement += 0.06; // 6% par an de la 6e à la 21e année
    }
    return Math.min(1, abatement);
  }

  private static calculatePSAbatement(years: number): number {
    if (years >= 30) return 1; // Exonération totale PS

    let abatement = 0;
    for (let y = 6; y <= Math.min(years, 21); y++) {
      abatement += 0.0165; // 1.65% par an de la 6e à la 21e
    }
    if (years >= 22) {
      abatement += 0.016; // 1.60% la 22e année
    }
    for (let y = 23; y <= Math.min(years, 30); y++) {
      abatement += 0.09; // 9% par an de la 23e à la 30e
    }
    return Math.min(1, abatement);
  }

  private static calculateSurtax(taxableGainIR: number): number {
    if (taxableGainIR <= CAPITAL_GAIN_SURTAX_THRESHOLD) return 0;

    let surtax = 0;
    for (const bracket of CAPITAL_GAIN_SURTAX_BRACKETS) {
      if (taxableGainIR <= bracket.min) break;
      const taxableInBracket =
        Math.min(taxableGainIR, bracket.max) - bracket.min;
      surtax += taxableInBracket * bracket.rate;
    }
    return Math.round(surtax);
  }

  // -------------------------------------------------------------------------
  // Placement comparison
  // -------------------------------------------------------------------------

  /**
   * Comparaison avec placements alternatifs (intérêts composés).
   */
  static comparePlacements(params: {
    investedAmount: number;
    years: number;
  }): PlacementComparison[] {
    const { investedAmount, years } = params;

    const placements = [
      { name: "Livret A", rate: LIVRET_A_RATE },
      { name: "Assurance-vie fonds euros", rate: ASSURANCE_VIE_RATE },
      { name: "Bourse (S&P 500)", rate: BOURSE_SP500_RATE },
    ];

    return placements.map((p) => {
      const finalValue = investedAmount * Math.pow(1 + p.rate, years);
      return {
        name: p.name,
        annualRate: p.rate,
        totalInvested: investedAmount,
        finalValue: Math.round(finalValue),
        totalGain: Math.round(finalValue - investedAmount),
      };
    });
  }

  // -------------------------------------------------------------------------
  // Yearly projection
  // -------------------------------------------------------------------------

  /**
   * Projection année par année avec taux d'augmentation annuels.
   */
  static projectYearly(
    input: InvestmentInput,
    _loanAmount: number,
    loanAmortization: LoanAmortizationRow[],
  ): YearlyProjection[] {
    // Normalize once for the entire projection
    const n = this.normalizeInput(input);
    const projections: YearlyProjection[] = [];
    let cumulativeCashflow = 0;

    // IR sans investissement — constant, calculé une seule fois
    const taxWithout = TaxSimulatorService.calculerIR(n.annualIncome, n.taxShares);

    for (let year = 1; year <= input.projectionYears; year++) {
      const yearFactor = year - 1;

      // Loyer avec revalorisation
      const monthlyRentYear =
        n.monthlyRentHC * Math.pow(1 + n.annualRentIncrease, yearFactor);
      const grossRent = monthlyRentYear * 12;
      const vacancyLoss = grossRent * n.vacancyRate;
      const effectiveRent = grossRent - vacancyLoss;

      // Charges avec augmentation
      const chargesFactor = Math.pow(
        1 + n.annualChargesIncrease,
        yearFactor,
      );
      const propertyTaxYear = n.annualPropertyTax * chargesFactor;
      const insuranceYear = n.annualInsurancePNO * chargesFactor;
      const maintenanceYear = n.annualMaintenance * chargesFactor;
      const coprYear = n.annualCoproNonRecoverable * chargesFactor;
      const otherYear = n.annualOtherCharges * chargesFactor;
      const managementFees = grossRent * n.managementFeeRate;
      const gliYear = n.hasGLI ? grossRent * n.gliRate : 0;

      const totalCharges =
        propertyTaxYear +
        insuranceYear +
        maintenanceYear +
        coprYear +
        otherYear +
        managementFees +
        gliYear;

      const netRent = effectiveRent - totalCharges;

      // Loan payment for this year (single pass for payment, interest, insurance)
      let yearlyLoanPayment = 0;
      let remainingLoan = 0;
      let yearlyInterest = 0;
      let yearlyInsurance = 0;

      if (loanAmortization.length > 0) {
        const startMonth = (year - 1) * 12;
        const endMonth = Math.min(year * 12, loanAmortization.length);

        for (let m = startMonth; m < endMonth; m++) {
          yearlyLoanPayment += loanAmortization[m].payment;
          yearlyInterest += loanAmortization[m].interest;
          yearlyInsurance += loanAmortization[m].insurance;
        }

        if (endMonth <= loanAmortization.length && endMonth > 0) {
          remainingLoan = loanAmortization[endMonth - 1].remainingBalance;
        }
      }

      // Tax for this year (pass pre-normalized values to avoid re-normalizing)
      const tax = this.calculateYearlyTax(
        n,
        grossRent,
        propertyTaxYear,
        insuranceYear,
        coprYear,
        managementFees,
        yearlyInterest,
      );

      const taxWith = taxWithout + tax;

      const cashflow = netRent - yearlyLoanPayment - tax;
      cumulativeCashflow += cashflow;

      // Property value
      const propertyValue =
        n.purchasePrice *
        Math.pow(1 + n.annualPropertyValueIncrease, year);

      const netWealth = propertyValue - remainingLoan;

      // Monthly breakdowns
      const monthlyVacancy = (grossRent * n.vacancyRate) / 12;
      const monthlyNetRent = monthlyRentYear - monthlyVacancy;

      const monthlyRevenueBreakdown: MonthlyRevenueBreakdown = {
        rentHC: Math.round(monthlyRentYear),
        vacancyDeduction: Math.round(monthlyVacancy),
        netRent: Math.round(monthlyNetRent),
      };

      const monthlyExpenseBreakdown: MonthlyExpenseBreakdown = {
        loanPayment: Math.round((yearlyLoanPayment - yearlyInsurance) / 12),
        loanInsurance: Math.round(yearlyInsurance / 12),
        propertyTax: Math.round(propertyTaxYear / 12),
        insurancePNO: Math.round(insuranceYear / 12),
        coproCharges: Math.round(coprYear / 12),
        gli: Math.round(gliYear / 12),
        management: Math.round(managementFees / 12),
        maintenance: Math.round(maintenanceYear / 12),
        otherCharges: Math.round(otherYear / 12),
        monthlyTax: Math.round(tax / 12),
      };

      const totalMonthlyExpenses = Object.values(monthlyExpenseBreakdown).reduce((a, b) => a + b, 0);
      const savingsEffort = monthlyRevenueBreakdown.netRent - totalMonthlyExpenses;

      // Total gain if sold this year
      const capitalGainThisYear = this.calculateCapitalGainTax({
        purchasePrice: n.purchasePrice,
        notaryFees: n.notaryFees,
        renovationCost: n.renovationCost,
        resalePrice: propertyValue,
        holdingYears: year,
      });
      const totalGain = capitalGainThisYear.netGain + cumulativeCashflow;

      projections.push({
        year,
        grossRent: Math.round(grossRent),
        netRent: Math.round(netRent),
        loanPayment: Math.round(yearlyLoanPayment),
        tax: Math.round(tax),
        cashflow: Math.round(cashflow),
        cumulativeCashflow: Math.round(cumulativeCashflow),
        propertyValue: Math.round(propertyValue),
        remainingLoan: Math.round(remainingLoan),
        netWealth: Math.round(netWealth),
        monthlyRevenueBreakdown,
        monthlyExpenseBreakdown,
        savingsEffort: Math.round(savingsEffort),
        taxWithout: Math.round(taxWithout),
        taxWith: Math.round(taxWith),
        totalGain: Math.round(totalGain),
      });
    }

    return projections;
  }

  // -------------------------------------------------------------------------
  // Tax calculation for a single year (V2 — uses modular tax-regimes)
  // -------------------------------------------------------------------------

  private static calculateYearlyTax(
    n: NormalizedInput,
    grossRent: number,
    taxeFonciere: number,
    assurancePNO: number,
    chargesCopropriete: number,
    fraisGestion: number,
    yearlyInterest: number,
  ): number {
    const furnitureAmortYears = n.furnitureAmortizationYears;

    const taxParams: TaxCalculationParams = {
      loyerAnnuelBrut: grossRent,
      interetsEmprunt: yearlyInterest,
      taxeFonciere,
      assurancePNO,
      fraisGestion,
      chargesCopropriete,
      travauxDeductibles: 0,
      amortissementBien: n.isFurnished
        ? (n.purchasePrice * 0.85) / 30
        : 0,
      amortissementMobilier: n.isFurnished
        ? n.furnitureCost / furnitureAmortYears
        : 0,
      amortissementTravaux: n.isFurnished
        ? n.renovationCost / 10
        : 0,
      revenuGlobal: n.annualIncome,
      nombreParts: n.taxShares,
      purchasePrice: n.purchasePrice,
      surface: n.surface,
    };

    // Try the selected regime first
    const selectedRegime = getRegime(n.taxRegime as Parameters<typeof getRegime>[0]);
    if (selectedRegime) {
      const ctx: ApplicabilityContext = {
        isFurnished: n.isFurnished,
        loyerAnnuelBrut: grossRent,
        revenuGlobal: n.annualIncome,
        purchasePrice: n.purchasePrice,
        surface: n.surface,
        travauxDeductibles: n.renovationCost,
      };
      const { eligible } = selectedRegime.isApplicable(ctx);
      if (eligible) {
        return selectedRegime.calculateAnnualTax(taxParams).totalImposition;
      }
    }

    // Fallback: find best eligible regime (auto mode)
    const ctx: ApplicabilityContext = {
      isFurnished: n.isFurnished,
      loyerAnnuelBrut: grossRent,
      revenuGlobal: n.annualIncome,
      purchasePrice: n.purchasePrice,
      surface: n.surface,
      travauxDeductibles: n.renovationCost,
    };

    const allRegimes = getApplicableRegimes(ctx);
    let minTax = Infinity;

    for (const { regime, eligible } of allRegimes) {
      if (!eligible) continue;
      const result = regime.calculateAnnualTax(taxParams);
      if (result.totalImposition < minTax) {
        minTax = result.totalImposition;
      }
    }

    return minTax === Infinity ? 0 : minTax;
  }

  /**
   * Estimate revenuGlobalAnnuel from marginal tax rate (for TMI-based input).
   * Uses midpoint of each tax bracket.
   */
  private static estimateRevenuFromTMI(tmi: number): number {
    // Pick a representative income for each TMI
    const tmiToRevenu: Record<number, number> = {
      0: 10_000,
      0.11: 20_000,
      0.30: 50_000,
      0.41: 120_000,
      0.45: 200_000,
    };
    return tmiToRevenu[tmi] ?? 50_000;
  }

  // -------------------------------------------------------------------------
  // Compare regimes (V2 — uses modular tax-regimes registry)
  // -------------------------------------------------------------------------

  /**
   * Compare tous les régimes fiscaux applicables à cette simulation.
   * Utilise le registry modulaire `services/tax-regimes/`.
   */
  static compareRegimes(
    input: InvestmentInput,
    loanAmortization: LoanAmortizationRow[],
  ): TaxRegimeComparison[] {
    const n = this.normalizeInput(input);

    const yearlyLoanPayment = loanAmortization
      .slice(0, 12)
      .reduce((s, r) => s + r.payment, 0);
    const yearlyInterest = loanAmortization
      .slice(0, 12)
      .reduce((s, r) => s + r.interest, 0);

    const netRentBeforeTax = n.effectiveAnnualRent - n.totalAnnualCharges;

    // Applicability context
    const ctx: ApplicabilityContext = {
      isFurnished: n.isFurnished,
      loyerAnnuelBrut: n.annualGrossRent,
      revenuGlobal: n.annualIncome,
      purchasePrice: n.purchasePrice,
      surface: n.surface,
      travauxDeductibles: n.renovationCost,
    };

    // Tax calculation params
    const furnitureAmortYears = n.furnitureAmortizationYears;
    const taxParams: TaxCalculationParams = {
      loyerAnnuelBrut: n.annualGrossRent,
      interetsEmprunt: yearlyInterest,
      taxeFonciere: n.annualPropertyTax,
      assurancePNO: n.annualInsurancePNO,
      fraisGestion: n.annualGrossRent * n.managementFeeRate,
      chargesCopropriete: n.annualCoproNonRecoverable,
      travauxDeductibles: 0,
      amortissementBien: n.isFurnished ? (n.purchasePrice * 0.85) / 30 : 0,
      amortissementMobilier: n.isFurnished
        ? n.furnitureCost / furnitureAmortYears
        : 0,
      amortissementTravaux: n.isFurnished ? n.renovationCost / 10 : 0,
      revenuGlobal: n.annualIncome,
      nombreParts: n.taxShares,
      purchasePrice: n.purchasePrice,
      surface: n.surface,
    };

    // Get all regimes with eligibility
    const allRegimes = getApplicableRegimes(ctx);

    const results: TaxRegimeComparison[] = [];
    let minTax = Infinity;
    let bestKey = "";

    for (const { regime, eligible } of allRegimes) {
      if (!eligible) {
        results.push({
          regime: regime.id,
          label: regime.label,
          yearlyTax: 0,
          netCashflow: 0,
          isRecommended: false,
          eligible: false,
        });
        continue;
      }

      const taxResult = regime.calculateAnnualTax(taxParams);
      const yearlyTax = taxResult.totalImposition;
      const netCashflow =
        (netRentBeforeTax - yearlyLoanPayment - yearlyTax) / 12;

      if (yearlyTax < minTax) {
        minTax = yearlyTax;
        bestKey = regime.id;
      }

      results.push({
        regime: regime.id,
        label: regime.label,
        yearlyTax: Math.round(yearlyTax),
        netCashflow: Math.round(netCashflow),
        isRecommended: false,
        eligible: true,
      });
    }

    // Mark recommended
    for (const r of results) {
      if (r.regime === bestKey && r.eligible) {
        r.isRecommended = true;
      }
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Breakeven
  // -------------------------------------------------------------------------

  /**
   * Point mort : premier mois où le cash-flow cumulé > 0.
   */
  static findBreakevenMonth(
    yearlyProjection: YearlyProjection[],
  ): number | null {
    for (const yp of yearlyProjection) {
      if (yp.cumulativeCashflow > 0) {
        // Interpolate within the year
        const prevCumulative =
          yp.year > 1
            ? yearlyProjection[yp.year - 2].cumulativeCashflow
            : 0;
        const monthlyGain = yp.cashflow / 12;
        if (monthlyGain <= 0) return yp.year * 12;

        const deficit = Math.abs(prevCumulative);
        const monthsInYear = Math.ceil(deficit / monthlyGain);
        return (yp.year - 1) * 12 + Math.min(monthsInYear, 12);
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Build TRI cashflows
  // -------------------------------------------------------------------------

  private static buildTRICashflows(
    n: NormalizedInput,
    yearlyProjection: YearlyProjection[],
    loanAmortization: LoanAmortizationRow[],
    netCapitalGain: number,
    resalePrice: number,
  ): number[] {
    // Year 0: personal outlay (cash out of pocket)
    const cashOut =
      n.downPayment > 0
        ? -n.downPayment
        : -(n.downPayment + n.notaryFees + n.renovationCost + n.furnitureCost + n.bankFees + n.guaranteeCost);

    const cashflows = [cashOut];

    // Years 1 to N-1: annual cashflow
    for (let i = 0; i < yearlyProjection.length - 1; i++) {
      cashflows.push(yearlyProjection[i].cashflow);
    }

    // Last year: cashflow + resale net proceeds - remaining loan
    const lastYear = yearlyProjection[yearlyProjection.length - 1];
    const remainingLoan = lastYear ? lastYear.remainingLoan : 0;
    const lastCashflow = lastYear ? lastYear.cashflow : 0;
    const resaleProceeds = resalePrice - remainingLoan;
    const capitalGainTax =
      resalePrice -
      (n.purchasePrice + n.notaryFees + n.renovationCost) -
      netCapitalGain;

    cashflows.push(lastCashflow + resaleProceeds - capitalGainTax);

    return cashflows;
  }
}
