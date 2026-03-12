'use client';

interface StatusPillProps {
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
  daysLate?: number | null;
}

const STATUS_CONFIG = {
  OVERDUE: { bg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  PARTIAL: { bg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  PENDING: { bg: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' },
  PAID: { bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
} as const;

function getLabel(status: StatusPillProps['status'], daysLate?: number | null): string {
  switch (status) {
    case 'OVERDUE':
      return daysLate ? `${daysLate}j de retard` : 'En retard';
    case 'PARTIAL':
      return 'Partiel';
    case 'PENDING':
      return 'En attente';
    case 'PAID':
      return 'Payé';
  }
}

export default function StatusPill({ status, daysLate }: StatusPillProps) {
  const config = STATUS_CONFIG[status];
  const label = getLabel(status, daysLate);

  return (
    <span
      className={`${config.bg} text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap`}
    >
      {label}
    </span>
  );
}
