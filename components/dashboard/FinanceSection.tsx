'use client';

import { ChevronDown, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import KPICards from '@/app/[locale]/properties/components/analytics/KPICards';
import CashflowChart from '@/app/[locale]/properties/components/analytics/CashflowChart';
import { OperationalStats } from '@/app/actions/getOperationalStats';
import { AnalyticData } from '@/app/actions/analytics';

interface FinanceSectionProps {
    financials: AnalyticData | null;
    operationalStats: OperationalStats;
}

const FinanceSection: React.FC<FinanceSectionProps> = ({ financials, operationalStats }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!financials) return null;

    return (
        <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
            {/* Header — clickable */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-5 md:p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
            >
                <div className="flex items-center gap-3">
                    <BarChart3 size={20} className="text-neutral-500 dark:text-neutral-400" />
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                        Finances & Reporting
                    </h2>
                </div>
                <ChevronDown
                    size={20}
                    className={`text-neutral-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Collapsible content */}
            <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
            >
                <div className="overflow-hidden">
                    <div className="px-5 pb-6 md:px-6 space-y-6">
                        {/* Annual KPIs — existing component, unchanged */}
                        <KPICards data={financials} />

                        {/* Cashflow Chart — existing component, unchanged */}
                        <CashflowChart data={financials.cashflow} />

                        {/* Operations summary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                                <p className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
                                    {operationalStats.occupancyRate}%
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                    Taux d&apos;occupation
                                </p>
                            </div>
                            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                                <p className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
                                    {operationalStats.pendingApplications}
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                    Candidatures
                                </p>
                            </div>
                            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                                <p className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
                                    {operationalStats.upcomingVisits}
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                    Visites à venir
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FinanceSection;
