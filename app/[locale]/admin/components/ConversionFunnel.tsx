'use client';

import { useMemo } from 'react';
import Tooltip from '@/components/ui/Tooltip';
import type { FunnelStep } from '@/app/actions/getAdminAdvancedStats';

interface ConversionFunnelProps {
    data: FunnelStep[];
    period: string;
    onPeriodChange: (p: string) => void;
    city?: string;
    cities: string[];
    onCityChange: (city: string | undefined) => void;
}

const periods = [
    { label: '7j', value: '7d' },
    { label: '30j', value: '30d' },
    { label: '90j', value: '90d' },
    { label: 'Tout', value: 'all' },
];

const barColors = [
    '#3B82F6',
    '#4B8DF7',
    '#5B99F8',
    '#6BA5F9',
    '#93C5FD',
];

const ConversionFunnel: React.FC<ConversionFunnelProps> = ({ data, period, onPeriodChange, city, cities, onCityChange }) => {
    const maxCount = useMemo(() => {
        if (!data || data.length === 0) return 1;
        return Math.max(...data.map(d => d.count), 1);
    }, [data]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-800">Funnel de conversion</h3>
                        <Tooltip content="Parcours de conversion — De l'inscription à la signature du bail">
                            <span className="text-slate-400 hover:text-slate-600 cursor-help text-sm">?</span>
                        </Tooltip>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">Du signup au bail signé</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={city || ''}
                        onChange={(e) => onCityChange(e.target.value || undefined)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                        <option value="">Toutes les villes</option>
                        {cities.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        {periods.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => onPeriodChange(p.value)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                                    period === p.value
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                {data.map((step, index) => {
                    const widthPercent = Math.max((step.count / maxCount) * 100, 4);
                    const colorIndex = Math.min(index, barColors.length - 1);
                    const nextStep = data[index + 1];
                    const conversionRate = nextStep && step.count > 0
                        ? Math.round((nextStep.count / step.count) * 100)
                        : null;

                    return (
                        <div key={step.step}>
                            <div className="flex items-center gap-4 py-2">
                                <div className="w-36 shrink-0 text-right">
                                    <span className="text-sm font-medium text-slate-700">{step.step}</span>
                                </div>
                                <div className="flex-1 relative">
                                    <div
                                        className="h-9 rounded-md flex items-center justify-end pr-3 transition-all duration-500"
                                        style={{
                                            width: `${widthPercent}%`,
                                            background: `linear-gradient(90deg, ${barColors[colorIndex]}, ${barColors[Math.min(colorIndex + 1, barColors.length - 1)]})`,
                                            minWidth: '40px',
                                        }}
                                    >
                                        <span className="text-xs font-bold text-white">
                                            {step.count.toLocaleString('fr-FR')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {conversionRate !== null && (
                                <div className="flex items-center gap-4 py-0.5">
                                    <div className="w-36 shrink-0" />
                                    <div className="flex items-center gap-2 pl-2">
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                            {conversionRate}%
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ConversionFunnel;
