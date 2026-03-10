'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_SHORT = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
    'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
];

interface MonthSelectorProps {
    month: number;
    year: number;
    mode: 'month' | 'year';
    onChangeMonth: (month: number, year: number) => void;
    onChangeMode: (mode: 'month' | 'year') => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({
    month, year, mode, onChangeMonth, onChangeMode,
}) => {
    const now = new Date();
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
    const isCurrentYear = year === now.getFullYear();

    const goBack = () => {
        if (mode === 'month') {
            if (month === 1) onChangeMonth(12, year - 1);
            else onChangeMonth(month - 1, year);
        } else {
            onChangeMonth(month, year - 1);
        }
    };

    const goForward = () => {
        if (mode === 'month') {
            if (month === 12) onChangeMonth(1, year + 1);
            else onChangeMonth(month + 1, year);
        } else {
            onChangeMonth(month, year + 1);
        }
    };

    const goToCurrent = () => {
        onChangeMonth(now.getMonth() + 1, now.getFullYear());
    };

    const isCurrent = mode === 'month' ? isCurrentMonth : isCurrentYear;

    return (
        <div className="flex items-center justify-between gap-3 w-full">
            {/* Left: navigation */}
            <div className="flex items-center gap-1">
                <button
                    onClick={goBack}
                    className="w-8 h-8 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors"
                >
                    <ChevronLeft size={20} className="text-neutral-600 dark:text-neutral-400" />
                </button>

                <span className="text-base font-bold text-neutral-900 dark:text-white min-w-[90px] text-center tabular-nums">
                    {mode === 'month'
                        ? `${MONTH_SHORT[month - 1]} ${year}`
                        : `${year}`
                    }
                </span>

                <button
                    onClick={goForward}
                    className="w-8 h-8 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors"
                >
                    <ChevronRight size={20} className="text-neutral-600 dark:text-neutral-400" />
                </button>

                {/* Current indicator / back link */}
                {isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />
                ) : (
                    <button
                        onClick={goToCurrent}
                        className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors ml-1 whitespace-nowrap"
                    >
                        ↩
                    </button>
                )}
            </div>

            {/* Right: mode toggle */}
            <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-full p-0.5 shrink-0">
                <button
                    onClick={() => onChangeMode('month')}
                    className={`px-3 py-1 text-sm rounded-full transition-all duration-200 font-medium ${
                        mode === 'month'
                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'
                    }`}
                >
                    Mois
                </button>
                <button
                    onClick={() => onChangeMode('year')}
                    className={`px-3 py-1 text-sm rounded-full transition-all duration-200 font-medium ${
                        mode === 'year'
                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'
                    }`}
                >
                    Année
                </button>
            </div>
        </div>
    );
};

export default MonthSelector;
