'use client';

interface MetricRowProps {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  good?: boolean;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, sub, trend, good }) => {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-neutral-800 dark:text-neutral-400">{label}</p>
        {sub && (
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-0.5 leading-tight">{sub}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span className="text-base font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
          {value}
        </span>
        {trend && (
          <span
            className={`text-sm font-normal px-2 py-0.5 rounded-full ${
              good
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricRow;
