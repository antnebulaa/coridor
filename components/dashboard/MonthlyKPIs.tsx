'use client';

import { Check } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { MonthlyKPIs as MonthlyKPIsType } from '@/app/actions/getOperationalStats';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';

interface MonthlyKPIsProps {
    data: MonthlyKPIsType;
    firstListingId?: string;
}

function formatCents(cents: number): string {
    const euros = Math.round(cents / 100);
    return euros.toLocaleString('fr-FR');
}

const cardClass = "bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-3 snap-center min-w-[170px] shrink-0 md:shrink hover:border-neutral-400 dark:hover:border-neutral-600 transition-all active:scale-[0.97]";

const RentsCard: React.FC<{ paid: number; total: number; hasOverdue: boolean }> = ({ paid, total, hasOverdue }) => {
    const [barWidth, setBarWidth] = useState(0);
    const progress = total > 0 ? paid / total : 0;

    useEffect(() => {
        const timer = setTimeout(() => setBarWidth(progress * 100), 100);
        return () => clearTimeout(timer);
    }, [progress]);

    const allPaid = paid === total && total > 0;

    return (
        <Link href="/rentals" className={cardClass}>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">Loyers</p>
            <div className="flex items-baseline gap-2">
                <p className="text-3xl font-medium text-neutral-900 dark:text-white tabular-nums">
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
                <p className="text-xs bg-[#FE3C10] px-3 py-1 rounded-xl text-white mt-1.5 font-medium w-fit">
                    {total - paid} loyers retard
                </p>
            )}
        </Link>
    );
};

const ExpensesCard: React.FC<{ amount: number; listingId?: string }> = ({ amount, listingId }) => {
    const animatedValue = useCountUp(Math.round(amount / 100), 800);
    const href = listingId ? `/properties/${listingId}/expenses` : '/properties';

    return (
        <Link href={href} className={cardClass}>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">Dépenses</p>
            <p className="text-3xl font-medium text-neutral-900 dark:text-white tabular-nums">
                {animatedValue.toLocaleString('fr-FR')} €
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                ce mois
            </p>
        </Link>
    );
};

const MonthlyKPIs: React.FC<MonthlyKPIsProps> = ({ data, firstListingId }) => {
    const hasOverdue = data.paidCount < data.totalCount && data.totalCount > 0;
    const animatedRevenue = useCountUp(Math.round(data.receivedRent / 100), 800);
    const now = new Date();
    const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-4">
            {/* Revenue — big number above cards */}
            <div className='ml-3'>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                    Revenus {monthLabel}
                </p>
                <p className="text-5xl font-normal text-neutral-900 dark:text-white tabular-nums mt-1">
                    {animatedRevenue.toLocaleString('fr-FR')} €
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-500 mt-0.5">
                    sur {formatCents(data.expectedRent)} € attendus
                </p>
            </div>

            {/* Cards — 2 columns */}
            <div className="flex gap-4 overflow-x-auto snap-x snap-proximity pb-1 -mx-4 px-4 md:grid md:grid-cols-2 md:overflow-visible no-scrollbar">
                <RentsCard paid={data.paidCount} total={data.totalCount} hasOverdue={hasOverdue} />
                <ExpensesCard amount={data.monthlyExpenses} listingId={firstListingId} />
            </div>
        </div>
    );
};

export default MonthlyKPIs;
