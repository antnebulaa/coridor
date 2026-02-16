'use client';

import { useMemo } from 'react';
import type { GeoDistributionEntry } from '@/app/actions/getAdminAdvancedStats';

interface GeoDistributionProps {
    data: GeoDistributionEntry[];
}

const GeoDistribution: React.FC<GeoDistributionProps> = ({ data }) => {
    const maxCount = useMemo(() => {
        if (!data || data.length === 0) return 1;
        return Math.max(...data.map(d => d.count), 1);
    }, [data]);

    const total = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Distribution géographique</h3>
            <p className="text-sm text-slate-500 mb-5">
                {total} annonces publiées · {data.length} villes
            </p>

            <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {data.map((entry, idx) => {
                    const widthPercent = Math.max((entry.count / maxCount) * 100, 3);
                    const percentage = total > 0 ? Math.round((entry.count / total) * 100) : 0;

                    return (
                        <div key={entry.city} className="flex items-center gap-3 group">
                            <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">
                                {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-sm font-medium text-slate-700 truncate">
                                        {entry.city}
                                    </span>
                                    <span className="text-xs text-slate-500 shrink-0 ml-2">
                                        {entry.count} ({percentage}%)
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-indigo-400 group-hover:bg-indigo-500 transition-all duration-500 ease-in-out"
                                        style={{ width: `${widthPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
                {data.length === 0 && (
                    <div className="text-center text-slate-400 text-sm italic py-4">
                        Aucune donnée disponible
                    </div>
                )}
            </div>
        </div>
    );
};

export default GeoDistribution;
