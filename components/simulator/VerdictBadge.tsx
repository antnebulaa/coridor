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
    icon: <AlertTriangle size={16} />,
    label: 'Investissement correct',
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-700 dark:text-amber-300',
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

export function VerdictBadge({ result, input }: VerdictBadgeProps) {
  const pill = VERDICT_PILL[result.verdict];
  const lastYear = result.yearlyProjection[result.yearlyProjection.length - 1];
  const targetYear = new Date().getFullYear() + input.projectionYears;

  // Determine headline
  const isTaxOptimized = result.verdict === 'TAX_OPTIMIZED';
  const isPositive = lastYear && lastYear.netWealth > 0;
  const headlineAmount = isTaxOptimized
    ? Math.abs(result.taxDifference)
    : lastYear?.totalGain ?? lastYear?.netWealth ?? 0;

  const animatedAmount = useCountUp(Math.abs(Math.round(headlineAmount)), 900);
  const fmt = (n: number) => n.toLocaleString('fr-FR');

  return (
    <div className="text-center space-y-4">
      {/* Master headline */}
      <h2
        className="text-2xl sm:text-3xl md:text-4xl text-neutral-900 dark:text-white leading-tight"
        style={{ fontFamily: 'var(--font-serif-sim), serif' }}
      >
        {isPositive || isTaxOptimized ? (
          <>
            En {targetYear}, cet investissement vous aura{' '}
            {isTaxOptimized ? 'économisé' : 'enrichi'} de{' '}
            <span className="text-(--sim-amber-500) tabular-nums">
              {fmt(animatedAmount)}&nbsp;€
            </span>
          </>
        ) : (
          <>
            Attention : cet investissement nécessite une analyse approfondie.
          </>
        )}
      </h2>

      {/* Badge pill + animated check */}
      <div className="flex items-center justify-center gap-3">
        {/* Animated SVG check */}
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

        {/* Pill */}
        <span
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${pill.bg} ${pill.text}`}
        >
          {pill.icon}
          {pill.label}
        </span>
      </div>

      {/* Sub-detail */}
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
        {result.verdictMessage}
      </p>
    </div>
  );
}
