'use client';

import PageHeader from "@/components/PageHeader";
import Container from "@/components/Container";
import KPICards from "@/app/[locale]/properties/components/analytics/KPICards";
import CashflowChart from "@/app/[locale]/properties/components/analytics/CashflowChart";
import { HiOutlineHome, HiOutlineUserGroup, HiOutlineClipboard, HiOutlineKey } from "react-icons/hi2";
import { Plus } from "lucide-react";
import Link from "next/link";
import { SafeUser } from "@/types";

interface DashboardClientProps {
    currentUser: SafeUser;
    financials: any;
    operationalStats: any;
}
import { useTranslations } from 'next-intl';

const DashboardClient: React.FC<DashboardClientProps> = ({
    currentUser,
    financials,
    operationalStats
}) => {
    const t = useTranslations('dashboard');
    const greetingIndex = Math.floor(Math.random() * 4);

    return (
        <Container>
            <div className="pb-20 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <PageHeader
                        title={t('landlordGreeting', { name: currentUser.firstName || 'Adrien' })}
                        subtitle={t(`landlord.greetings.${greetingIndex}`)}
                    />
                    <div className="flex gap-2">
                        <Link
                            href="/properties/create"
                            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition"
                        >
                            <Plus size={16} />
                            <Plus size={16} />
                            {t('landlord.addProperty')}
                        </Link>
                    </div>
                </div>

                {/* Top Row: Financial KPIs */}
                <section>
                    <KPICards data={financials} />
                </section>

                {/* Middle Row: Cashflow & Operations */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Cashflow Chart (3 cols) */}
                    <div className="lg:col-span-3">
                        <CashflowChart data={financials.cashflow} />
                    </div>

                    {/* Operational Pulse (1 col) */}
                    <div className="bg-white p-5 rounded-xl border border-neutral-200 flex flex-col gap-4">
                        <h3 className="font-medium text-neutral-800 flex items-center gap-2">
                            <HiOutlineKey className="w-5 h-5" />
                            <HiOutlineKey className="w-5 h-5" />
                            {t('landlord.operations')}
                        </h3>

                        {/* Occupancy */}
                        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                            <span className="text-sm text-neutral-600">{t('landlord.occupancyRate')}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-neutral-900">{operationalStats?.occupancyRate || 0}%</span>
                                {(operationalStats?.occupancyRate || 0) < 80 && (
                                    <span className="w-2 h-2 rounded-full bg-orange-500" title="Low occupancy" />
                                )}
                            </div>
                        </div>

                        {/* Pending Items */}
                        <div className="space-y-2">
                            <Link href="/dashboard/applications" className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg transition group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-200 transition">
                                        <HiOutlineClipboard size={18} />
                                    </div>
                                    <span className="text-sm font-medium text-neutral-700">{t('landlord.applications')}</span>
                                </div>
                                {(operationalStats?.pendingApplications || 0) > 0 && (
                                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {operationalStats.pendingApplications}
                                    </span>
                                )}
                            </Link>

                            <Link href="/" className="flex items-center justify-center p-2 hover:bg-neutral-50 rounded-lg transition group">
                                <div className="flex items-center gap-3 w-full">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-full group-hover:bg-purple-200 transition">
                                        <HiOutlineUserGroup size={18} />
                                    </div>
                                    <span className="text-sm font-medium text-neutral-700">{t('landlord.upcomingVisits')}</span>
                                </div>
                                {(operationalStats?.upcomingVisits || 0) > 0 && (
                                    <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                                        {operationalStats.upcomingVisits}
                                    </span>
                                )}
                            </Link>
                        </div>

                        <div className="mt-auto border-t border-neutral-100 pt-3">
                            <div className="text-xs text-neutral-500">
                                {t('landlord.managedUnits', { count: operationalStats?.totalUnits || 0 })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Activity */}
                {/* Bottom Row: Quick Actions only or Empty if nothing else */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Vacancy Details could go here later */}

                    {/* Quick Actions / Tips */}
                    <div className="lg:col-span-1 flex flex-col gap-4">
                        <Link href="mailto:support@coridor.com" className="bg-linear-to-br from-neutral-900 to-neutral-800 rounded-xl p-5 text-white hover:opacity-95 transition group">
                            <h4 className="font-semibold mb-2">{t('landlord.needHelp')}</h4>
                            <p className="text-sm text-neutral-300 mb-4">
                                {t('landlord.helpText')}
                            </p>
                            <span className="text-xs bg-white text-black px-3 py-1.5 rounded-full font-medium inline-block group-hover:bg-neutral-100 transition">
                                {t('landlord.contactUs')}
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default DashboardClient;
