'use client';

import { RentTrackingProperty } from '@/app/actions/getRentTracking';
import TenantLine, { TenantLineData } from './TenantLine';

interface PropertyGroupProps {
  property: RentTrackingProperty;
  onTenantTap: (tenant: TenantLineData) => void;
}

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function PropertyGroup({ property, onTenantTap }: PropertyGroupProps) {
  const isColoc = property.isColocation || property.tenants.length > 1;
  const progress =
    property.totalExpected > 0
      ? Math.min((property.totalReceived / property.totalExpected) * 100, 100)
      : 0;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all">
      {/* Property header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {property.name}
              </p>
              {isColoc && (
                <span className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full">
                  Colocation
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">{property.address}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <p className="text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
              {formatAmount(property.totalReceived)}{' '}
              <span className="text-neutral-400 font-normal">
                / {formatAmount(property.totalExpected)} €
              </span>
            </p>
          </div>
        </div>

        {/* Progress bar for colocs */}
        {isColoc && (
          <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-2.5">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-emerald-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Tenant lines */}
      <div className="px-3 pb-2 divide-y divide-neutral-50 dark:divide-neutral-800">
        {property.tenants.map((tenant) => (
          <TenantLine
            key={tenant.id}
            tenant={{
              ...tenant,
              propertyName: property.name,
              propertyAddress: property.address,
            }}
            onTap={onTenantTap}
          />
        ))}
      </div>
    </div>
  );
}
