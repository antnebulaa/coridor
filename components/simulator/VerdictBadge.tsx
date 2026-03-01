'use client';

import { CheckCircle, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import type { InvestmentResult, InvestmentInput, Verdict } from '@/services/InvestmentSimulatorService';
import { useCountUp } from '@/hooks/useCountUp';

interface VerdictBadgeProps {
  result: InvestmentResult;
  input: InvestmentInput;
}

const VERDICT_PILL: Record<
  Verdict,
  {
    icon: React.ReactNode;
    label: string;
    bg: string;
    text: string;
  }
> = {
  PROFITABLE: {
    icon: <CheckCircle size={16} />,
    label: 'Investissement rentable',
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  CORRECT: {
    icon: <CheckCircle size={16} />,
    label: 'Investissement correct',
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  LOW_RETURN: {
    icon: <XCircle size={16} />,
    label: 'Rentabilité faible',
    bg: 'bg-red-100 dark:bg-red-900/50',
    text: 'text-red-700 dark:text-red-300',
  },
  TAX_OPTIMIZED: {
    icon: <Sparkles size={16} />,
    label: 'Investissement défiscalisant',
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
};

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

export function VerdictBadge({ result, input }: VerdictBadgeProps) {
  const pill = VERDICT_PILL[result.verdict];
  const lastYear = result.yearlyProjection[result.yearlyProjection.length - 1];
  const targetYear = new Date().getFullYear() + input.projectionYears;

  const isTaxOptimized = result.verdict === 'TAX_OPTIMIZED';
  const isPositive = lastYear && lastYear.netWealth > 0;
  const headlineAmount = isTaxOptimized
    ? Math.abs(result.taxDifference)
    : lastYear?.totalGain ?? lastYear?.netWealth ?? 0;

  const animatedAmount = useCountUp(Math.abs(Math.round(headlineAmount)), 900);

  const effort1 = result.yearlyProjection[0]?.savingsEffort ?? 0;
  const patrimoine = lastYear?.netWealth ?? 0;

  // Breakdown of gain for explanation
  const cumulCashflow = lastYear?.cumulativeCashflow ?? 0;
  const capitalRepaid = result.loanAmount - (lastYear?.remainingLoan ?? 0);
  const propertyValueGain = (lastYear?.propertyValue ?? 0) - result.totalInvestment;

  return (
    <div className="text-center relative overflow-hidden">
      {/* SVG circle backdrop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
        <svg width="400" height="400" viewBox="0 0 400 400" className="opacity-[0.06]">
          <circle cx="200" cy="200" r="180" fill="none" stroke="var(--sim-amber-400)" strokeWidth="2" />
          <circle cx="200" cy="200" r="140" fill="none" stroke="var(--sim-amber-400)" strokeWidth="1" />
          <circle cx="200" cy="200" r="100" fill="none" stroke="var(--sim-amber-400)" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="relative space-y-5">
        {/* Intro text */}
        <p
          className="text-xl sm:text-2xl text-neutral-600 dark:text-neutral-400"
          style={{ fontFamily: 'var(--font-serif-sim), serif' }}
        >
          {isPositive || isTaxOptimized
            ? `En ${targetYear}, cet investissement vous aura ${isTaxOptimized ? 'économisé' : 'enrichi'} de`
            : 'Attention : cet investissement nécessite une analyse approfondie.'}
        </p>

        {/* Hero number */}
        {(isPositive || isTaxOptimized) && (
          <div
            className="text-4xl sm:text-5xl md:text-7xl font-bold text-(--sim-amber-500) tabular-nums"
            style={{ fontFamily: 'var(--font-serif-sim), serif' }}
          >
            {fmt(animatedAmount)}&nbsp;€
          </div>
        )}

        {/* Badge pill + animated check */}
        <div className="flex items-center justify-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" className={pill.text}>
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="63"
              strokeDashoffset="63"
              style={{ animation: 'sim-draw-check 0.6s ease-out 0.2s forwards' }}
            />
            <path
              d="M8 12l2.5 2.5L16 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="20"
              strokeDashoffset="20"
              style={{ animation: 'sim-draw-check 0.4s ease-out 0.6s forwards' }}
            />
          </svg>

          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${pill.bg} ${pill.text}`}
          >
            {pill.icon}
            {pill.label}
          </span>
        </div>

        {/* Gain breakdown — explain where the money comes from */}
        {(isPositive || isTaxOptimized) && (
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
            {propertyValueGain > 0 && (
              <span>Plus-value : +{fmt(Math.round(propertyValueGain))}€</span>
            )}
            {cumulCashflow !== 0 && (
              <span>Loyers nets : {cumulCashflow >= 0 ? '+' : ''}{fmt(Math.round(cumulCashflow))}€</span>
            )}
            {capitalRepaid > 0 && (
              <span>Capital remboursé : +{fmt(Math.round(capitalRepaid))}€</span>
            )}
          </div>
        )}

        {/* Condensed summary line */}
        <p className="text-base text-neutral-500 dark:text-neutral-400">
          Effort {effort1 >= 0 ? '+' : ''}{fmt(effort1)}€/mois · Patrimoine {fmt(Math.round(patrimoine / 1000))}k€
        </p>
      </div>
    </div>
  );
}
