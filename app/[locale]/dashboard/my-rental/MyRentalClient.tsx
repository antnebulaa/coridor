'use client';

import { SafeUser } from "@/types";
import Container from "@/components/Container";
import Avatar from "@/components/Avatar";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";
import {
    ChevronLeft,
    Home,
    Receipt,
    AlertTriangle,
    LogOut,
    FileText,
    Download,
    CheckCircle2,
    Clock,
    AlertCircle,
    Shield,
    ChevronRight,
    Zap,
    Flame,
    Building2,
    Search,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from 'next-intl';

interface MyRentalClientProps {
    currentUser: SafeUser;
    rental: any | null;
}

const MyRentalClient: React.FC<MyRentalClientProps> = ({ currentUser, rental }) => {
    const router = useRouter();
    const t = useTranslations('myRental');

    // Category display map
    const categoryMap: Record<string, string> = {
        'apartment': 'Appartement',
        'house': 'Maison',
        'studio': 'Studio',
        'loft': 'Loft',
        'room': 'Chambre',
    };

    // Heating system display
    const heatingMap: Record<string, string> = {
        'COL_GAZ': 'Gaz collectif',
        'COL_ELEC': 'Électrique collectif',
        'IND_GAZ': 'Gaz individuel',
        'IND_ELEC': 'Électrique individuel',
        'COL_FUEL': 'Fioul collectif',
        'IND_FUEL': 'Fioul individuel',
        'COL_URBAN': 'Chauffage urbain',
        'MIXED': 'Mixte',
        'OTHER': 'Autre',
    };

    // Payment status helpers
    const getPaymentStatusInfo = (status: string) => {
        switch (status) {
            case 'PAID':
            case 'MANUALLY_CONFIRMED':
                return { label: t('payments.paid'), icon: CheckCircle2, color: 'text-green-500' };
            case 'PENDING':
                return { label: t('payments.pending'), icon: Clock, color: 'text-neutral-400' };
            case 'LATE':
            case 'REMINDER_SENT':
                return { label: t('payments.late'), icon: AlertCircle, color: 'text-amber-500' };
            case 'OVERDUE':
            case 'CRITICAL':
                return { label: t('payments.overdue'), icon: AlertTriangle, color: 'text-red-500' };
            default:
                return { label: status, icon: Clock, color: 'text-neutral-400' };
        }
    };

    const formatMonthYear = (month: number, year: number) => {
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    };

    const formatCents = (cents: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(cents / 100);
    };

    // Format dates
    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatDateLong = (iso: string) => {
        return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Next rent display
    const nextRentDisplay = useMemo(() => {
        if (!rental) return null;
        const date = new Date(rental.nextRentDate);
        const day = date.getDate();
        const month = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        return `${day === 1 ? '1er' : day} ${month}`;
    }, [rental]);

    // Lease end info
    const leaseEndInfo = useMemo(() => {
        if (!rental?.leaseEndDate) return null;
        const end = new Date(rental.leaseEndDate);
        const now = new Date();
        const diffMs = end.getTime() - now.getTime();
        const diffMonths = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30));
        return {
            date: formatDateLong(rental.leaseEndDate),
            monthsRemaining: diffMonths,
        };
    }, [rental]);

    // Floor display
    const floorDisplay = useMemo(() => {
        if (!rental?.property?.floor && rental?.property?.floor !== 0) return null;
        const floor = rental.property.floor;
        const label = floor === 0 ? 'RDC' : `${floor}${floor === 1 ? 'er' : 'e'} étage`;
        if (rental.property.hasElevator) return `${label} avec ascenseur`;
        return label;
    }, [rental]);

    // ===== EMPTY STATE =====
    if (!rental) {
        return (
            <Container>
                <div className="pb-20">
                    <div className="max-w-2xl mx-auto mt-6">
                        {/* Header */}
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 transition mb-6"
                        >
                            <ChevronLeft size={20} />
                            <span className="text-sm font-medium">{t('back')}</span>
                        </button>

                        <div className="flex flex-col items-center text-center py-16 px-6">
                            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                                <Home size={32} className="text-neutral-300 dark:text-neutral-600" />
                            </div>
                            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                                {t('empty.title')}
                            </h1>
                            <p className="text-sm text-neutral-500 max-w-sm mb-8">
                                {t('empty.description')}
                            </p>

                            <Link
                                href="/listings"
                                className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition inline-flex items-center gap-2"
                            >
                                <Search size={16} />
                                {t('empty.searchCta')}
                            </Link>

                            <div className="mt-10 w-full max-w-sm">
                                <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-4">
                                    {t('empty.prepareTitle')}
                                </p>
                                <div className="flex flex-col gap-2">
                                    <Link
                                        href="/account/passport"
                                        className="flex items-center justify-between p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:shadow-sm transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Shield size={18} className="text-neutral-500" />
                                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('empty.passport')}</span>
                                        </div>
                                        <ChevronRight size={16} className="text-neutral-400" />
                                    </Link>
                                    <Link
                                        href="/account/tenant-profile"
                                        className="flex items-center justify-between p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:shadow-sm transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText size={18} className="text-neutral-500" />
                                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('empty.dossier')}</span>
                                        </div>
                                        <ChevronRight size={16} className="text-neutral-400" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        );
    }

    // ===== FULL STATE =====
    const { property, listing, landlord, payments } = rental;
    const category = categoryMap[(property.category || '').toLowerCase()] || property.category || 'Logement';

    return (
        <Container>
            <div className="pb-20">
                <div className="max-w-2xl mx-auto mt-6 flex flex-col gap-5">

                    {/* === HEADER === */}
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 transition w-fit"
                    >
                        <ChevronLeft size={20} />
                        <span className="text-sm font-medium">{t('back')}</span>
                    </button>

                    {/* === PROPERTY SUMMARY === */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                        {/* Photo */}
                        {property.photo && (
                            <div className="w-full h-48 bg-neutral-100 dark:bg-neutral-800">
                                <img
                                    src={property.photo}
                                    alt={listing.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <div className="p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                                            {category}{property.totalSurface ? ` · ${property.totalSurface}m²` : ''}
                                        </h1>
                                        {rental.leaseStatus === 'PENDING_SIGNATURE' ? (
                                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                                En attente de signature
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 uppercase tracking-wider">
                                                {t('activeLease')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-neutral-500 mt-1">
                                        {property.address}{property.city ? `, ${property.city}` : ''}{property.zipCode ? ` ${property.zipCode}` : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Key info */}
                            <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                                <div>
                                    <div className="text-xs text-neutral-400 mb-0.5">{t('rentCC')}</div>
                                    <div className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                                        {formatCents(rental.totalRentCents)}
                                    </div>
                                </div>
                                {rental.leaseStartDate && (
                                    <div>
                                        <div className="text-xs text-neutral-400 mb-0.5">{t('startDate')}</div>
                                        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                            {formatDate(rental.leaseStartDate)}
                                        </div>
                                    </div>
                                )}
                                {rental.leaseEndDate && (
                                    <div>
                                        <div className="text-xs text-neutral-400 mb-0.5">{t('endDate')}</div>
                                        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                            {formatDate(rental.leaseEndDate)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* === PENDING SIGNATURE BANNER === */}
                    {rental.leaseStatus === 'PENDING_SIGNATURE' && (
                        <Link
                            href={`/leases/${rental.applicationId}`}
                            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition"
                        >
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center shrink-0">
                                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                    Bail en attente de signature
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                    Consultez et signez votre bail de location
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-blue-400 shrink-0" />
                        </Link>
                    )}

                    {/* === LANDLORD === */}
                    <button
                        onClick={() => {
                            if (rental.conversationId) {
                                router.push(`/inbox/${rental.conversationId}`);
                            }
                        }}
                        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition w-full text-left"
                    >
                        <Avatar src={landlord.image} seed={landlord.id} size={44} />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                {landlord.name}
                            </div>
                            <div className="text-xs text-neutral-500">{t('landlord')}</div>
                        </div>
                        <ChevronRight size={18} className="text-neutral-400 shrink-0" />
                    </button>

                    {/* === QUICK ACTIONS === */}
                    <div className="grid grid-cols-3 gap-3">
                        <Link
                            href="/account/receipts"
                            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:shadow-md transition"
                        >
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                                <Receipt size={18} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 text-center">{t('actions.receipts')}</span>
                        </Link>
                        <Link
                            href={`/reports?type=listing&targetId=${listing.id}`}
                            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:shadow-md transition"
                        >
                            <div className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-xl">
                                <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
                            </div>
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 text-center">{t('actions.report')}</span>
                        </Link>
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col items-center gap-2.5 opacity-60 cursor-not-allowed">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                <LogOut size={18} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 text-center">{t('actions.notice')}</span>
                        </div>
                    </div>

                    {/* === PAYMENTS === */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">{t('payments.title')}</h2>

                        {/* Next rent */}
                        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl mb-4">
                            <div>
                                <div className="text-xs text-neutral-500">{t('payments.nextRent')}</div>
                                <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
                                    {formatCents(rental.totalRentCents)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-neutral-500">{t('payments.dueDate')}</div>
                                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mt-0.5">
                                    {nextRentDisplay}
                                </div>
                            </div>
                        </div>

                        {/* History */}
                        {payments.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {payments.map((payment: any) => {
                                    const statusInfo = getPaymentStatusInfo(payment.status);
                                    const StatusIcon = statusInfo.icon;
                                    return (
                                        <div key={payment.id} className="flex items-center justify-between py-2.5 px-1">
                                            <div className="flex items-center gap-3">
                                                <StatusIcon size={16} className={statusInfo.color} />
                                                <span className="text-sm text-neutral-700 dark:text-neutral-300 capitalize">
                                                    {formatMonthYear(payment.periodMonth, payment.periodYear)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                                    {formatCents(payment.detectedAmountCents || payment.expectedAmountCents)}
                                                </span>
                                                <span className={`text-xs font-medium ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-400 text-center py-4">{t('payments.noHistory')}</p>
                        )}
                    </div>

                    {/* === DOCUMENTS === */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">{t('documents.title')}</h2>

                        <div className="flex flex-col gap-2">
                            {/* Bail signé */}
                            {rental.signedLeaseUrl ? (
                                <a
                                    href={rental.signedLeaseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText size={18} className="text-neutral-500" />
                                        <div>
                                            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('documents.lease')}</div>
                                            {rental.leaseStartDate && (
                                                <div className="text-xs text-neutral-400">
                                                    {t('documents.signedOn', { date: formatDate(rental.leaseStartDate) })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Download size={16} className="text-neutral-400" />
                                </a>
                            ) : (
                                <Link
                                    href={`/leases/${rental.applicationId}`}
                                    className="flex items-center justify-between p-3.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText size={18} className="text-neutral-500" />
                                        <div>
                                            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('documents.lease')}</div>
                                            {rental.leaseStatus === 'PENDING_SIGNATURE' && (
                                                <div className="text-xs text-amber-500">En attente de signature</div>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-neutral-400" />
                                </Link>
                            )}

                            {/* Dernière quittance */}
                            {rental.lastReceipt && (
                                <a
                                    href={rental.lastReceipt.pdfUrl || `/api/receipts/${rental.lastReceipt.id}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <Receipt size={18} className="text-neutral-500" />
                                        <div>
                                            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('documents.lastReceipt')}</div>
                                            <div className="text-xs text-neutral-400">
                                                {formatDateLong(rental.lastReceipt.periodStart)} — {formatDateLong(rental.lastReceipt.periodEnd)}
                                            </div>
                                        </div>
                                    </div>
                                    <Download size={16} className="text-neutral-400" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* === PRACTICAL INFO === */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">{t('practicalInfo.title')}</h2>

                        <div className="flex flex-col gap-3">
                            {listing.securityDeposit > 0 && (
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-sm text-neutral-500">{t('practicalInfo.deposit')}</span>
                                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        {formatCents(listing.securityDeposit)}
                                    </span>
                                </div>
                            )}
                            {rental.chargesCents > 0 && (
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-sm text-neutral-500">{t('practicalInfo.charges')}</span>
                                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        {formatCents(rental.chargesCents)}/mois
                                    </span>
                                </div>
                            )}
                            {property.heatingSystem && (
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-sm text-neutral-500">{t('practicalInfo.heating')}</span>
                                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        {heatingMap[property.heatingSystem] || property.heatingSystem}
                                    </span>
                                </div>
                            )}
                            {property.dpe && (
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-sm text-neutral-500">{t('practicalInfo.dpe')}</span>
                                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        DPE {property.dpe}
                                    </span>
                                </div>
                            )}
                            {floorDisplay && (
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-sm text-neutral-500">{t('practicalInfo.floor')}</span>
                                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        {floorDisplay}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* === END OF LEASE === */}
                    {leaseEndInfo && (
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">{t('leaseEnd.title')}</h2>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                {t('leaseEnd.description', { date: leaseEndInfo.date })}
                            </p>
                            {rental.leaseDurationMonths && (
                                <p className="text-sm text-neutral-500 mt-2">
                                    {t('leaseEnd.noticePeriod')}
                                </p>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </Container>
    );
}

export default MyRentalClient;
