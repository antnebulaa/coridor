'use client';

import { useState, useEffect, useCallback } from 'react';
import ConversionFunnel from './ConversionFunnel';
import ActivityFeed from './ActivityFeed';
import EngagementMetrics from './EngagementMetrics';
import RentalMetrics from './RentalMetrics';
import GeoDistribution from './GeoDistribution';
import PlanDistribution from './PlanDistribution';
import SubscriptionMetrics from './SubscriptionMetrics';
import type {
    FunnelStep,
    ActivityEvent,
    EngagementMetrics as EngagementMetricsType,
    RentalMetrics as RentalMetricsType,
    GeoDistributionEntry,
    PlanDistributionData,
    SubscriptionMetricsData,
} from '@/app/actions/getAdminAdvancedStats';

interface AdvancedStatsData {
    funnel: FunnelStep[];
    activity: ActivityEvent[];
    engagement: EngagementMetricsType;
    rental: RentalMetricsType;
    geo: GeoDistributionEntry[];
    plans: PlanDistributionData;
    subscriptions: SubscriptionMetricsData;
}

const SkeletonBlock = () => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
        <div className="h-5 w-48 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-3/4 bg-slate-100 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
        </div>
    </div>
);

const DashboardAdvancedSection: React.FC = () => {
    const [data, setData] = useState<AdvancedStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('30d');
    const [city, setCity] = useState<string | undefined>(undefined);
    const [cities, setCities] = useState<string[]>([]);

    const fetchData = useCallback(async (p: string, c?: string) => {
        setLoading(true);
        setError(null);
        try {
            const cityParam = c ? `&city=${encodeURIComponent(c)}` : '';
            const res = await fetch(`/api/admin/advanced-stats?period=${p}${cityParam}`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const json = await res.json();
            setCities(json.cities || []);
            setData({
                funnel: json.conversionFunnel || [],
                activity: json.activityFeed || [],
                engagement: json.engagementMetrics || { dau: 0, wau: 0, mau: 0, profileCompletion: 0, onboardingRate: 0, draftNeverPublished: 0 },
                rental: json.rentalMetrics || { avgDaysToLease: null, avgApplicationsPerListing: null, visitAcceptanceRate: null, topCities: [] },
                geo: json.geoDistribution || [],
                plans: json.planDistribution || { plans: [], activeBankConnections: 0, verifiedTenants: 0, processedTransactions: 0 },
                subscriptions: json.subscriptionMetrics || { activeSubscriptions: 0, mrr: 0, churnRate: 0, activeGifts: 0, upcomingExpirations: 0, planBreakdown: [] },
            });
        } catch (err: any) {
            console.error('Error fetching advanced stats:', err);
            setError(err.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(period, city);
    }, [period, city, fetchData]);

    const handlePeriodChange = (p: string) => {
        setPeriod(p);
    };

    const handleCityChange = (c: string | undefined) => {
        setCity(c);
    };

    if (error && !data) {
        return (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-700 font-medium mb-2">Erreur de chargement des statistiques avancées</p>
                <p className="text-red-500 text-sm mb-4">{error}</p>
                <button
                    onClick={() => fetchData(period, city)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
                >
                    Réessayer
                </button>
            </div>
        );
    }

    if (loading && !data) {
        return (
            <div className="mt-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-1 w-8 bg-indigo-500 rounded-full" />
                    <h3 className="text-xl font-bold text-slate-900">Statistiques avancées</h3>
                </div>
                <SkeletonBlock />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <SkeletonBlock />
                    <SkeletonBlock />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <SkeletonBlock />
                    <SkeletonBlock />
                </div>
                <SkeletonBlock />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="mt-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-1 w-8 bg-indigo-500 rounded-full" />
                <h3 className="text-xl font-bold text-slate-900">Statistiques avancées</h3>
            </div>

            {/* Conversion Funnel - full width */}
            <div className={loading ? 'opacity-60 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <ConversionFunnel
                    data={data.funnel}
                    period={period}
                    onPeriodChange={handlePeriodChange}
                    city={city}
                    cities={cities}
                    onCityChange={handleCityChange}
                />
            </div>

            {/* Engagement + Activity - side by side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    <EngagementMetrics data={data.engagement} />
                </div>
                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    <ActivityFeed events={data.activity} />
                </div>
            </div>

            {/* Rental + Geo - side by side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    <RentalMetrics data={data.rental} />
                </div>
                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    <GeoDistribution data={data.geo} />
                </div>
            </div>

            {/* Plan Distribution + Subscriptions - side by side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    <PlanDistribution data={data.plans} />
                </div>
                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    <SubscriptionMetrics data={data.subscriptions} />
                </div>
            </div>
        </div>
    );
};

export default DashboardAdvancedSection;
