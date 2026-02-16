'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    HiArrowLeft,
    HiNoSymbol,
    HiCheck,
    HiUser,
    HiGift,
    HiPencilSquare,
    HiEnvelope,
    HiPhone,
    HiCalendarDays,
    HiMapPin,
    HiHome,
    HiClock,
    HiExclamationTriangle,
    HiXMark,
    HiChatBubbleLeftRight,
    HiFlag,
    HiDocumentText,
    HiBuildingOffice2,
} from 'react-icons/hi2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubscriptionGiftedBy {
    name: string | null;
    email: string | null;
}

interface SubscriptionEntry {
    id: string;
    plan: string;
    status: string;
    startDate: string;
    endDate: string | null;
    isGifted: boolean;
    giftedBy: SubscriptionGiftedBy | null;
    giftReason: string | null;
}

interface PropertyEntry {
    id: string;
    title: string;
    city: string | null;
    rentalUnitCount: number;
    listingCount: number;
}

interface UserDetail {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
    role: string;
    userMode: string;
    plan: string;
    isBanned: boolean;
    phoneNumber: string | null;
    birthDate: string | null;
    address: string | null;
    city: string | null;
    zipCode: string | null;
    country: string | null;
    createdAt: string;
    updatedAt: string;
    propertyCount: number;
    listingCount: number;
    applicationCount: number;
    messageCount: number;
    reportsMade: number;
    reportsReceived: number;
    lastActive: string | null;
    properties: PropertyEntry[];
    subscriptions: SubscriptionEntry[];
    currentSubscription: SubscriptionEntry | null;
}

interface UserDetailClientProps {
    userId: string;
    currentUser: { id: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAN_BADGE_STYLES: Record<string, string> = {
    FREE: 'bg-slate-100 text-slate-700',
    PLUS: 'bg-orange-100 text-orange-700',
    PRO: 'bg-slate-900 text-white',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
    GIFTED: 'bg-purple-100 text-purple-700',
};

function PlanBadge({ plan, size = 'sm' }: { plan: string; size?: 'sm' | 'md' }) {
    const base = size === 'md'
        ? 'inline-flex px-3 py-1 text-sm font-bold rounded-full'
        : 'inline-flex px-2 py-0.5 text-xs font-semibold rounded-full';
    return (
        <span className={`${base} ${PLAN_BADGE_STYLES[plan] || PLAN_BADGE_STYLES.FREE}`}>
            {plan}
        </span>
    );
}

function SubscriptionStatusBadge({ status, isGifted }: { status: string; isGifted?: boolean }) {
    const displayStatus = isGifted ? 'GIFTED' : status;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_BADGE_STYLES[displayStatus] || 'bg-slate-100 text-slate-600'}`}>
            {isGifted && <HiGift className="w-3 h-3" />}
            {displayStatus}
        </span>
    );
}

function formatDate(iso: string | null): string {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatShortDate(iso: string | null): string {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function isExpiringSoon(endDate: string | null): boolean {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 7;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const UserDetailClient: React.FC<UserDetailClientProps> = ({ userId, currentUser }) => {
    const router = useRouter();

    // Data
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal state
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);

    // -------------------------------------------------------------------
    // Fetch user data
    // -------------------------------------------------------------------
    const fetchUser = useCallback(async () => {
        try {
            const res = await axios.get(`/api/admin/users/${userId}/detail`);
            const d = res.data;

            // Map API properties to expected shape
            const properties: PropertyEntry[] = (d.properties || []).map((p: any) => {
                let listingCount = 0;
                for (const ru of p.rentalUnits || []) {
                    listingCount += (ru.listings || []).length;
                }
                return {
                    id: p.id,
                    title: p.address || p.city || 'Bien',
                    city: p.city || null,
                    rentalUnitCount: (p.rentalUnits || []).length,
                    listingCount,
                };
            });

            // Count totals
            const propertyCount = properties.length;
            const listingCount = properties.reduce((s, p) => s + p.listingCount, 0);
            let applicationCount = 0;
            for (const scope of d.candidateScopes || []) {
                applicationCount += (scope.applications || []).length;
            }

            // Map subscriptions
            const subscriptions: SubscriptionEntry[] = (d.subscriptionHistory || []).map((s: any) => ({
                id: s.id,
                plan: s.plan,
                status: s.status,
                startDate: s.startDate,
                endDate: s.endDate,
                isGifted: s.isGifted,
                giftedBy: s.giftedById ? { name: null, email: null } : null,
                giftReason: s.giftReason || null,
            }));

            const currentSub = d.currentSubscription
                ? {
                    id: d.currentSubscription.id,
                    plan: d.currentSubscription.plan,
                    status: d.currentSubscription.status,
                    startDate: d.currentSubscription.startDate,
                    endDate: d.currentSubscription.endDate,
                    isGifted: d.currentSubscription.isGifted,
                    giftedBy: d.currentSubscription.giftedById ? { name: null, email: null } : null,
                    giftReason: d.currentSubscription.giftReason || null,
                }
                : null;

            setUser({
                id: d.id,
                name: d.name,
                firstName: d.firstName,
                lastName: d.lastName,
                email: d.email,
                image: d.image,
                role: d.role,
                userMode: d.userMode,
                plan: d.plan,
                isBanned: d.isBanned,
                phoneNumber: d.phoneNumber,
                birthDate: d.birthDate,
                address: d.address,
                city: d.city,
                zipCode: d.zipCode,
                country: d.country,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
                propertyCount,
                listingCount,
                applicationCount,
                messageCount: d.activityStats?.messageCount ?? 0,
                reportsMade: d.activityStats?.reportsMade ?? 0,
                reportsReceived: d.activityStats?.reportsReceived ?? 0,
                lastActive: d.lastActivity || null,
                properties,
                subscriptions,
                currentSubscription: currentSub,
            });
        } catch {
            toast.error('Erreur lors du chargement du profil utilisateur');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // -------------------------------------------------------------------
    // Ban / Unban
    // -------------------------------------------------------------------
    const handleBanToggle = async () => {
        if (!user) return;
        const msg = user.isBanned
            ? 'Voulez-vous vraiment debannir cet utilisateur ?'
            : 'Voulez-vous vraiment bannir cet utilisateur ?';
        if (!window.confirm(msg)) return;

        setActionLoading(true);
        try {
            await axios.patch(`/api/admin/users/${userId}`, { isBanned: !user.isBanned });
            toast.success(user.isBanned ? 'Utilisateur debanni' : 'Utilisateur banni');
            await fetchUser();
        } catch {
            toast.error('Erreur lors de la mise a jour');
        } finally {
            setActionLoading(false);
        }
    };

    // -------------------------------------------------------------------
    // Loading skeleton
    // -------------------------------------------------------------------
    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
                <div className="h-6 w-48 bg-slate-200 rounded" />
                <div className="h-24 bg-white rounded-xl border border-slate-200" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-64 bg-white rounded-xl border border-slate-200" />
                    <div className="h-64 bg-white rounded-xl border border-slate-200" />
                </div>
                <div className="h-48 bg-white rounded-xl border border-slate-200" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-5xl mx-auto text-center py-20">
                <p className="text-slate-500 text-lg">Utilisateur introuvable</p>
                <Link href="/admin/users" className="text-indigo-600 hover:underline mt-4 inline-block text-sm">
                    Retour aux utilisateurs
                </Link>
            </div>
        );
    }

    const displayName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Sans nom';

    // -------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* ============================================================= */}
            {/* Header Bar                                                     */}
            {/* ============================================================= */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/admin/users"
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition text-sm w-fit"
                >
                    <HiArrowLeft className="w-4 h-4" />
                    Retour aux utilisateurs
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden relative shrink-0">
                            {user.image ? (
                                <Image
                                    src={user.image}
                                    alt={displayName}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <HiUser className="w-6 h-6 text-slate-400" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
                                <PlanBadge plan={user.plan} size="md" />
                                {user.isBanned ? (
                                    <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                        Banni
                                    </span>
                                ) : (
                                    <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                        Actif
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    {user.id !== currentUser.id && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={handleBanToggle}
                                disabled={actionLoading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                                    user.isBanned
                                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                                }`}
                            >
                                {user.isBanned ? <HiCheck className="w-4 h-4" /> : <HiNoSymbol className="w-4 h-4" />}
                                {user.isBanned ? 'Debannir' : 'Bannir'}
                            </button>
                            <button
                                onClick={() => setShowPlanModal(true)}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition disabled:opacity-50"
                            >
                                <HiPencilSquare className="w-4 h-4" />
                                Modifier le plan
                            </button>
                            <button
                                onClick={() => setShowGiftModal(true)}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition disabled:opacity-50"
                            >
                                <HiGift className="w-4 h-4" />
                                Offrir un abonnement
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ============================================================= */}
            {/* Section 1: Identity Card                                       */}
            {/* ============================================================= */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6">Informations personnelles</h2>
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Large avatar */}
                    <div className="shrink-0 flex justify-center md:justify-start">
                        <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden relative">
                            {user.image ? (
                                <Image
                                    src={user.image}
                                    alt={displayName}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <HiUser className="w-8 h-8 text-slate-400" />
                            )}
                        </div>
                    </div>

                    {/* Info grid */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                        <InfoItem
                            icon={<HiUser className="w-4 h-4 text-slate-400" />}
                            label="Nom complet"
                            value={displayName}
                        />
                        <InfoItem
                            icon={<HiEnvelope className="w-4 h-4 text-slate-400" />}
                            label="Email"
                            value={user.email || '--'}
                        />
                        <InfoItem
                            icon={<HiPhone className="w-4 h-4 text-slate-400" />}
                            label="Telephone"
                            value={user.phoneNumber || '--'}
                        />
                        <InfoItem
                            icon={<HiCalendarDays className="w-4 h-4 text-slate-400" />}
                            label="Date de naissance"
                            value={formatDate(user.birthDate)}
                        />
                        <InfoItem
                            icon={<HiMapPin className="w-4 h-4 text-slate-400" />}
                            label="Adresse"
                            value={user.address || '--'}
                        />
                        <InfoItem
                            icon={<HiMapPin className="w-4 h-4 text-slate-400" />}
                            label="Ville / Code postal"
                            value={[user.city, user.zipCode].filter(Boolean).join(', ') || '--'}
                        />
                        <InfoItem
                            icon={<HiMapPin className="w-4 h-4 text-slate-400" />}
                            label="Pays"
                            value={user.country || '--'}
                        />
                        <InfoItem
                            icon={<HiUser className="w-4 h-4 text-slate-400" />}
                            label="Mode"
                            value={
                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    user.userMode === 'LANDLORD'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-teal-100 text-teal-700'
                                }`}>
                                    {user.userMode === 'LANDLORD' ? 'Proprietaire' : 'Locataire'}
                                </span>
                            }
                        />
                        <InfoItem
                            icon={<HiCalendarDays className="w-4 h-4 text-slate-400" />}
                            label="Inscription"
                            value={formatDate(user.createdAt)}
                        />
                        <InfoItem
                            icon={<HiClock className="w-4 h-4 text-slate-400" />}
                            label="Derniere activite"
                            value={user.lastActive ? formatDate(user.lastActive) : 'Inconnue'}
                        />
                    </div>
                </div>
            </div>

            {/* ============================================================= */}
            {/* Section 2: Current Subscription                                */}
            {/* ============================================================= */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Abonnement actuel</h2>
                {!user.currentSubscription ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                        <p className="text-slate-500 text-sm">Aucun abonnement actif</p>
                        <button
                            onClick={() => setShowGiftModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition"
                        >
                            <HiGift className="w-4 h-4" />
                            Offrir un abonnement
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <PlanBadge plan={user.currentSubscription.plan} size="md" />
                            <SubscriptionStatusBadge
                                status={user.currentSubscription.status}
                                isGifted={user.currentSubscription.isGifted}
                            />
                            {isExpiringSoon(user.currentSubscription.endDate) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
                                    <HiExclamationTriangle className="w-3 h-3" />
                                    Expire bientot
                                </span>
                            )}
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                            <p>
                                <span className="font-medium text-slate-700">Debut :</span>{' '}
                                {formatShortDate(user.currentSubscription.startDate)}
                            </p>
                            {user.currentSubscription.endDate && (
                                <p>
                                    <span className="font-medium text-slate-700">Fin :</span>{' '}
                                    {formatShortDate(user.currentSubscription.endDate)}
                                </p>
                            )}
                            {user.currentSubscription.isGifted && user.currentSubscription.giftedBy && (
                                <p>
                                    <span className="font-medium text-slate-700">Offert par :</span>{' '}
                                    {user.currentSubscription.giftedBy.name || user.currentSubscription.giftedBy.email}
                                </p>
                            )}
                            {user.currentSubscription.giftReason && (
                                <p>
                                    <span className="font-medium text-slate-700">Raison :</span>{' '}
                                    {user.currentSubscription.giftReason}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ============================================================= */}
            {/* Section 3: Subscription Timeline                               */}
            {/* ============================================================= */}
            {user.subscriptions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Historique des abonnements</h2>
                    <div className="relative pl-6">
                        {/* Vertical line */}
                        <div className="absolute left-[5px] top-2 bottom-2 border-l-2 border-slate-200" />

                        <div className="space-y-6">
                            {user.subscriptions.map((sub, index) => (
                                <div key={sub.id} className="relative">
                                    {/* Dot */}
                                    <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                                        index === 0
                                            ? 'bg-indigo-500 border-indigo-500'
                                            : 'bg-white border-slate-300'
                                    }`} />

                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <PlanBadge plan={sub.plan} />
                                            <SubscriptionStatusBadge status={sub.status} isGifted={sub.isGifted} />
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            {formatShortDate(sub.startDate)}
                                            {sub.endDate && <> &mdash; {formatShortDate(sub.endDate)}</>}
                                        </p>
                                        {sub.isGifted && sub.giftedBy && (
                                            <p className="text-xs text-purple-600">
                                                Offert par {sub.giftedBy.name || sub.giftedBy.email}
                                                {sub.giftReason && <> &mdash; {sub.giftReason}</>}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* Section 4: Activity Stats                                      */}
            {/* ============================================================= */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Statistiques d&apos;activite</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard
                        icon={<HiBuildingOffice2 className="w-5 h-5 text-blue-500" />}
                        value={user.propertyCount}
                        label="Proprietes"
                    />
                    <StatCard
                        icon={<HiHome className="w-5 h-5 text-green-500" />}
                        value={user.listingCount}
                        label="Annonces"
                    />
                    <StatCard
                        icon={<HiDocumentText className="w-5 h-5 text-orange-500" />}
                        value={user.applicationCount}
                        label="Candidatures"
                    />
                    <StatCard
                        icon={<HiChatBubbleLeftRight className="w-5 h-5 text-indigo-500" />}
                        value={user.messageCount}
                        label="Messages"
                    />
                    <StatCard
                        icon={<HiFlag className="w-5 h-5 text-red-500" />}
                        value={user.reportsMade}
                        label="Signalements faits"
                    />
                    <StatCard
                        icon={<HiExclamationTriangle className="w-5 h-5 text-amber-500" />}
                        value={user.reportsReceived}
                        label="Signalements recus"
                    />
                </div>
            </div>

            {/* ============================================================= */}
            {/* Section 5: Properties (landlords only)                         */}
            {/* ============================================================= */}
            {user.userMode === 'LANDLORD' && user.properties.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Proprietes</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {user.properties.map((property) => (
                            <div
                                key={property.id}
                                className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition"
                            >
                                <h3 className="font-semibold text-slate-900 text-sm truncate">
                                    {property.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {property.city || 'Ville inconnue'}
                                </p>
                                <div className="flex items-center gap-3 mt-3 text-xs text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <HiBuildingOffice2 className="w-3.5 h-3.5" />
                                        {property.rentalUnitCount} logement{property.rentalUnitCount !== 1 ? 's' : ''}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <HiHome className="w-3.5 h-3.5" />
                                        {property.listingCount} annonce{property.listingCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* Modals                                                         */}
            {/* ============================================================= */}
            {showGiftModal && (
                <GiftSubscriptionModal
                    userName={displayName}
                    userId={userId}
                    onClose={() => setShowGiftModal(false)}
                    onSuccess={async () => {
                        setShowGiftModal(false);
                        await fetchUser();
                    }}
                />
            )}
            {showPlanModal && (
                <ChangePlanModal
                    userName={displayName}
                    userId={userId}
                    currentPlan={user.plan}
                    hasActiveSubscription={!!user.currentSubscription}
                    onClose={() => setShowPlanModal(false)}
                    onSuccess={async () => {
                        setShowPlanModal(false);
                        await fetchUser();
                    }}
                />
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// InfoItem sub-component
// ---------------------------------------------------------------------------

function InfoItem({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-2">
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                <div className="text-slate-700 font-medium mt-0.5 truncate">{value}</div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// StatCard sub-component
// ---------------------------------------------------------------------------

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
    return (
        <div className="flex flex-col items-center p-4 rounded-lg bg-slate-50 text-center">
            <div className="mb-2">{icon}</div>
            <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Gift Subscription Modal
// ---------------------------------------------------------------------------

function GiftSubscriptionModal({
    userName,
    userId,
    onClose,
    onSuccess,
}: {
    userName: string;
    userId: string;
    onClose: () => void;
    onSuccess: () => Promise<void>;
}) {
    const [plan, setPlan] = useState<'PLUS' | 'PRO'>('PLUS');
    const [durationMonths, setDurationMonths] = useState(1);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const durations = [
        { value: 1, label: '1 mois' },
        { value: 3, label: '3 mois' },
        { value: 6, label: '6 mois' },
        { value: 12, label: '12 mois' },
    ];

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await axios.post(`/api/admin/users/${userId}/gift-subscription`, {
                plan,
                durationMonths,
                reason: reason.trim() || undefined,
            });
            toast.success('Abonnement offert avec succes');
            await onSuccess();
        } catch {
            toast.error("Erreur lors de l'envoi de l'abonnement");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                        Offrir un abonnement a {userName}
                    </h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition">
                        <HiXMark className="w-5 h-5" />
                    </button>
                </div>

                {/* Plan selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Plan</label>
                    <div className="grid grid-cols-2 gap-3">
                        <PlanCard
                            planName="PLUS"
                            selected={plan === 'PLUS'}
                            onClick={() => setPlan('PLUS')}
                        />
                        <PlanCard
                            planName="PRO"
                            selected={plan === 'PRO'}
                            onClick={() => setPlan('PRO')}
                        />
                    </div>
                </div>

                {/* Duration */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Duree</label>
                    <div className="grid grid-cols-4 gap-2">
                        {durations.map((d) => (
                            <button
                                key={d.value}
                                onClick={() => setDurationMonths(d.value)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                                    durationMonths === d.value
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reason */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Raison <span className="text-slate-400 font-normal">(optionnel)</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value.slice(0, 200))}
                        placeholder="Raison du cadeau..."
                        rows={3}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                    />
                    <p className="text-xs text-slate-400 text-right mt-1">{reason.length}/200</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition disabled:opacity-50"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50"
                    >
                        {submitting ? 'Envoi...' : 'Confirmer'}
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
}

// ---------------------------------------------------------------------------
// Change Plan Modal
// ---------------------------------------------------------------------------

function ChangePlanModal({
    userName,
    userId,
    currentPlan,
    hasActiveSubscription,
    onClose,
    onSuccess,
}: {
    userName: string;
    userId: string;
    currentPlan: string;
    hasActiveSubscription: boolean;
    onClose: () => void;
    onSuccess: () => Promise<void>;
}) {
    const plans = ['FREE', 'PLUS', 'PRO'] as const;
    const [selectedPlan, setSelectedPlan] = useState(currentPlan);
    const [submitting, setSubmitting] = useState(false);

    const isDowngrade = plans.indexOf(selectedPlan as typeof plans[number]) < plans.indexOf(currentPlan as typeof plans[number]);
    const isChange = selectedPlan !== currentPlan;

    const handleSubmit = async () => {
        if (!isChange) return;
        setSubmitting(true);
        try {
            await axios.patch(`/api/admin/users/${userId}/change-plan`, { plan: selectedPlan });
            toast.success('Plan modifie avec succes');
            await onSuccess();
        } catch {
            toast.error('Erreur lors de la modification du plan');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                        Modifier le plan de {userName}
                    </h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition">
                        <HiXMark className="w-5 h-5" />
                    </button>
                </div>

                {/* Current plan */}
                <div>
                    <p className="text-sm text-slate-500 mb-1">Plan actuel</p>
                    <PlanBadge plan={currentPlan} size="md" />
                </div>

                {/* New plan selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nouveau plan</label>
                    <div className="grid grid-cols-3 gap-3">
                        {plans.map((p) => (
                            <PlanCard
                                key={p}
                                planName={p}
                                selected={selectedPlan === p}
                                onClick={() => setSelectedPlan(p)}
                                disabled={p === currentPlan}
                            />
                        ))}
                    </div>
                </div>

                {/* Downgrade warning */}
                {isDowngrade && hasActiveSubscription && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <HiExclamationTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                            L&apos;abonnement actif sera annule lors du passage a un plan inferieur.
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition disabled:opacity-50"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !isChange}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Modification...' : 'Confirmer'}
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
}

// ---------------------------------------------------------------------------
// Modal Overlay
// ---------------------------------------------------------------------------

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Modal card */}
            <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 z-10">
                {children}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Plan selection card
// ---------------------------------------------------------------------------

function PlanCard({
    planName,
    selected,
    onClick,
    disabled,
}: {
    planName: string;
    selected: boolean;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition text-sm font-semibold ${
                selected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : disabled
                        ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 cursor-pointer'
            }`}
        >
            <PlanBadge plan={planName} size="md" />
        </button>
    );
}

export default UserDetailClient;
