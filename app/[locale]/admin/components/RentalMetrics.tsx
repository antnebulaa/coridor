'use client';

import Tooltip from '@/components/ui/Tooltip';
import type { RentalMetrics as RentalMetricsType } from '@/app/actions/getAdminAdvancedStats';

interface RentalMetricsProps {
    data: RentalMetricsType;
}

const RentalMetrics: React.FC<RentalMetricsProps> = ({ data }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Métriques locatives</h3>
            <p className="text-sm text-slate-500 mb-5">Performance du marché</p>

            <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                    <span className="text-xs font-medium text-slate-500">Délai moyen</span>
                    <div className="mt-1">
                        {data.avgDaysToLease !== null ? (
                            <span className="text-2xl font-extrabold text-slate-900">
                                {Math.round(data.avgDaysToLease)}j
                            </span>
                        ) : (
                            <span className="text-xs text-slate-400 italic">Aucun bail signé pour le moment</span>
                        )}
                    </div>
                    <span className="text-xs text-slate-400">Annonce &rarr; bail signé</span>
                </div>
                <div>
                    <span className="text-xs font-medium text-slate-500">Candidatures / annonce</span>
                    <div className="mt-1">
                        <span className="text-2xl font-extrabold text-slate-900">
                            {data.avgApplicationsPerListing !== null ? data.avgApplicationsPerListing : '—'}
                        </span>
                    </div>
                    <span className="text-xs text-slate-400">Moyenne globale</span>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-slate-700">Taux d&apos;acceptation visites</span>
                        <Tooltip content="Pourcentage de visites proposées qui ont été confirmées par les candidats">
                            <span className="text-slate-400 hover:text-slate-500 cursor-help text-[10px]">?</span>
                        </Tooltip>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                        {data.visitAcceptanceRate !== null ? `${data.visitAcceptanceRate}%` : '—'}
                    </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-700"
                        style={{ width: `${Math.min(data.visitAcceptanceRate ?? 0, 100)}%` }}
                    />
                </div>
            </div>

            {data.topCities.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Top villes</h4>
                    <div className="space-y-2">
                        {data.topCities.map((city, idx) => (
                            <div key={city.city} className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                                <span className="text-sm text-slate-700 flex-1">{city.city}</span>
                                <span className="text-sm font-semibold text-slate-900">{city.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentalMetrics;
