'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthNavProps {
  month: number; // 1-12
  year: number;
  onChange: (month: number, year: number) => void;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function MonthNav({ month, year, onChange }: MonthNavProps) {
  const now = new Date();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const handlePrev = () => {
    if (month === 1) {
      onChange(12, year - 1);
    } else {
      onChange(month - 1, year);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      onChange(1, year + 1);
    } else {
      onChange(month + 1, year);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={handlePrev}
        aria-label="Mois précédent"
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <ChevronLeft size={18} className="text-neutral-700 dark:text-neutral-300" />
      </button>
      <div className="text-center">
        <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          {MONTHS[month - 1]} {year}
        </p>
        {isCurrentMonth && (
          <span className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Mois en cours
            </span>
          </span>
        )}
      </div>
      <button
        onClick={handleNext}
        aria-label="Mois suivant"
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <ChevronRight size={18} className="text-neutral-700 dark:text-neutral-300" />
      </button>
    </div>
  );
}
