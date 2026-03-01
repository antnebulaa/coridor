'use client';

interface YearSliderProps {
  startYear: number;
  endYear: number;
  selectedYear: number;
  onYearChange: (year: number) => void;
  theme?: 'light' | 'dark';
}

export function YearSlider({
  startYear,
  endYear,
  selectedYear,
  onYearChange,
  theme = 'light',
}: YearSliderProps) {
  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  const isDark = theme === 'dark';

  return (
    <>
      {/* Desktop — slider dots */}
      <div className="hidden md:block">
        <div className="relative flex items-center justify-between px-2">
          {/* Line connecting dots */}
          <div
            className={`absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 ${
              isDark ? 'bg-white/20' : 'bg-neutral-200 dark:bg-neutral-700'
            }`}
          />

          {years.map((y) => {
            const isSelected = y === selectedYear;
            return (
              <button
                key={y}
                type="button"
                onClick={() => onYearChange(y)}
                className="relative flex flex-col items-center gap-1.5 z-10"
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    isSelected
                      ? 'bg-(--sim-amber-400) border-(--sim-amber-400) scale-125'
                      : isDark
                        ? 'bg-white/10 border-white/30 hover:border-(--sim-amber-400)'
                        : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 hover:border-(--sim-amber-400)'
                  }`}
                />
                <span
                  className={`text-[10px] transition-colors tabular-nums ${
                    isSelected
                      ? 'text-(--sim-amber-500) font-semibold'
                      : isDark
                        ? 'text-white/40'
                        : 'text-neutral-400'
                  }`}
                >
                  {y}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile — select dropdown */}
      <div className="md:hidden">
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className={`w-full rounded-xl border px-4 py-3 text-sm tabular-nums ${
            isDark
              ? 'border-white/20 bg-white/10 text-white'
              : 'border-neutral-200 dark:border-neutral-700 bg-(--sim-bg-card)'
          }`}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              Année {y - startYear + 1} ({y})
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
