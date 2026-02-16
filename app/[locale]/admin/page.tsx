import getAdminDashboardStats from "@/app/actions/getAdminDashboardStats";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "next/navigation";
import Image from "next/image";
import { HiUser, HiHome, HiExclamationTriangle, HiDocumentCheck } from "react-icons/hi2";
import Link from "next/link";
import AnalyticsChart from "./components/AnalyticsChart";
import StatsCard from "./components/StatsCard";
import DashboardAdvancedSection from "./components/DashboardAdvancedSection";
import { getTranslations } from "next-intl/server";

export default async function AdminDashboard() {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        redirect('/');
    }

    const stats = await getAdminDashboardStats();
    const t = await getTranslations('admin');

    if (!stats) {
        return <div>{t('errorLoading')}</div>;
    }

    const { counts, recentUsers, recentListings, recentReports, graphData } = stats;

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {t('dashboard')}
            </h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title={t('toModerate')}
                    value={counts.listingsPending}
                    subtitle={t('pendingListings')}
                    icon={<HiDocumentCheck className="w-8 h-8 text-orange-500" />}
                    trend={counts.listingsPending > 0 ? t('actionRequired') : t('upToDate')}
                    trendColor={counts.listingsPending > 0 ? "text-orange-600" : "text-green-600"}
                />
                <StatsCard
                    title={t('usersLabel')}
                    value={counts.users}
                    subtitle={t('thisWeek', { count: counts.usersNewThisWeek })}
                    icon={<HiUser className="w-8 h-8 text-blue-500" />}
                    trend={t('growth')}
                    trendColor="text-blue-600"
                />
                <StatsCard
                    title={t('reportsLabel')}
                    value={counts.reportsPending}
                    subtitle={t('pendingReports')}
                    icon={<HiExclamationTriangle className="w-8 h-8 text-red-500" />}
                    trend={counts.reportsPending > 0 ? t('urgent') : t('noIssues')}
                    trendColor={counts.reportsPending > 0 ? "text-red-600 font-bold" : "text-slate-500"}
                />
                <StatsCard
                    title={t('publishedListings')}
                    value={counts.listingsPublished}
                    subtitle={t('onlineVisible')}
                    icon={<HiHome className="w-8 h-8 text-green-500" />}
                    trend={t('ofTotal', { percent: Math.round((counts.listingsPublished / (counts.listings || 1)) * 100) })}
                    trendColor="text-green-600"
                />
            </div>

            {/* Charts Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-2">{t('growthChart')}</h3>
                <AnalyticsChart data={graphData || []} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Recent Activity Feed */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Recent Listings */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">{t('recentListings')}</h3>
                            <Link href="/admin/listings" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                                {t('viewAll')} &rarr;
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {recentListings.map((listing: any) => (
                                <div key={listing.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition">
                                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                        <HiHome className="text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{listing.title}</p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {listing.rentalUnit?.property?.city} • {listing.price}€ • {t('by', { name: listing.rentalUnit?.property?.owner?.name || t('unknown') })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <StatusBadge status={listing.status} t={t} />
                                        <p className="text-xs text-slate-400 mt-1">{new Date(listing.updatedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                            {recentListings.length === 0 && <div className="p-6 text-center text-slate-500 italic">{t('noRecentListings')}</div>}
                        </div>
                    </div>

                    {/* Recent Reports */}
                    {counts.reportsPending > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-slate-800">{t('recentReports')}</h3>
                                <Link href="/admin/reports" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                                    {t('viewAll')} &rarr;
                                </Link>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {recentReports.map((report: any) => (
                                    <div key={report.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition">
                                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                            <HiExclamationTriangle className="text-red-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900">
                                                {report.targetUser ? t('onUser', { name: report.targetUser.name }) : t('onListing', { name: report.listing?.title })}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {t('reportedBy', { name: report.reporter?.name || t('anonymous') })}
                                            </p>
                                        </div>
                                        <Link href={`/admin/reports`} className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold hover:bg-slate-50">
                                            {t('view')}
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar: New Users & Quick Links */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">{t('newUsers')}</h3>
                            <Link href="/admin/users" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                                {t('manage')} &rarr;
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {recentUsers.map((user: any) => (
                                <div key={user.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition">
                                    <div className="relative h-10 w-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                        {user.image ? (
                                            <Image
                                                src={user.image}
                                                alt={user.name || 'User'}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                <HiUser className="text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{user.name || t('noName')}</p>
                                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {new Date(user.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white text-center">
                        <h3 className="font-bold text-lg mb-2">{t('helpTitle')}</h3>
                        <p className="text-indigo-100 text-sm mb-4">{t('helpText')}</p>
                        <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition backdrop-blur-sm">
                            {t('documentation')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Advanced Metrics Section */}
            <DashboardAdvancedSection />
        </div>
    );
}

function StatusBadge({ status, t }: { status: string; t: any }) {
    switch (status) {
        case 'PUBLISHED':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">{t('published')}</span>;
        case 'PENDING_REVIEW':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">{t('pending')}</span>;
        case 'REJECTED':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">{t('rejected')}</span>;
        default:
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">{status}</span>;
    }
}
