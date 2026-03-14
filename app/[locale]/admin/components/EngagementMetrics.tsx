'use client';

import { useTranslations } from 'next-intl';
import Tooltip from '@/components/ui/Tooltip';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface EngagementMetricsProps {
    data: {
        dau: number;
        wau: number;
        mau: number;
        profileCompletion: number;
        onboardingRate: number;
        draftNeverPublished: number;
        sparklines?: {
            dau: number[];
            wau: number[];
            mau: number[];
        };
    };
}

interface MetricItemProps {
    label: string;
    value: string | number;
    sublabel?: string;
    color?: string;
    tooltip?: string;
    isEmpty?: boolean;
    emptyLabel?: string;
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, sublabel, color = 'text-slate-900', tooltip, isEmpty, emptyLabel }) => (
    <div className="flex flex-col">
        <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
            {tooltip && (
                <Tooltip content={tooltip}>
                    <span className="text-slate-400 hover:text-slate-500 cursor-help text-[10px]">?</span>
                </Tooltip>
            )}
        </div>
        <span className={`text-2xl font-extrabold mt-1 ${isEmpty ? 'text-slate-300' : color}`}>{value}</span>
        {isEmpty && <span className="text-xs text-slate-400 italic mt-0.5">{emptyLabel}</span>}
        {!isEmpty && sublabel && <span className="text-xs text-slate-400 mt-0.5">{sublabel}</span>}
    </div>
);

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
    if (!data || data.length < 2) return null;
    const chartData = data.map((v, i) => ({ v, i }));
    const trend = data[data.length - 1] >= data[0];
    const strokeColor = trend ? '#10B981' : data[data.length - 1] < data[0] ? '#EF4444' : '#94A3B8';

    return (
        <div className="w-16 h-8">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <Line
                        type="monotone"
                        dataKey="v"
                        stroke={strokeColor}
                        strokeWidth={1.5}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

const ProgressBar: React.FC<{ value: number; label: React.ReactNode; color: string }> = ({ value, label, color }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            {typeof label === 'string' ? (
                <span className="text-sm font-medium text-slate-700">{label}</span>
            ) : (
                label
            )}
            <span className="text-sm font-bold text-slate-900">{value}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${Math.min(value, 100)}%` }}
            />
        </div>
    </div>
);

const EngagementMetrics: React.FC<EngagementMetricsProps> = ({ data }) => {
    const t = useTranslations('admin.engagement');

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-1">{t('title')}</h3>
            <p className="text-sm text-slate-500 mb-5">{t('subtitle')}</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="flex items-end gap-2">
                    <MetricItem
                        label="DAU"
                        value={data.dau}
                        sublabel={t('today')}
                        color="text-blue-600"
                        tooltip={t('dauTooltip')}
                        isEmpty={data.dau === 0}
                        emptyLabel={t('noData')}
                    />
                    {data.sparklines && <Sparkline data={data.sparklines.dau} color="blue" />}
                </div>
                <div className="flex items-end gap-2">
                    <MetricItem
                        label="WAU"
                        value={data.wau}
                        sublabel={t('thisWeek')}
                        color="text-indigo-600"
                        tooltip={t('wauTooltip')}
                        isEmpty={data.wau === 0}
                        emptyLabel={t('noData')}
                    />
                    {data.sparklines && <Sparkline data={data.sparklines.wau} color="indigo" />}
                </div>
                <div className="flex items-end gap-2">
                    <MetricItem
                        label="MAU"
                        value={data.mau}
                        sublabel={t('thisMonth')}
                        color="text-purple-600"
                        tooltip={t('mauTooltip')}
                        isEmpty={data.mau === 0}
                        emptyLabel={t('noData')}
                    />
                    {data.sparklines && <Sparkline data={data.sparklines.mau} color="purple" />}
                </div>
            </div>

            <div className="space-y-4">
                <ProgressBar
                    label={
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-slate-700">{t('profileCompletion')}</span>
                            <Tooltip content={t('profileCompletionTooltip')}>
                                <span className="text-slate-400 hover:text-slate-500 cursor-help text-[10px]">?</span>
                            </Tooltip>
                        </div>
                    }
                    value={data.profileCompletion}
                    color="bg-emerald-500"
                />
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-600">{t('abandonedDrafts')}</span>
                        <Tooltip content={t('abandonedDraftsTooltip')}>
                            <span className="text-slate-400 hover:text-slate-500 cursor-help text-[10px]">?</span>
                        </Tooltip>
                    </div>
                    <span className={`text-sm font-bold ${data.draftNeverPublished > 10 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {data.draftNeverPublished}
                    </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{t('abandonedDraftsDetail')}</p>
            </div>
        </div>
    );
};

export default EngagementMetrics;
