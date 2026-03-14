'use client';

import Tooltip from '@/components/ui/Tooltip';
import { useTranslations } from 'next-intl';
import type { SubscriptionMetricsData } from '@/app/actions/getAdminAdvancedStats';

interface SubscriptionMetricsProps {
    data: SubscriptionMetricsData;
}

const PLAN_COLORS: Record<string, string> = {
    PLUS: 'bg-orange-500',
    PRO: 'bg-slate-800',
};

const SubscriptionMetrics: React.FC<SubscriptionMetricsProps> = ({ data }) => {
    const t = useTranslations('admin.subscriptions');
    const totalFromBreakdown = data.planBreakdown.reduce(
        (sum, p) => sum + p.active + p.gifted,
        0
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-1">{t('title')}</h3>
            <p className="text-sm text-slate-500 mb-5">{t('subtitle')}</p>

            {/* Top KPIs */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                    <span className="text-xs font-medium text-slate-500">{t('active')}</span>
                    <div className="mt-1">
                        <span className="text-2xl font-extrabold text-slate-900">
                            {data.activeSubscriptions}
                        </span>
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-slate-500">MRR</span>
                        <Tooltip content={t('mrrTooltip')}>
                            <span className="text-slate-400 hover:text-slate-500 cursor-help text-[10px]">?</span>
                        </Tooltip>
                    </div>
                    <div className="mt-1">
                        <span className="text-2xl font-extrabold text-slate-900">
                            {data.mrr.toFixed(0)}€
                        </span>
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-slate-500">Churn</span>
                        <Tooltip content={t('churnTooltip')}>
                            <span className="text-slate-400 hover:text-slate-500 cursor-help text-[10px]">?</span>
                        </Tooltip>
                    </div>
                    <div className="mt-1">
                        <span className={`text-2xl font-extrabold ${data.churnRate > 10 ? 'text-red-600' : data.churnRate > 5 ? 'text-orange-600' : 'text-green-600'}`}>
                            {data.churnRate.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-purple-50 rounded-lg p-3">
                    <span className="text-xs font-medium text-purple-600">{t('gifted')}</span>
                    <div className="text-lg font-bold text-purple-700 mt-0.5">{data.activeGifts}</div>
                </div>
                <div className={`rounded-lg p-3 ${data.upcomingExpirations > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <span className={`text-xs font-medium ${data.upcomingExpirations > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {t('expiringIn7d')}
                    </span>
                    <div className={`text-lg font-bold mt-0.5 ${data.upcomingExpirations > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                        {data.upcomingExpirations}
                    </div>
                </div>
            </div>

            {/* Plan breakdown */}
            {data.planBreakdown.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">{t('byPlan')}</h4>
                    <div className="space-y-3">
                        {data.planBreakdown.map((plan) => {
                            const total = plan.active + plan.expired + plan.cancelled + plan.gifted;
                            const activeTotal = plan.active + plan.gifted;
                            const pct = totalFromBreakdown > 0
                                ? Math.round((activeTotal / totalFromBreakdown) * 100)
                                : 0;

                            return (
                                <div key={plan.plan}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${PLAN_COLORS[plan.plan] || 'bg-slate-300'}`} />
                                            <span className="text-sm font-medium text-slate-700">{plan.plan}</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900">
                                            {t('activeCount', { count: activeTotal })}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${PLAN_COLORS[plan.plan] || 'bg-slate-400'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-[10px] text-slate-400">{t('expiredCount', { count: plan.expired })}</span>
                                        <span className="text-[10px] text-slate-400">{t('cancelledCount', { count: plan.cancelled })}</span>
                                        {plan.gifted > 0 && (
                                            <span className="text-[10px] text-purple-400">{t('giftedCount', { count: plan.gifted })}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionMetrics;
