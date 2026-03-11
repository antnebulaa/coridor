'use client';

import { useState } from 'react';
import { PropertyMonthData } from '@/lib/finances/types';

interface PropertyTimelineProps {
  months: PropertyMonthData[];
  currentMonth?: number; // 0-11 (current month index for the selected year)
}

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const fmt = (cents: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.abs(Math.round(cents / 100)));

const PropertyTimeline: React.FC<PropertyTimelineProps> = ({
  months,
  currentMonth = -1,
}) => {
  const [selected, setSelected] = useState<number | null>(
    currentMonth >= 0 ? currentMonth : null
  );

  return (
    <div className="mt-2.5">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {months.map((m, i) => {
          const isFuture = currentMonth >= 0 && i > currentMonth;
          const hasRevenue = m.revenue > 0;
          const isSelected = selected === i;

          return (
            <button
              key={i}
              onClick={() => setSelected(isSelected ? null : i)}
              disabled={isFuture}
              className={`shrink-0 w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all duration-200 relative ${
                isFuture
                  ? 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-300 dark:text-neutral-600 cursor-default'
                  : hasRevenue
                    ? isSelected
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/40'
                    : isSelected
                      ? 'bg-red-400 text-white'
                      : 'bg-red-50 dark:bg-red-950/30 text-red-400 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
              }`}
            >
              {MONTH_LABELS[i]}
              {i === currentMonth && (
                <span className="absolute inset-0 rounded-xl ring-2 ring-neutral-900 dark:ring-neutral-100 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {selected !== null && !(currentMonth >= 0 && selected > currentMonth) && (
        <div className="mt-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl px-3 py-2.5 animate-[fadeIn_200ms_ease-out_forwards]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {MONTH_NAMES[selected]}
              {selected === currentMonth && (
                <span className="ml-1.5 text-sm font-semibold text-neutral-400 dark:text-neutral-500">
                  · En cours
                </span>
              )}
            </span>
            {months[selected].revenue > 0 ? (
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{fmt(months[selected].revenue)} €
              </span>
            ) : (
              <span className="text-sm font-bold text-red-500 dark:text-red-400 tabular-nums">
                −{fmt(months[selected].cost)} €
              </span>
            )}
          </div>
          {months[selected].revenue > 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
              Loyer encaissé
            </p>
          ) : months[selected].cost > 0 ? (
            <p className="text-sm text-red-400 dark:text-red-400 mt-0.5">
              Loyer perdu : {fmt(months[selected].lostRent)} € + charges fixes : {fmt(months[selected].fixedCosts)} €
            </p>
          ) : (
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
              Aucun mouvement
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyTimeline;
