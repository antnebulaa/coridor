'use client';

import { ChevronRight } from 'lucide-react';
import StatusPill from './StatusPill';

export interface TenantLineData {
  id: string;
  name: string;
  expected: number;       // in cents
  received: number;       // in cents
  remaining: number;      // in cents
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
  daysLate: number | null;
  paidDate: string | null;
  rentTrackingId: string;
  conversationId: string | null;
  propertyName?: string;
  propertyAddress?: string;
}

interface TenantLineProps {
  tenant: TenantLineData;
  onTap: (tenant: TenantLineData) => void;
}

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function TenantLine({ tenant, onTap }: TenantLineProps) {
  return (
    <button
      onClick={() => onTap(tenant)}
      className="w-full flex items-center gap-3 py-3 px-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-xl transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {tenant.name}
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
  );
}
