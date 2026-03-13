'use client';

import { useState, useMemo, useCallback } from 'react';
import { Info, Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import {
    Droplets, Flame, Zap, Building, Gauge, Layers,
    Building2, Wrench, UserCheck, HelpCircle
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    COLD_WATER: Droplets,
    HOT_WATER: Flame,
    ELECTRICITY_COMMON: Zap,
    HEATING_COLLECTIVE: Flame,
    METERS: Gauge,
    GENERAL_CHARGES: Layers,
    BUILDING_CHARGES: Building2,
    ELEVATOR: Building,
    MAINTENANCE: Wrench,
    CARETAKER: UserCheck,
};

interface ExpenseReviewStepProps {
    expenses: any[];
    totalProvisionsCents: number;
    onContinue: (includedExpenseIds: string[], newTotalCents: number, newBalanceCents: number) => void;
    onBack: () => void;
}

function formatAmount(cents: number): string {
    return (cents / 100).toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) + ' €';
}

const ExpenseReviewStep: React.FC<ExpenseReviewStepProps> = ({
    expenses,
    totalProvisionsCents,
    onContinue,
    onBack,
}) => {
    const t = useTranslations('regularization');
    const locale = useLocale();
    const dateLocale = locale === 'fr' ? fr : enUS;

    // Track which expenses are included (all included by default)
    const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

    const toggleExpense = useCallback((id: string) => {
        setExcludedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // Compute totals in real-time
    const { includedCount, includedTotal, newBalance, includedIds } = useMemo(() => {
        let total = 0;
        const ids: string[] = [];
        for (const exp of expenses) {
            if (!excludedIds.has(exp.id)) {
                const amount = exp.amountRecoverableCents ?? Math.round(exp.amountTotalCents * (exp.recoverableRatio || 1.0));
                total += amount;
                ids.push(exp.id);
            }
        }
        return {
            includedCount: ids.length,
            includedTotal: total,
            newBalance: total - totalProvisionsCents,
            includedIds: ids,
        };
    }, [expenses, excludedIds, totalProvisionsCents]);

    return (
        <div className="flex flex-col h-full">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                <h2 className="text-[22px] font-semibold text-neutral-900 dark:text-white mb-1">
                    {t('expenses.title')}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                    {t('expenses.subtitle')}
                </p>

                {/* Expense list */}
                <div className="flex flex-col gap-1">
                    {expenses.map((expense) => {
                        const isExcluded = excludedIds.has(expense.id);
                        const Icon = CATEGORY_ICONS[expense.category] || HelpCircle;
                        const amount = expense.amountRecoverableCents ?? Math.round(expense.amountTotalCents * (expense.recoverableRatio || 1.0));

                        return (
                            <button
                                key={expense.id}
                                onClick={() => toggleExpense(expense.id)}
                                className={`
                                    w-full flex items-center gap-3 py-3 px-2 rounded-lg transition cursor-pointer text-left
                                    hover:bg-neutral-50 dark:hover:bg-neutral-800/50
                                    ${isExcluded ? 'opacity-50' : ''}
                                `}
                            >
                                {/* Checkbox */}
                                <div className={`
                                    w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition
                                    ${isExcluded
                                        ? 'border-neutral-300 dark:border-neutral-600 bg-transparent'
                                        : 'border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white'
                                    }
                                `}>
                                    {!isExcluded && (
                                        <Check size={12} className="text-white dark:text-neutral-900" strokeWidth={3} />
                                    )}
                                </div>

                                {/* Icon */}
                                <Icon size={18} className="text-neutral-500 dark:text-neutral-400 shrink-0" />

                                {/* Label + date */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isExcluded ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-white'}`}>
                                        {expense.label}
                                    </p>
                                    <p className="text-sm text-neutral-400 dark:text-neutral-500">
                                        {format(new Date(expense.dateOccurred), 'dd MMM yyyy', { locale: dateLocale })}
                                    </p>
                                </div>

                                {/* Amount */}
                                <span className={`text-sm font-medium whitespace-nowrap ${isExcluded ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-900 dark:text-white'}`}>
                                    {formatAmount(amount)}
                                </span>
                            </button>
                        );
                    })}

                    {expenses.length === 0 && (
                        <div className="py-12 text-center text-neutral-400 text-sm">
                            {t('expenses.empty')}
                        </div>
                    )}
                </div>

                {/* Info card */}
                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 mt-4">
                    <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        {t('expenses.missingInfo')}
                    </p>
                </div>
            </div>

            {/* Sticky summary */}
            <div className="border-t border-neutral-200 dark:border-neutral-700 px-6 py-4 bg-white dark:bg-neutral-900">
                <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-neutral-500 dark:text-neutral-400">
                        {t('expenses.includedCount', { count: includedCount })}
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-white">
                        {formatAmount(includedTotal)}
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-neutral-500 dark:text-neutral-400">
                        {t('expenses.newBalance')}
                    </span>
                    <span className={`font-semibold ${newBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {newBalance > 0 ? '+' : ''}{formatAmount(newBalance)}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
                    >
                        {t('guide.back')}
                    </button>

                    <button
                        onClick={() => onContinue(includedIds, includedTotal, newBalance)}
                        className="
                            bg-neutral-900 dark:bg-white
                            text-white dark:text-neutral-900
                            text-base font-medium
                            rounded-xl py-3 px-6
                            hover:opacity-90 transition
                            cursor-pointer
                        "
                    >
                        {t('expenses.continue')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpenseReviewStep;
