'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import CustomToast from '@/components/ui/CustomToast';
import SimulatorForm from '@/components/simulator/SimulatorForm';
import SimulatorResults from '@/components/simulator/SimulatorResults';
import { CalculationLoader } from '@/components/simulator/CalculationLoader';
import { useInvestmentSimulator } from '@/hooks/useInvestmentSimulator';
import type { InvestmentInput } from '@/services/InvestmentSimulatorService';
import type { User } from '@prisma/client';
import {
  NOTARY_FEES_OLD,
  DEFAULT_LOAN_RATE,
  DEFAULT_INSURANCE_RATE,
  DEFAULT_LOAN_DURATION,
  DEFAULT_BANK_FEES,
  DEFAULT_VACANCY_RATE,
  DEFAULT_MARGINAL_TAX_RATE,
  DEFAULT_PROJECTION_YEARS,
  DEFAULT_ANNUAL_RENT_INCREASE,
  DEFAULT_ANNUAL_PROPERTY_VALUE_INCREASE,
  DEFAULT_ANNUAL_CHARGES_INCREASE,
  DEFAULT_INSURANCE_PNO,
  DEFAULT_MAINTENANCE_V2,
  DEFAULT_VACANCY_WEEKS,
} from '@/lib/simulatorDefaults';

interface SimulatorClientProps {
  user: User | null;
}

const defaultInput: InvestmentInput = {
  // V1 required fields
  purchasePrice: 200000,
  notaryFeesRate: NOTARY_FEES_OLD,
  renovationCost: 0,
  furnitureCost: 0,

  personalContribution: 40000,
  loanRate: DEFAULT_LOAN_RATE,
  loanDurationYears: DEFAULT_LOAN_DURATION,
  loanInsuranceRate: DEFAULT_INSURANCE_RATE,
  bankFees: DEFAULT_BANK_FEES,

  monthlyRent: 900,
  monthlyCharges: 0,
  propertyTaxYearly: 1000,
  insuranceYearly: DEFAULT_INSURANCE_PNO,
  managementFeesRate: 0,
  vacancyRate: DEFAULT_VACANCY_RATE,
  maintenanceYearly: DEFAULT_MAINTENANCE_V2,
  coprYearly: 600,

  taxRegime: 'reel',
  marginalTaxRate: DEFAULT_MARGINAL_TAX_RATE,
  isFurnished: false,

  projectionYears: DEFAULT_PROJECTION_YEARS,
  annualRentIncrease: DEFAULT_ANNUAL_RENT_INCREASE,
  annualPropertyValueIncrease: DEFAULT_ANNUAL_PROPERTY_VALUE_INCREASE,
  annualChargesIncrease: DEFAULT_ANNUAL_CHARGES_INCREASE,

  // V2 defaults
  propertyType: 'APARTMENT',
  surface: 0,
  downPayment: 40000,
  guaranteeType: 'NONE',
  guaranteeCost: 0,
  monthlyRentHC: 900,
  monthlyChargesProvision: 0,
  annualPropertyTax: 1000,
  annualInsurancePNO: DEFAULT_INSURANCE_PNO,
  annualCoproNonRecoverable: 600,
  managementFeeRate: 0,
  annualMaintenance: DEFAULT_MAINTENANCE_V2,
  annualOtherCharges: 0,
  hasGLI: false,
  vacancyWeeksPerYear: DEFAULT_VACANCY_WEEKS,
  familyStatus: 'SINGLE',
};

export default function SimulatorClient({ user }: SimulatorClientProps) {
  const [input, setInput] = useState<InvestmentInput>(defaultInput);
  const { result, isLoading, error, simulate, save } = useInvestmentSimulator();
  const [hasSimulated, setHasSimulated] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSimulate = async () => {
    setShowLoader(true);
    setShowResults(false);
    const res = await simulate(input);
    if (res) {
      setHasSimulated(true);
      // Loader animation will call handleLoaderComplete when done
    } else {
      setShowLoader(false);
    }
  };

  const handleLoaderComplete = useCallback(() => {
    setShowLoader(false);
    setShowResults(true);
    setTimeout(() => {
      document
        .getElementById('simulator-results')
        ?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const handleSave = async () => {
    const res = await save('Ma simulation', input);
    if (res) {
      toast.custom((t) => (
        <CustomToast t={t} message="Simulation sauvegardée !" type="success" />
      ));
    } else {
      toast.custom((t) => (
        <CustomToast
          t={t}
          message="Connectez-vous pour sauvegarder"
          type="error"
        />
      ));
    }
  };

  // Real-time loan summary for step 2
  const loanSummary = useMemo(() => {
    const downPayment = input.downPayment ?? input.personalContribution;
    const guaranteeCost = input.guaranteeCost ?? 0;
    const totalCost =
      input.purchasePrice +
      input.purchasePrice * input.notaryFeesRate +
      input.renovationCost +
      input.furnitureCost +
      input.bankFees +
      guaranteeCost;
    const loanAmount = Math.max(0, totalCost - downPayment);
    const monthlyRate = input.loanRate / 12;
    const totalMonths = input.loanDurationYears * 12;

    let monthlyPayment = 0;
    if (monthlyRate > 0 && loanAmount > 0) {
      monthlyPayment =
        (loanAmount * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -totalMonths));
    } else if (loanAmount > 0) {
      monthlyPayment = loanAmount / totalMonths;
    }

    const totalCreditCost = monthlyPayment * totalMonths - loanAmount;

    return {
      loanAmount: Math.round(loanAmount),
      monthlyPayment: Math.round(monthlyPayment),
      totalCreditCost: Math.round(totalCreditCost),
    };
  }, [
    input.purchasePrice,
    input.notaryFeesRate,
    input.renovationCost,
    input.furnitureCost,
    input.bankFees,
    input.personalContribution,
    input.downPayment,
    input.guaranteeCost,
    input.loanRate,
    input.loanDurationYears,
    input.loanInsuranceRate,
  ]);

  return (
    <div className="simulator-page relative z-10">
      {/* Header with gradient */}
      <div className="text-center pt-8 md:pt-12 pb-6 md:pb-8 px-4 sm:px-6">
        <div className="absolute inset-x-0 top-0 h-64 bg-linear-to-b from-(--sim-amber-50) to-transparent -z-10 pointer-events-none" />
        <h1
          className="text-3xl md:text-4xl text-neutral-900 dark:text-white"
          style={{ fontFamily: 'var(--font-serif-sim), serif' }}
        >
          Simulateur d&apos;investissement locatif
        </h1>
        <p className="mt-3 text-neutral-500 text-base md:text-lg max-w-2xl mx-auto">
          Calculez gratuitement la rentabilité de votre investissement.
          Rendement net, cash-flow, TRI, comparaison fiscale et plus.
        </p>
      </div>

      {/* Form — centered */}
      {!showLoader && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8 md:pb-12">
          <SimulatorForm
            input={input}
            onChange={setInput}
            onSimulate={handleSimulate}
            isLoading={isLoading}
            loanSummary={loanSummary}
          />
        </div>
      )}

      {/* Calculation loader */}
      {showLoader && (
        <CalculationLoader
          projectionYears={input.projectionYears}
          onComplete={handleLoaderComplete}
        />
      )}

      {/* Error */}
      {error && !showLoader && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-950 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Results — full-width bands */}
      {showResults && hasSimulated && result && (
        <div id="simulator-results">
          <SimulatorResults result={result} input={input} onSave={handleSave} user={user} />
        </div>
      )}
    </div>
  );
}
