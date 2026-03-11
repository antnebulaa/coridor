'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';

interface FinancesHeaderProps {
  year: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  onExport: (format: 'pdf' | 'csv') => void;
}

const FinancesHeader: React.FC<FinancesHeaderProps> = ({
  year,
  availableYears,
  onYearChange,
  onExport,
}) => {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div>
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-neutral-900 dark:text-white">
          Finances
        </h1>
        <div className="relative">
          <button
            onClick={() => setExportOpen(v => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-3 py-2 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
          {exportOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setExportOpen(false)}
              />
              <div className="absolute right-0 mt-1 z-20 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden min-w-[140px]">
                <button
                  onClick={() => {
                    onExport('pdf');
                    setExportOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => {
                    onExport('csv');
                    setExportOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border-t border-neutral-100 dark:border-neutral-800"
                >
                  Export CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Year pills */}
      <div className="flex items-center gap-2 mt-4">
        {availableYears.map(y => (
          <button
            key={y}
            onClick={() => onYearChange(y)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              y === year
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FinancesHeader;
