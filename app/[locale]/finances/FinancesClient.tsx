'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { Download } from 'lucide-react';
import useSWR from 'swr';
import axios from 'axios';

import { FinancialOverview } from '@/app/actions/getFinancialOverview';
import MonthSelector from '@/components/finances/MonthSelector';
import KPICard from '@/components/finances/CashflowSummary';
import RevenueTab from '@/components/finances/RevenueTab';
import RentTrackingTab from '@/components/finances/RentTrackingTab';
import ExpensesTab from '@/components/finances/ExpensesTab';
import AnnualView from '@/components/finances/AnnualView';

interface FinancesClientProps {
    initialData: FinancialOverview | null;
    initialMonth: number;
    initialYear: number;
    initialTab: 'revenue' | 'rent' | 'expenses';
    initialMode: 'month' | 'year';
}

const fetcher = (url: string) => axios.get(url).then(r => r.data);

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

    const [month, setMonth] = useState(initialMonth);
    const [year, setYear] = useState(initialYear);
    const [mode, setMode] = useState<'month' | 'year'>(initialMode);
    const [activeTab, setActiveTab] = useState<'revenue' | 'rent' | 'expenses'>(initialTab);

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

    const handleAddExpense = useCallback((listingId?: string) => {
        const properties = data?.properties || [];
        const target = listingId || properties.find(p => p.listingId)?.listingId;
        if (target) {
            router.push(`/properties/${target}/expenses`);
        }
    }, [data?.properties, router]);

    const handleExport = (format: 'pdf' | 'csv') => {
        const url = `/api/accounting/export?format=${format}&year=${year}${mode === 'month' ? `&month=${month}` : ''}`;
        window.open(url, '_blank');
    };

    const monthly = data?.monthly;

    // Compute recoverable and deductible totals for KPI card
    const recoverableAmount = (data?.expenses || [])
        .filter(e => e.isRecoverable)
        .reduce((s, e) => s + Math.round(e.amount * e.recoverableRatio), 0);
    const deductibleAmount = (data?.expenses || [])
        .reduce((s, e) => s + (e.amountDeductibleCents || 0), 0);

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-0 pb-20 pt-6 md:pt-8">
            {/* Header */}
            <div className="space-y-4 mb-6">
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
                    {/* Dark KPI Card */}
                    {monthly && (
                        <div className="mb-6">
                            <KPICard
                                cashflow={monthly.cashflow}
                                revenue={monthly.receivedRent}
                                expenses={monthly.expenses}
                                recoverableAmount={recoverableAmount}
                                deductibleAmount={deductibleAmount}
                            />
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="border-b border-neutral-200 dark:border-neutral-700 mb-6">
                        <div className="flex gap-8">
                            {TABS.map(tab => {
                                const isActive = activeTab === tab.key;
                                let count: number | undefined;
                                if (tab.key === 'rent' && monthly && monthly.overdueCount > 0) count = monthly.overdueCount;
                                if (tab.key === 'expenses' && data?.expenses.length) count = data.expenses.length;

                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => handleTabChange(tab.key)}
                                        className={`pb-3 text-sm font-medium transition-colors relative ${
                                            isActive
                                                ? 'text-neutral-900 dark:text-white font-semibold'
                                                : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
                                        }`}
                                    >
                                        {tab.label}
                                        {count !== undefined && (
                                            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
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

                    {/* Tab content with fade */}
                    <div key={`${activeTab}-${month}-${year}`} className="animate-in fade-in duration-150">
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
                                onAddExpense={handleAddExpense}
                                year={year}
                                categoryBreakdown={data.categoryBreakdown}
                                upcomingExpenses={data.upcomingExpenses}
                                onMutate={() => mutate()}
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

            {/* Export */}
            <div className="flex gap-3 mt-10 justify-center">
                <button
                    onClick={() => handleExport('pdf')}
                    className="inline-flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                    <Download size={14} />
                    Export PDF
                </button>
                <button
                    onClick={() => handleExport('csv')}
                    className="inline-flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                    <Download size={14} />
                    Export CSV
                </button>
            </div>

        </div>
    );
};

export default FinancesClient;
