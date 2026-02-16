'use client';

import { useMemo } from 'react';
import type { PlanDistributionData } from '@/app/actions/getAdminAdvancedStats';

interface PlanDistributionProps {
    data: PlanDistributionData;
}

const PLAN_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
    FREE: { bg: 'bg-slate-100', text: 'text-slate-700', bar: 'bg-slate-400' },
    PLUS: { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-400' },
    PRO: { bg: 'bg-slate-900', text: 'text-white', bar: 'bg-slate-900' },
};

const PLAN_LABELS: Record<string, string> = {
    FREE: 'Free',
    PLUS: 'Plus',
    PRO: 'Pro',
};

const PlanDistribution: React.FC<PlanDistributionProps> = ({ data }) => {
    const total = useMemo(
        () => data.plans.reduce((sum, p) => sum + p.count, 0),
        [data.plans]
    );

    const sortedPlans = useMemo(
        () => [...data.plans].sort((a, b) => b.count - a.count),
        [data.plans]
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Répartition des plans</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{total} utilisateurs au total</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Plan bars */}
                <div className="space-y-4">
                    {/* Stacked bar */}
                    <div className="flex h-4 rounded-full overflow-hidden bg-slate-100 gap-0.5">
                        {sortedPlans.map((plan) => {
                            const pct = total > 0 ? (plan.count / total) * 100 : 0;
                            const colors = PLAN_COLORS[plan.plan] || PLAN_COLORS.FREE;
                            return (
                                <div
                                    key={plan.plan}
                                    className={`${colors.bar} transition-all duration-500`}
                                    style={{ width: `${pct}%` }}
                                    title={`${PLAN_LABELS[plan.plan] || plan.plan}: ${plan.count}`}
                                />
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="space-y-3">
                        {sortedPlans.map((plan) => {
                            const colors = PLAN_COLORS[plan.plan] || PLAN_COLORS.FREE;
                            const pct = total > 0 ? Math.round((plan.count / total) * 100) : 0;
                            return (
                                <div key={plan.plan} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${colors.bg} ${colors.text}`}>
                                            {PLAN_LABELS[plan.plan] || plan.plan}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-slate-900">
                                            {plan.count.toLocaleString('fr-FR')}
                                        </span>
                                        <span className="text-xs text-slate-400 w-10 text-right">{pct}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Additional metrics */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                        <span className="text-xs font-medium text-slate-500">
                            Connexions bancaires actives
                        </span>
                        <p className={`text-2xl font-extrabold mt-1 ${data.activeBankConnections === 0 ? 'text-slate-300' : 'text-slate-900'}`}>
                            {data.activeBankConnections}
                        </p>
                        {data.activeBankConnections === 0 && (
                            <span className="text-xs text-slate-400 italic">Pas encore de données</span>
                        )}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                        <span className="text-xs font-medium text-slate-500">
                            Locataires vérifiés
                        </span>
                        <p className={`text-2xl font-extrabold mt-1 ${data.verifiedTenants === 0 ? 'text-slate-300' : 'text-emerald-600'}`}>
                            {data.verifiedTenants}
                        </p>
                        {data.verifiedTenants === 0 && (
                            <span className="text-xs text-slate-400 italic">Pas encore de données</span>
                        )}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                        <span className="text-xs font-medium text-slate-500">
                            Transactions traitées
                        </span>
                        <p className={`text-2xl font-extrabold mt-1 ${data.processedTransactions === 0 ? 'text-slate-300' : 'text-slate-900'}`}>
                            {data.processedTransactions.toLocaleString('fr-FR')}
                        </p>
                        {data.processedTransactions === 0 && (
                            <span className="text-xs text-slate-400 italic">Pas encore de données</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanDistribution;
