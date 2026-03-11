'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PropertyTimeline from './PropertyTimeline';
import { PropertyOccupation } from '@/lib/finances/types';

interface PropertyCostSectionProps {
  properties: PropertyOccupation[];
  year: number;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.abs(Math.round(cents / 100)));

const fmtSigned = (cents: number) => {
  const abs = fmt(cents);
  return cents >= 0 ? `+${abs} €` : `−${abs} €`;
};

const PropertyCostSection: React.FC<PropertyCostSectionProps> = ({
  properties,
  year,
}) => {
  const [expanded, setExpanded] = useState(false);
  const visibleProperties = expanded ? properties : properties.slice(0, 3);
  const hiddenCount = properties.length - 3;

  // Determine current month index for the selected year
  const now = new Date();
  const currentMonth =
    year === now.getFullYear() ? now.getMonth() : year < now.getFullYear() ? 11 : -1;

  return (
    <div>
      <div className="mb-2">
        <p className="text-sm text-neutral-400 uppercase tracking-wider font-semibold">
          Vos biens en {year}
        </p>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
          Chaque mois : ce qu&apos;il a rapporté ou coûté
        </p>
      </div>

      <div className="space-y-2.5">
        {visibleProperties.map((property, index) => (
          <div
            key={property.id}
            className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4"
            style={{ animation: `fadeIn 400ms ${index * 80}ms both` }}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {property.title}
                  </p>
                  {property.isVacant && (
                    <span className="text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-full shrink-0">
                      Vacant
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-sm text-neutral-400 dark:text-neutral-500">
                    {property.address}
                  </span>
                  {property.tenantName && (
                    <span className="text-sm text-neutral-400 dark:text-neutral-500">
                      · {property.tenantName}
                    </span>
                  )}
                  {property.leaseMonthsRemaining != null &&
                    property.leaseMonthsRemaining <= 6 && (
                      <span
                        className={`text-sm font-medium px-1.5 py-0.5 rounded-full ${
                          property.leaseMonthsRemaining <= 3
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}
                      >
                        Bail → {property.leaseEndDate
                          ? new Date(property.leaseEndDate).toLocaleDateString('fr-FR', {
                              month: 'short',
                              year: 'numeric',
                            })
                          : `${property.leaseMonthsRemaining} mois`}
                      </span>
                    )}
                </div>
              </div>
              <span
                className={`text-sm font-bold tabular-nums shrink-0 ml-3 ${
                  property.annualResult >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                {fmtSigned(property.annualResult)}
              </span>
            </div>

            <PropertyTimeline
              months={property.monthlyTimeline}
              currentMonth={currentMonth}
            />
          </div>
        ))}

        {/* Show more / link */}
        {properties.length > 3 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full py-3 text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:border-neutral-200 dark:hover:border-neutral-700"
          >
            {expanded ? (
              <span className="inline-flex items-center gap-1">
                Réduire <ChevronUp className="w-4 h-4" />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                + {hiddenCount} autre{hiddenCount > 1 ? 's' : ''} bien
                {hiddenCount > 1 ? 's' : ''} <ChevronDown className="w-4 h-4" />
              </span>
            )}
          </button>
        )}

        {properties.length <= 3 && properties.length > 0 && (
          <Link
            href="/properties"
            className="block w-full py-3 text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:border-neutral-200 dark:hover:border-neutral-700"
          >
            Voir tous les biens &rarr;
          </Link>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default PropertyCostSection;
