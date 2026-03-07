'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { Download } from 'lucide-react';
import useSWR from 'swr';
import axios from 'axios';

import { FinancialOverview } from '@/app/actions/getFinancialOverview';
import MonthSelector from '@/components/finances/MonthSelector';
import CashflowSummary from '@/components/finances/CashflowSummary';
import RevenueTab from '@/components/finances/RevenueTab';
import RentTrackingTab from '@/components/finances/RentTrackingTab';
import ExpensesTab from '@/components/finances/ExpensesTab';
import AnnualView from '@/components/finances/AnnualView';
import QuickAddExpense from '@/components/finances/QuickAddExpense';
import { useCountUp } from '@/hooks/useCountUp';
import { Check } from 'lucide-react';

interface FinancesClientProps {
    initialData: FinancialOverview | null;
    initialMonth: number;
    initialYear: number;
    initialTab: 'revenue' | 'rent' | 'expenses';
    initialMode: 'month' | 'year';
}

const fetcher = (url: string) => axios.get(url).then(r => r.data);

function formatCents(cents: number): string {
    return Math.round(cents / 100).toLocaleString('fr-FR');
}

// ─── KPI Summary Cards (reuses dashboard style) ───────────────

const RevenueKPI: React.FC<{ received: number; expected: number }> = ({ received, expected }) => {
    const animated = useCountUp(Math.round(received / 100), 800);
    const progress = expected > 0 ? (received / expected) * 100 : 0;

    return (
        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-300 dark:border-neutral-800 p-4 snap-center min-w-[200px] shrink-0 md:shrink">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Revenus</p>
            <p className="text-3xl font-semibold text-neutral-900 dark:text-white tabular-nums">
                {animated.toLocaleString('fr-FR')} €
            </p>
            <div className="mt-2 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                sur {formatCents(expected)} € attendus
            </p>
        </div>
    );
};

const RentKPI: React.FC<{ paid: number; total: number; overdue: number }> = ({ paid, total, overdue }) => {
    const progress = total > 0 ? (paid / total) * 100 : 0;
    const allPaid = paid === total && total > 0;

    return (
        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-300 dark:border-neutral-800 p-4 snap-center min-w-[200px] shrink-0 md:shrink">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Loyers</p>
            <div className="flex items-baseline gap-2">
                <p className="text-3xl font-semibold text-neutral-900 dark:text-white tabular-nums">
                    {paid}/{total}
                </p>
                <span className="text-sm text-neutral-400 dark:text-neutral-500">reçus</span>
                {allPaid && <Check size={18} className="text-emerald-500" />}
            </div>
            <div className="mt-2 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                        overdue > 0 ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            {overdue > 0 && (
                <p className="text-xs bg-[#FE3C10] px-3 py-1 rounded-xl text-white mt-1.5 font-medium w-fit">
                    {overdue} en retard
                </p>
            )}
        </div>
    );
};

const ExpenseKPI: React.FC<{ amount: number; onAdd: () => void }> = ({ amount, onAdd }) => {
    const animated = useCountUp(Math.round(amount / 100), 800);

    return (
        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-300 dark:border-neutral-800 p-4 snap-center min-w-[200px] shrink-0 md:shrink">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Dépenses</p>
            <p className="text-3xl font-semibold text-neutral-900 dark:text-white tabular-nums">
                {animated.toLocaleString('fr-FR')} €
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">ce mois</p>
            <button
                onClick={onAdd}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white mt-1 transition"
            >
                + Ajouter
            </button>
        </div>
    );
};

// ─── Tab bar ──────────────────────────────────────────────────

const TABS = [
    { key: 'revenue' as const, label: 'Revenus' },
    { key: 'rent' as const, label: 'Loyers' },
    { key: 'expenses' as const, label: 'Dépenses' },
];

// ─── Main Component ───────────────────────────────────────────

const FinancesClient: React.FC<FinancesClientProps> = ({
    initialData, initialMonth, initialYear, initialTab, initialMode,
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [month, setMonth] = useState(initialMonth);
    const [year, setYear] = useState(initialYear);
    const [mode, setMode] = useState<'month' | 'year'>(initialMode);
    const [activeTab, setActiveTab] = useState<'revenue' | 'rent' | 'expenses'>(initialTab);
    const [showAddExpense, setShowAddExpense] = useState(false);

    // Fetch data when month/year changes
    const { data, mutate } = useSWR<FinancialOverview>(
        `/api/finances?month=${month}&year=${year}`,
        fetcher,
        { fallbackData: initialData || undefined, revalidateOnFocus: false }
    );

    // Fetch annual data when in year mode
    const { data: annualData } = useSWR(
        mode === 'year' ? `/api/finances?year=${year}&annual=true` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    // Update URL params
    const updateParams = useCallback((newMonth: number, newYear: number, newMode?: string, newTab?: string) => {
        const params = new URLSearchParams();
        params.set('month', String(newMonth));
        params.set('year', String(newYear));
        if (newMode && newMode !== 'month') params.set('mode', newMode);
        if (newTab && newTab !== 'revenue') params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [router, pathname]);

    const handleMonthChange = (newMonth: number, newYear: number) => {
        setMonth(newMonth);
        setYear(newYear);
        updateParams(newMonth, newYear, mode, activeTab);
    };

    const handleModeChange = (newMode: 'month' | 'year') => {
        setMode(newMode);
        updateParams(month, year, newMode, activeTab);
    };

    const handleTabChange = (tab: 'revenue' | 'rent' | 'expenses') => {
        setActiveTab(tab);
        updateParams(month, year, mode, tab);
    };

    const handleExport = async (format: 'pdf' | 'csv') => {
        const url = `/api/accounting/export?format=${format}&year=${year}${mode === 'month' ? `&month=${month}` : ''}`;
        window.open(url, '_blank');
    };

    const monthly = data?.monthly;

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-0 pb-20 pt-6 md:pt-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
                    Finances
                </h1>
                <MonthSelector
                    month={month}
                    year={year}
                    mode={mode}
                    onChangeMonth={handleMonthChange}
                    onChangeMode={handleModeChange}
                />
            </div>

            {mode === 'month' ? (
                <>
                    {/* Monthly KPI cards */}
                    {monthly && (
                        <>
                            <div className="flex gap-4 overflow-x-auto snap-x snap-proximity pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible no-scrollbar mb-2">
                                <RevenueKPI received={monthly.receivedRent} expected={monthly.expectedRent} />
                                <RentKPI paid={monthly.paidCount} total={monthly.totalCount} overdue={monthly.overdueCount} />
                                <ExpenseKPI amount={monthly.expenses} onAdd={() => setShowAddExpense(true)} />
                            </div>

                            <CashflowSummary cashflow={monthly.cashflow} />
                        </>
                    )}

                    {/* Tabs */}
                    <div className="border-b border-neutral-200 dark:border-neutral-700 mt-4 mb-6">
                        <div className="flex gap-6">
                            {TABS.map(tab => {
                                const isActive = activeTab === tab.key;
                                let count: number | undefined;
                                if (tab.key === 'rent' && monthly && monthly.overdueCount > 0) count = monthly.overdueCount;
                                if (tab.key === 'expenses' && data?.expenses.length) count = data.expenses.length;

                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => handleTabChange(tab.key)}
                                        className={`pb-3 text-sm font-medium transition relative ${
                                            isActive
                                                ? 'text-neutral-900 dark:text-white'
                                                : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600'
                                        }`}
                                    >
                                        {tab.label}
                                        {count !== undefined && (
                                            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                                                tab.key === 'rent'
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                                            }`}>
                                                {count}
                                            </span>
                                        )}
                                        {isActive && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab content */}
                    <div>
                        {activeTab === 'revenue' && data && (
                            <RevenueTab data={data.revenueByProperty} />
                        )}
                        {activeTab === 'rent' && data && (
                            <RentTrackingTab data={data.rentTracking} />
                        )}
                        {activeTab === 'expenses' && data && (
                            <ExpensesTab
                                data={data.expenses}
                                properties={data.properties}
                                onAddExpense={() => setShowAddExpense(true)}
                            />
                        )}
                    </div>
                </>
            ) : (
                /* Annual view */
                annualData?.annual ? (
                    <AnnualView data={annualData.annual} year={year} />
                ) : (
                    <div className="text-center py-12 text-neutral-400">Chargement...</div>
                )
            )}

            {/* Export buttons */}
            <div className="flex gap-3 mt-8 justify-center">
                <button
                    onClick={() => handleExport('pdf')}
                    className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                >
                    <Download size={16} />
                    Exporter PDF
                </button>
                <button
                    onClick={() => handleExport('csv')}
                    className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                >
                    <Download size={16} />
                    Exporter CSV
                </button>
            </div>

            {/* Quick add expense modal */}
            {data && (
                <QuickAddExpense
                    properties={data.properties}
                    isOpen={showAddExpense}
                    onClose={() => setShowAddExpense(false)}
                    onExpenseAdded={() => mutate()}
                />
            )}
        </div>
    );
};

export default FinancesClient;
