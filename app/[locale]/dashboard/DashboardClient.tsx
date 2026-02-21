'use client';

import PageHeader from "@/components/PageHeader";
import Container from "@/components/Container";
import KPICards from "@/app/[locale]/properties/components/analytics/KPICards";
import CashflowChart from "@/app/[locale]/properties/components/analytics/CashflowChart";
import { HiOutlineHome, HiOutlineUserGroup, HiOutlineClipboard, HiOutlineKey } from "react-icons/hi2";
import { Plus, Trophy, Users, ArrowRight, ClipboardCheck, FileText, Clock, Send, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SafeUser } from "@/types";
import LegalRemindersWidget from "@/components/dashboard/LegalRemindersWidget";
import RentCollectionWidget from "@/components/dashboard/RentCollectionWidget";
import FiscalWidget from "@/components/dashboard/FiscalWidget";
import { useState } from "react";

interface SelectionStat {
    listingId: string;
    listingTitle: string;
    evaluated: number;
    shortlisted: number;
}

interface EdlStat {
    id: string;
    status: string;
    type: string;
    propertyTitle: string;
    tenantName: string | null;
    updatedAt: string;
    totalRooms: number;
    completedRooms: number;
}

interface DashboardClientProps {
    currentUser: SafeUser;
    financials: any;
    operationalStats: any;
    selectionStats?: SelectionStat[];
    edlStats?: EdlStat[];
}
import { useTranslations } from 'next-intl';

const DashboardClient: React.FC<DashboardClientProps> = ({
    currentUser,
    financials,
    operationalStats,
    selectionStats = [],
    edlStats = []
}) => {
    const t = useTranslations('dashboard');
    const greetingIndex = Math.floor(Math.random() * 4);
    const [resendingId, setResendingId] = useState<string | null>(null);
    const [resentIds, setResentIds] = useState<Set<string>>(new Set());

    const handleResendLink = async (e: React.MouseEvent, inspectionId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setResendingId(inspectionId);
        try {
            const res = await fetch(`/api/inspection/${inspectionId}/send-sign-link`, { method: 'POST' });
            if (res.ok) {
                setResentIds(prev => new Set([...prev, inspectionId]));
            }
        } catch {
            // silent
        } finally {
            setResendingId(null);
        }
    };

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

                {/* Selection Widget */}
                {selectionStats.length > 0 && (
                    <section className="bg-white p-5 rounded-xl border border-neutral-200">
                        <h3 className="font-medium text-neutral-800 flex items-center gap-2 mb-4">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            Selection en cours
                        </h3>
                        <div className="space-y-3">
                            {selectionStats.map((stat) => (
                                <div key={stat.listingId} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition group">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-neutral-900 truncate">{stat.listingTitle}</p>
                                        <p className="text-xs text-neutral-500 mt-0.5">
                                            <span className="inline-flex items-center gap-1">
                                                <Users size={12} />
                                                {stat.evaluated} evalue{stat.evaluated > 1 ? 's' : ''}
                                            </span>
                                            {stat.shortlisted > 0 && (
                                                <span className="ml-2 text-green-600">
                                                    {stat.shortlisted} shortliste{stat.shortlisted > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/selection/${stat.listingId}`}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white text-xs font-medium rounded-full hover:opacity-90 transition shrink-0 ml-3"
                                    >
                                        Comparer
                                        <ArrowRight size={12} />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* EDL Widget — only actionable items (DRAFT, PENDING_SIGNATURE) */}
                {edlStats.length > 0 && (
                    <section className="bg-white p-5 rounded-xl border border-neutral-200">
                        <h3 className="font-medium text-neutral-800 flex items-center gap-2 mb-4">
                            <ClipboardCheck className="w-5 h-5 text-indigo-500" />
                            États des lieux
                        </h3>
                        <div className="space-y-3">
                            {edlStats.map((edl) => {
                                const typeLabel = edl.type === 'ENTRY' ? "Entrée" : "Sortie";
                                const isDraft = edl.status === 'DRAFT';
                                const isPending = edl.status === 'PENDING_SIGNATURE';
                                const isResent = resentIds.has(edl.id);
                                const isResending = resendingId === edl.id;

                                return (
                                    <div
                                        key={edl.id}
                                        className="p-3 rounded-lg border"
                                        style={{
                                            background: isDraft ? '#fffbeb' : '#eff6ff',
                                            borderColor: isDraft ? '#fde68a' : '#bfdbfe',
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {isDraft ? (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-700">
                                                            <Clock size={11} /> En cours
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-700">
                                                            <FileText size={11} /> Attente signature
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-neutral-900 mt-1.5 truncate">{edl.propertyTitle}</p>
                                                <p className="text-xs text-neutral-500 mt-0.5">
                                                    {typeLabel}
                                                    {edl.tenantName && ` · ${edl.tenantName}`}
                                                    {isDraft && edl.totalRooms > 0 && (
                                                        <span className="ml-1">
                                                            · {edl.completedRooms}/{edl.totalRooms} pièce{edl.totalRooms > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2.5 flex gap-2">
                                            {isDraft && (
                                                <Link
                                                    href={`/inspection/${edl.id}/rooms`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-full hover:bg-amber-700 transition"
                                                >
                                                    Reprendre l&apos;EDL
                                                    <ArrowRight size={12} />
                                                </Link>
                                            )}
                                            {isPending && (
                                                <button
                                                    onClick={(e) => handleResendLink(e, edl.id)}
                                                    disabled={isResending || isResent}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition disabled:opacity-60"
                                                    style={{
                                                        background: isResent ? '#dcfce7' : '#2563eb',
                                                        color: isResent ? '#16a34a' : '#fff',
                                                    }}
                                                >
                                                    {isResending ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : isResent ? (
                                                        <>Notification renvoyée</>
                                                    ) : (
                                                        <>
                                                            <Send size={12} />
                                                            Renvoyer le lien
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Legal Reminders Widget */}
                <LegalRemindersWidget />

                {/* Rent Collection Widget */}
                <RentCollectionWidget />

                {/* Fiscal Widget (April-June only) */}
                <FiscalWidget />

                {/* Bottom Row: Activity */}
                {/* Bottom Row: Quick Actions only or Empty if nothing else */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Vacancy Details could go here later */}

                    {/* Quick Actions / Tips */}
                    <div className="lg:col-span-1 flex flex-col gap-4">
                        <a href="mailto:support@coridor.com" className="bg-linear-to-br from-neutral-900 to-neutral-800 rounded-xl p-5 text-white hover:opacity-95 transition group">
                            <h4 className="font-semibold mb-2">{t('landlord.needHelp')}</h4>
                            <p className="text-sm text-neutral-300 mb-4">
                                {t('landlord.helpText')}
                            </p>
                            <span className="text-xs bg-white text-black px-3 py-1.5 rounded-full font-medium inline-block group-hover:bg-neutral-100 transition">
                                {t('landlord.contactUs')}
                            </span>
                        </a>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default DashboardClient;
