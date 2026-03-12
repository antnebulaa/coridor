'use client';

import { ChevronRight } from 'lucide-react';
import { RentTrackingProperty } from '@/app/actions/getRentTracking';
import StatusPill from './StatusPill';
import { TenantLineData } from './TenantLine';

interface FlatListViewProps {
  properties: RentTrackingProperty[];
  onTenantTap: (tenant: TenantLineData) => void;
}

const STATUS_SORT_ORDER = {
  OVERDUE: 0,
  PARTIAL: 1,
  PENDING: 2,
  PAID: 3,
} as const;

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function FlatListView({ properties, onTenantTap }: FlatListViewProps) {
  const allTenants: TenantLineData[] = properties.flatMap((p) =>
    p.tenants.map((t) => ({
      ...t,
      propertyName: p.name,
      propertyAddress: p.address,
    })),
  );

  const sorted = [...allTenants].sort(
    (a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status],
  );

  return (
    <div className="space-y-1.5">
      {sorted.map((tenant) => (
        <button
          key={tenant.rentTrackingId}
          onClick={() => onTenantTap(tenant)}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all hover:border-neutral-300 dark:hover:border-neutral-700 active:scale-[0.99] text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {tenant.name}
            </p>
            <p className="text-[10px] text-neutral-400 truncate mt-0.5">
              {tenant.propertyName}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="text-right">
              {tenant.status === 'PAID' ? (
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatAmount(tenant.received)} €
                </p>
              ) : tenant.status === 'PARTIAL' ? (
                <div>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                    Reste {formatAmount(tenant.remaining)} €
                  </p>
                  <p className="text-[10px] text-neutral-400 tabular-nums">
                    sur {formatAmount(tenant.expected)} €
                  </p>
                </div>
              ) : (
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {formatAmount(tenant.expected)} €
                </p>
              )}
            </div>
            <StatusPill status={tenant.status} daysLate={tenant.daysLate} />
            <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600" />
          </div>
        </button>
      ))}
    </div>
  );
}
