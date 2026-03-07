'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
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

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Navigation */}
            <div className="flex items-center gap-2">
                <button
                    onClick={goBack}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                    <ChevronLeft size={20} className="text-neutral-600 dark:text-neutral-400" />
                </button>

                <span className="text-lg font-semibold text-neutral-900 dark:text-white min-w-[160px] text-center tabular-nums">
                    {mode === 'month'
                        ? `${MONTH_NAMES[month - 1]} ${year}`
                        : `${year}`
                    }
                </span>

                <button
                    onClick={goForward}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                    <ChevronRight size={20} className="text-neutral-600 dark:text-neutral-400" />
                </button>
            </div>

            {/* Current month indicator */}
            {mode === 'month' && !isCurrentMonth && (
                <button
                    onClick={goToCurrent}
                    className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
                >
                    Voir le mois en cours →
                </button>
            )}
            {mode === 'month' && isCurrentMonth && (
                <span className="text-xs text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Mois en cours
                </span>
            )}
            {mode === 'year' && !isCurrentYear && (
                <button
                    onClick={goToCurrent}
                    className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
                >
                    Voir l'année en cours →
                </button>
            )}

            {/* Mode toggle */}
            <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 ml-auto sm:ml-0">
                <button
                    onClick={() => onChangeMode('month')}
                    className={`px-3 py-1 text-sm rounded-md transition font-medium ${
                        mode === 'month'
                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'
                    }`}
                >
                    Mois
                </button>
                <button
                    onClick={() => onChangeMode('year')}
                    className={`px-3 py-1 text-sm rounded-md transition font-medium ${
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
