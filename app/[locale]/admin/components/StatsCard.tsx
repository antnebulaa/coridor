'use client';

import { ReactNode } from "react";

interface StatsCardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: ReactNode;
    trend?: string;
    trendColor?: string;
    loading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    trend,
    trendColor,
    loading = false
}) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-full hover:shadow-md transition duration-200">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
                    {loading ? (
                        <div className="h-8 w-24 bg-slate-100 animate-pulse rounded mt-1"></div>
                    ) : (
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{value}</h3>
                    )}
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                    {icon}
                </div>
            </div>
            <div>
                {trend && (
                    <span className={`text-xs font-bold ${trendColor || 'text-slate-600'} bg-slate-100 px-2 py-1 rounded inline-block mb-1`}>
                        {trend}
                    </span>
                )}
                {subtitle && (
                    <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
                )}
            </div>
        </div>
    );
};

export default StatsCard;
