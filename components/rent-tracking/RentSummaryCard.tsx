'use client';

import { useCountUp } from '@/hooks/useCountUp';
import { RentTrackingSummary } from '@/app/actions/getRentTracking';

interface RentSummaryCardProps {
  summary: RentTrackingSummary;
  animated?: boolean;
}

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function RentSummaryCard({ summary, animated = true }: RentSummaryCardProps) {
  const animatedReceived = useCountUp(
    Math.round(summary.totalReceived / 100),
    800,
    animated,
  );

  const progress =
    summary.totalExpected > 0
      ? Math.min((summary.totalReceived / summary.totalExpected) * 100, 100)
      : 0;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm p-5">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
            Encaissé
          </p>
          <p className="text-[28px] font-extrabold text-neutral-900 dark:text-neutral-100 tabular-nums tracking-tight leading-none mt-1">
            {animated
              ? animatedReceived.toLocaleString('fr-FR')
              : formatAmount(summary.totalReceived)}{' '}
            €
          </p>
          <p className="text-sm text-neutral-400 mt-1">
            sur {formatAmount(summary.totalExpected)} €
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {summary.paidCount > 0 && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
              {summary.paidCount} payé{summary.paidCount > 1 ? 's' : ''}
            </span>
          )}
          {summary.partialCount > 0 && (
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
              {summary.partialCount} partiel{summary.partialCount > 1 ? 's' : ''}
            </span>
          )}
          {summary.overdueCount > 0 && (
            <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
              {summary.overdueCount} retard{summary.overdueCount > 1 ? 's' : ''}
            </span>
          )}
          {summary.pendingCount > 0 && (
            <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
              {summary.pendingCount} en attente
            </span>
          )}
        </div>
      </div>
      {/* Progress bar: ALWAYS green */}
      <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
