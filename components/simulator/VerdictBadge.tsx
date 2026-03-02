'use client';

import type { InvestmentResult, InvestmentInput, Verdict } from '@/services/InvestmentSimulatorService';
import { useCountUp } from '@/hooks/useCountUp';

interface VerdictBadgeProps {
  result: InvestmentResult;
  input: InvestmentInput;
}

const VERDICT_PILL: Record<
  Verdict,
  {
    label: string;
    bg: string;
    text: string;
  }
> = {
  PROFITABLE: {
    label: 'Investissement rentable',
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  CORRECT: {
    label: 'Investissement correct',
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  LOW_RETURN: {
    label: 'Rentabilité faible',
    bg: 'bg-red-100 dark:bg-red-900/50',
    text: 'text-red-700 dark:text-red-300',
  },
  TAX_OPTIMIZED: {
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

  // Exact breakdown of totalGain: net capital gain (after PV taxes) + cumulative net rent
  const cumulCashflow = lastYear?.cumulativeCashflow ?? 0;
  const totalGain = lastYear?.totalGain ?? 0;
  // pvNette = totalGain - cumulCashflow → exact component, no rounding mismatch
  const pvNette = totalGain - cumulCashflow;

  return (
    <div className="text-center relative overflow-hidden">
      

      <div className="relative space-y-5">
        {/* Intro text */}
        <p
          className="text-2xl font-medium sm:text-3xl text-neutral-!00 dark:text-neutral-400 px-4"
          
        >
          {isPositive || isTaxOptimized
            ? `En ${targetYear}, cet investissement vous aura ${isTaxOptimized ? 'économisé' : 'enrichi'} de`
            : 'Attention : cet investissement nécessite une analyse approfondie.'}
        </p>

        {/* Hero number */}
        {(isPositive || isTaxOptimized) && (
          <div
            className="text-4xl sm:text-5xl md:text-7xl font-bold text-(--sim-amber-500) tabular-nums"
            style={{ fontFamily: 'var(--font-nunito-sim), sans-serif' }}
          >
            {fmt(animatedAmount)}&nbsp;€
          </div>
        )}

        {/* Badge pill + animated icon */}
        <div className="flex items-center justify-center gap-3">
          

          <span
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${pill.bg} ${pill.text}`}
          >
            {pill.label}
          </span>
        </div>

        {/* Gain breakdown — chips */}
        {(isPositive || isTaxOptimized) && !isTaxOptimized && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex font-medium items-center gap-1.5 px-3 py-2.5 rounded-full bg-white dark:bg-neutral-950/50 text-sm text-neutral-700 dark:text-neutral-300">
              <span className="text-emerald-500">▲</span> {fmt(Math.round(cumulCashflow))}&nbsp;€ de loyers nets
            </span>
            {pvNette !== 0 && (
              <span className="inline-flex font-medium items-center gap-1.5 px-3 py-2.5 rounded-full bg-white dark:bg-neutral-950/50 text-sm text-neutral-700 dark:text-neutral-300">
                <span className="text-emerald-500">{pvNette >= 0 ? '▲' : '▼'}</span> {pvNette >= 0 ? '+' : ''}{fmt(Math.round(pvNette))}&nbsp;€ de plus-value
              </span>
            )}
          </div>
        )}

        
      </div>
    </div>
  );
}
