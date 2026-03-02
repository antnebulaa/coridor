'use client';

import { useState, useEffect } from 'react';
import { useCountUp } from '@/hooks/useCountUp';
import type { InvestmentInput } from '@/services/InvestmentSimulatorService';

interface TeasingPreviewProps {
  input: InvestmentInput;
  currentStep: number;
}

/**
 * Simplified client-side patrimoine estimate (no API call).
 * Approximation: futurePropertyValue - remainingLoan + cumulativeCashflow
 */
function quickEstimate(input: InvestmentInput): number {
  const { purchasePrice, projectionYears, annualPropertyValueIncrease, monthlyRent, monthlyCharges,
    personalContribution, loanRate, loanDurationYears, notaryFeesRate, renovationCost } = input;

  if (purchasePrice <= 0) return 0;

  // Future property value
  const futureValue = purchasePrice * Math.pow(1 + annualPropertyValueIncrease, projectionYears);

  // Total investment
  const notaryFees = purchasePrice * notaryFeesRate;
  const totalInvest = purchasePrice + notaryFees + renovationCost;
  const loanAmount = Math.max(totalInvest - personalContribution, 0);

  // Remaining loan (simplified: if projectionYears >= loanDuration, loan is paid off)
  const remainingLoan = projectionYears >= loanDurationYears ? 0 : loanAmount * (1 - projectionYears / loanDurationYears);

  // Net annual rent (rough estimate)
  const annualRent = monthlyRent * 12;
  const annualCharges = monthlyCharges * 12;
  const annualLoan = loanAmount > 0 && loanDurationYears > 0
    ? (loanAmount * (loanRate / 12) * Math.pow(1 + loanRate / 12, loanDurationYears * 12)) /
      (Math.pow(1 + loanRate / 12, loanDurationYears * 12) - 1) * 12
    : 0;
  const netAnnual = annualRent - annualCharges - annualLoan;

  // Simple accumulation over projection years (capped at loan duration for cash-flow)
  const cashflowYears = Math.min(projectionYears, loanDurationYears);
  const postLoanYears = Math.max(projectionYears - loanDurationYears, 0);
  const cumulCashflow = netAnnual * cashflowYears + (annualRent - annualCharges) * postLoanYears;

  return Math.round(futureValue - remainingLoan + cumulCashflow - totalInvest);
}

export function TeasingPreview({ input, currentStep }: TeasingPreviewProps) {
  const [estimate, setEstimate] = useState(0);

  // Debounce the estimate calculation
  useEffect(() => {
    if (input.purchasePrice <= 0) {
      setEstimate(0);
      return;
    }
    const timer = setTimeout(() => {
      setEstimate(quickEstimate(input));
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const animatedValue = useCountUp(Math.abs(estimate), 600, estimate !== 0);

  if (input.purchasePrice <= 0) return null;

  const fmt = (n: number) => n.toLocaleString('fr-FR');
  const hasRent = input.monthlyRent > 0;

  return (
    <div
      className="mt-8 p-5 text-center backdrop-blur-xl rounded-[20px] bg-white/40 dark:bg-white/8 border border-white/60 dark:border-white/10"
    >
      {hasRent ? (
        <>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
            Patrimoine estimé en {input.projectionYears} ans
          </div>
          <div
            className="text-3xl font-bold text-neutral-900 dark:text-white tabular-nums"
            style={{ fontFamily: 'var(--font-nunito-sim), sans-serif' }}
          >
            {estimate >= 0 ? '+' : '-'}{fmt(animatedValue)}€
          </div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
            Finalisez la simulation pour le détail
          </div>
        </>
      ) : (
        <>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            Coût total estimé
          </div>
          <div
            className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums"
            style={{ fontFamily: 'var(--font-nunito-sim), sans-serif' }}
          >
            {fmt(Math.round(input.purchasePrice * (1 + input.notaryFeesRate) + input.renovationCost))}€
          </div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
            Renseignez le loyer pour estimer le patrimoine
          </div>
        </>
      )}
    </div>
  );
}
