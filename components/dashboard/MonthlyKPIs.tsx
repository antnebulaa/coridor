'use client';

import { Check } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { MonthlyKPIs as MonthlyKPIsType } from '@/app/actions/getOperationalStats';
import { useEffect, useState } from 'react';

interface MonthlyKPIsProps {
    data: MonthlyKPIsType;
}

function formatCents(cents: number): string {
    const euros = Math.round(cents / 100);
    return euros.toLocaleString('fr-FR');
}

const RevenueCard: React.FC<{ received: number; expected: number }> = ({ received, expected }) => {
    const animatedValue = useCountUp(Math.round(received / 100), 800);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm p-5 snap-center min-w-[200px] shrink-0 md:shrink">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Revenus</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
                {animatedValue.toLocaleString('fr-FR')} €
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                sur {formatCents(expected)} € attendus
            </p>
        </div>
    );
};

const RentsCard: React.FC<{ paid: number; total: number; hasOverdue: boolean }> = ({ paid, total, hasOverdue }) => {
    const [barWidth, setBarWidth] = useState(0);
    const progress = total > 0 ? paid / total : 0;

    useEffect(() => {
        const timer = setTimeout(() => setBarWidth(progress * 100), 100);
        return () => clearTimeout(timer);
    }, [progress]);

    const allPaid = paid === total && total > 0;

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm p-5 snap-center min-w-[200px] shrink-0 md:shrink">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Loyers</p>
            <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
                    {paid}/{total}
                </p>
                <span className="text-sm text-neutral-400 dark:text-neutral-500">reçus</span>
                {allPaid && <Check size={18} className="text-emerald-500" />}
            </div>
            <div className="mt-3 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                        hasOverdue ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                />
            </div>
            {hasOverdue && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">
                    {total - paid} en retard
                </p>
            )}
        </div>
    );
};

const ExpensesCard: React.FC<{ amount: number }> = ({ amount }) => {
    const animatedValue = useCountUp(Math.round(amount / 100), 800);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm p-5 snap-center min-w-[200px] shrink-0 md:shrink">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Dépenses</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
                {animatedValue.toLocaleString('fr-FR')} €
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                ce mois
            </p>
        </div>
    );
};

const MonthlyKPIs: React.FC<MonthlyKPIsProps> = ({ data }) => {
    const hasOverdue = data.paidCount < data.totalCount && data.totalCount > 0;

    return (
        <div className="flex gap-4 overflow-x-auto snap-x snap-proximity pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible no-scrollbar">
            <RevenueCard received={data.receivedRent} expected={data.expectedRent} />
            <RentsCard paid={data.paidCount} total={data.totalCount} hasOverdue={hasOverdue} />
            <ExpensesCard amount={data.monthlyExpenses} />
        </div>
    );
};

export default MonthlyKPIs;
