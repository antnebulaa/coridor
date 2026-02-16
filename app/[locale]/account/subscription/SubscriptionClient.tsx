'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from '@/i18n/navigation';
import { toast } from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import CustomToast from '@/components/ui/CustomToast';
import {
    Check, Lock, AlertTriangle, ArrowRight, RefreshCw, Gift, Sparkles, Crown,
    ChevronRight, ChevronDown, ChevronUp, FileText, CreditCard, X,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlanInfo {
    name: string;
    displayName: string;
    monthlyPrice: number;
    yearlyPrice: number;
    description: string;
    features: string[];
    highlightFeatures: string[];
}

interface CurrentSubscription {
    id: string;
    plan: string;
    status: 'ACTIVE' | 'GIFTED' | 'EXPIRED' | 'CANCELLED';
    startDate: string;
    endDate: string | null;
    isGifted: boolean;
    giftReason: string | null;
    daysRemaining: number;
    totalDays: number;
    percentRemaining: number;
}

interface SubscriptionHistoryItem {
    id: string;
    plan: string;
    status: string;
    startDate: string;
    endDate: string | null;
    isGifted: boolean;
    giftReason: string | null;
}

interface FeatureItem {
    label: string;
    includedIn: string[];
    included: boolean;
}

interface Invoice {
    id: string;
    amountCents: number;
    description: string;
    status: string;
    invoiceDate: string;
    pdfUrl: string | null;
}

interface SubscriptionData {
    plan: 'FREE' | 'PLUS' | 'PRO';
    planInfo: PlanInfo;
    currentSubscription: CurrentSubscription | null;
    subscriptionHistory: SubscriptionHistoryItem[];
    allFeatures: FeatureItem[];
    invoices: Invoice[];
    paymentMethod: null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateFR(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatDateShort(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDate();
    const monthNames = ['jan', 'fév', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

function getPlanBadgeStyles(plan: string): string {
    switch (plan) {
        case 'PLUS':
            return 'bg-red-500 text-white';
        case 'PRO':
            return 'bg-neutral-800 text-white';
        default:
            return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
    }
}

function getStatusBadgeStyles(status: string): string {
    switch (status) {
        case 'ACTIVE':
            return 'bg-green-100 text-green-700';
        case 'GIFTED':
            return 'bg-purple-100 text-purple-700';
        case 'EXPIRED':
            return 'bg-red-100 text-red-700';
        case 'CANCELLED':
            return 'bg-neutral-100 text-neutral-500';
        default:
            return 'bg-neutral-100 text-neutral-500';
    }
}

function getStatusLabel(status: string): string {
    switch (status) {
        case 'ACTIVE':
            return 'Actif';
        case 'GIFTED':
            return 'Offert';
        case 'EXPIRED':
            return 'Expiré';
        case 'CANCELLED':
            return 'Annulé';
        default:
            return status;
    }
}

function getStatusDotColor(status: string): string {
    switch (status) {
        case 'ACTIVE':
            return 'bg-green-500';
        case 'GIFTED':
            return 'bg-purple-500';
        case 'EXPIRED':
            return 'bg-red-500';
        case 'CANCELLED':
            return 'bg-neutral-400';
        default:
            return 'bg-neutral-400';
    }
}

function getProgressBarColor(daysRemaining: number): string {
    if (daysRemaining > 30) return 'bg-green-500';
    if (daysRemaining >= 7) return 'bg-orange-500';
    return 'bg-red-500';
}

function getLowestPlanForFeature(feature: FeatureItem): string | null {
    const planOrder = ['PLUS', 'PRO'];
    for (const plan of planOrder) {
        if (feature.includedIn.includes(plan)) {
            return plan;
        }
    }
    return null;
}

function getPlanDisplayName(plan: string): string {
    switch (plan) {
        case 'PLUS':
            return 'Plus';
        case 'PRO':
            return 'Pro';
        default:
            return plan;
    }
}

function getInvoiceStatusBadge(status: string): { label: string; style: string } {
    switch (status) {
        case 'PAID':
            return { label: 'Payé', style: 'bg-green-100 text-green-700' };
        case 'PENDING':
            return { label: 'En attente', style: 'bg-orange-100 text-orange-700' };
        case 'FAILED':
            return { label: 'Échoué', style: 'bg-red-100 text-red-700' };
        default:
            return { label: status, style: 'bg-neutral-100 text-neutral-500' };
    }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SubscriptionSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="pt-4">
                <div className="h-8 w-48 bg-neutral-200 rounded-lg animate-pulse" />
                <div className="h-4 w-96 bg-neutral-100 rounded-lg animate-pulse mt-3" />
            </div>
            <hr />

            {/* Plan summary card skeleton */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="h-9 w-32 bg-neutral-200 rounded-full animate-pulse" />
                        <div className="h-7 w-48 bg-neutral-200 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-neutral-100 rounded animate-pulse" />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <div className="h-4 w-20 bg-neutral-100 rounded animate-pulse" />
                            <div className="h-4 w-48 bg-neutral-100 rounded animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-28 bg-neutral-100 rounded animate-pulse" />
                            <div className="h-2.5 w-full bg-neutral-100 rounded-full animate-pulse" />
                            <div className="h-4 w-36 bg-neutral-100 rounded animate-pulse" />
                        </div>
                        <div className="flex justify-between">
                            <div className="h-4 w-28 bg-neutral-100 rounded animate-pulse" />
                            <div className="h-4 w-32 bg-neutral-100 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoices + Payment side by side skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-3">
                    <div className="h-6 w-24 bg-neutral-200 rounded animate-pulse" />
                    <div className="h-4 w-full bg-neutral-100 rounded animate-pulse" />
                    <div className="h-4 w-full bg-neutral-100 rounded animate-pulse" />
                </div>
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-3">
                    <div className="h-6 w-40 bg-neutral-200 rounded animate-pulse" />
                    <div className="h-4 w-56 bg-neutral-100 rounded animate-pulse" />
                    <div className="h-10 w-52 bg-neutral-100 rounded-xl animate-pulse mt-2" />
                </div>
            </div>

            {/* Actions skeleton */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                        <div className="h-4 w-40 bg-neutral-100 rounded animate-pulse" />
                        <div className="h-4 w-4 bg-neutral-100 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SubscriptionClient() {
    const [data, setData] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [featuresOpen, setFeaturesOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const fetchSubscription = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await axios.get('/api/account/subscription');
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch subscription:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    const handleCancelSubscription = async () => {
        setCancelling(true);
        try {
            await axios.post('/api/account/subscription/cancel');
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Votre abonnement a été annulé."
                    type="success"
                />
            ));
            setCancelModalOpen(false);
            fetchSubscription();
        } catch {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Une erreur est survenue lors de l'annulation."
                    type="error"
                />
            ));
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return <SubscriptionSkeleton />;
    }

    if (error || !data) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <PageHeader
                    title="Mon abonnement"
                    subtitle="Gérez votre plan, vos factures et votre moyen de paiement"
                />
                <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
                    <p className="text-neutral-600 mb-4">
                        Une erreur est survenue lors du chargement de votre abonnement.
                    </p>
                    <button
                        onClick={fetchSubscription}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition font-medium"
                    >
                        <RefreshCw size={16} />
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    const { plan, planInfo, currentSubscription, subscriptionHistory, allFeatures, invoices } = data;
    const isFreeWithNoSub = plan === 'FREE' && !currentSubscription;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PageHeader
                title="Mon abonnement"
                subtitle="Gérez votre plan, vos factures et votre moyen de paiement"
            />

            {/* ─── Section 1: Plan Summary ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left column */}
                    <div>
                        
                        <h2 className="text-2xl font-semibold text-neutral-900 mt-3">
                            Plan {planInfo.displayName}
                        </h2>
                        <p className="text-sm text-neutral-500 mt-1">
                            {planInfo.description}
                        </p>
                    </div>

                    {/* Right column */}
                    {currentSubscription && !isFreeWithNoSub ? (
                        <div className="space-y-2">
                            {/* Gift trial info */}
                            {currentSubscription.isGifted && (
                                <p className="text-sm text-neutral-700">
                                    Vous bénéficiez d&apos;un essai de {Math.max(1, Math.round(currentSubscription.totalDays / 30))} mois sur {planInfo.displayName}.
                                </p>
                            )}

                            {/* End date */}
                            {currentSubscription.endDate && (
                                <p className="text-sm text-neutral-600">
                                    Votre abonnement se termine le{' '}
                                    <span className="font-medium text-neutral-900">
                                        {formatDateFR(currentSubscription.endDate)}
                                    </span>.
                                </p>
                            )}

                            {/* Progress bar */}
                            {currentSubscription.endDate && (
                                <div>
                                    <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(currentSubscription.daysRemaining)}`}
                                            style={{ width: `${currentSubscription.percentRemaining}%` }}
                                        />
                                    </div>
                                    <p className="text-sm text-neutral-500 mt-1.5">
                                        {currentSubscription.daysRemaining} jours restants
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : isFreeWithNoSub ? (
                        /* Free plan CTA */
                        <div>
                            <p className="text-base font-medium text-neutral-900">
                                Vous êtes sur le plan gratuit
                            </p>
                            <p className="text-sm text-neutral-500 mt-1">
                                Passez à Plus pour débloquer le suivi des paiements, la génération de baux, et bien plus.
                            </p>
                            <Link
                                href="/pricing"
                                className="inline-flex items-center gap-2 bg-neutral-900 text-white rounded-xl px-5 py-3 font-medium text-sm hover:bg-neutral-800 transition mt-4"
                            >
                                Passer à Plus — {planInfo.monthlyPrice}\u20AC/mois
                                <ArrowRight size={16} />
                            </Link>
                            {planInfo.highlightFeatures.length > 0 && (
                                <ul className="mt-4 space-y-1.5">
                                    {planInfo.highlightFeatures.map((feat, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm text-neutral-600">
                                            <Check size={14} className="text-green-500 shrink-0" />
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Expiration alert */}
                {currentSubscription &&
                    currentSubscription.daysRemaining <= 7 &&
                    currentSubscription.daysRemaining > 0 && (
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6">
                            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-amber-800">
                                    Votre abonnement {planInfo.displayName} expire dans{' '}
                                    {currentSubscription.daysRemaining} jours.
                                    Renouvelez pour ne pas perdre vos fonctionnalités.
                                </p>
                            </div>
                        </div>
                    )}

                {/* Change plan button */}
                <div className="mt-6 pt-6 border-t border-neutral-100">
                    <Link
                        href="/pricing"
                        className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition"
                    >
                        Modifier mon abonnement
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            {/* ─── Section 2 & 3: Invoices + Payment Method ────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 2: Factures */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText size={18} className="text-neutral-700" />
                        <h2 className="text-lg font-semibold text-neutral-900">Factures</h2>
                    </div>

                    {invoices.length > 0 ? (
                        <div>
                            {/* Header row */}
                            <div className="grid grid-cols-4 gap-2 pb-2 border-b border-neutral-100">
                                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Date</span>
                                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Description</span>
                                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Montant</span>
                                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Statut</span>
                            </div>
                            {/* Invoice rows */}
                            {invoices.map((invoice) => {
                                const statusBadge = getInvoiceStatusBadge(invoice.status);
                                return (
                                    <div
                                        key={invoice.id}
                                        className="grid grid-cols-4 gap-2 py-2.5 border-b border-neutral-50 last:border-b-0"
                                    >
                                        <span className="text-sm text-neutral-700">
                                            {formatDateShort(invoice.invoiceDate)}
                                        </span>
                                        <span className="text-sm text-neutral-700 truncate">
                                            {invoice.description}
                                        </span>
                                        <span className="text-sm font-medium text-neutral-900">
                                            {invoice.amountCents === 0
                                                ? 'Gratuit'
                                                : `${(invoice.amountCents / 100).toFixed(2)}\u20AC`}
                                        </span>
                                        <span>
                                            <span
                                                className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge.style}`}
                                            >
                                                {statusBadge.label}
                                            </span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-neutral-500">Aucune facture</p>
                            <p className="text-xs text-neutral-400 mt-1">
                                Les factures apparaîtront ici lors de vos prochains paiements.
                            </p>
                        </div>
                    )}
                </div>

                {/* Card 3: Moyen de paiement */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <CreditCard size={18} className="text-neutral-700" />
                        <h2 className="text-lg font-semibold text-neutral-900">Moyen de paiement</h2>
                    </div>

                    <p className="text-sm text-neutral-500">
                        Aucun moyen de paiement enregistré
                    </p>
                    <button
                        disabled
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-medium opacity-50 cursor-not-allowed"
                    >
                        Ajouter un moyen de paiement
                    </button>
                    <p className="text-xs text-neutral-400 mt-2">
                        L&apos;intégration Stripe arrive bientôt.
                    </p>
                </div>
            </div>

            {/* ─── Section 4: Features (collapsible) ───────────────────────────── */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900">
                    Fonctionnalités incluses
                </h2>
                <button
                    onClick={() => setFeaturesOpen(!featuresOpen)}
                    className="flex items-center gap-1.5 mt-2 text-sm text-neutral-500 hover:text-neutral-700 transition"
                >
                    {featuresOpen ? (
                        <ChevronUp size={16} />
                    ) : (
                        <ChevronDown size={16} />
                    )}
                    {featuresOpen ? 'Masquer' : `Voir les ${allFeatures.length} fonctionnalités`}
                </button>

                {featuresOpen && (
                    <div className="mt-4 space-y-2">
                        {allFeatures.map((feature, idx) => {
                            const isIncluded = feature.included;
                            const lowestPlan = !isIncluded ? getLowestPlanForFeature(feature) : null;

                            return (
                                <div
                                    key={idx}
                                    className={`flex items-center gap-3 py-1.5 ${!isIncluded ? 'opacity-50' : ''}`}
                                >
                                    {isIncluded ? (
                                        <Check size={18} className="text-green-500 shrink-0" />
                                    ) : (
                                        <Lock size={18} className="text-neutral-400 shrink-0" />
                                    )}
                                    <span
                                        className={`text-sm ${isIncluded ? 'text-neutral-700' : 'text-neutral-400'}`}
                                    >
                                        {feature.label}
                                    </span>
                                    {!isIncluded && lowestPlan && (
                                        <span className="text-xs text-neutral-400 ml-auto">
                                            Disponible avec {getPlanDisplayName(lowestPlan)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── Section 5: History (collapsible) ────────────────────────────── */}
            {subscriptionHistory.length > 0 && (
                <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                    <h2 className="text-lg font-semibold text-neutral-900">
                        Historique des changements
                    </h2>
                    <button
                        onClick={() => setHistoryOpen(!historyOpen)}
                        className="flex items-center gap-1.5 mt-2 text-sm text-neutral-500 hover:text-neutral-700 transition"
                    >
                        {historyOpen ? (
                            <ChevronUp size={16} />
                        ) : (
                            <ChevronDown size={16} />
                        )}
                        {historyOpen
                            ? 'Masquer'
                            : `Voir ${subscriptionHistory.length} changement${subscriptionHistory.length > 1 ? 's' : ''}`}
                    </button>

                    {historyOpen && (
                        <div className="mt-4">
                            <div className="relative border-l-2 border-neutral-200 ml-3 space-y-6">
                                {subscriptionHistory.map((item) => (
                                    <div key={item.id} className="relative pl-6">
                                        {/* Dot */}
                                        <div
                                            className={`w-3 h-3 rounded-full absolute -left-[7px] top-1.5 ${getStatusDotColor(item.status)}`}
                                        />

                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            {/* Plan badge */}
                                            <span
                                                className={`inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full ${getPlanBadgeStyles(item.plan)}`}
                                            >
                                                {getPlanDisplayName(item.plan)}
                                            </span>

                                            {/* Status badge */}
                                            <span
                                                className={`inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusBadgeStyles(item.status)}`}
                                            >
                                                {getStatusLabel(item.status)}
                                            </span>

                                            {item.isGifted && (
                                                <span className="inline-flex items-center gap-1 text-xs text-purple-600">
                                                    <Gift size={12} />
                                                    Offert
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-neutral-500 mt-1">
                                            {formatDateFR(item.startDate)}
                                            {' \u2192 '}
                                            {item.endDate ? formatDateFR(item.endDate) : 'En cours'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Section 6: Actions ──────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                {/* Action 1: Annuler l'abonnement */}
                {currentSubscription &&
                    (currentSubscription.status === 'ACTIVE' || currentSubscription.status === 'GIFTED') && (
                        <>
                            <button
                                onClick={() => setCancelModalOpen(true)}
                                className="w-full flex items-center justify-between py-3 group text-left"
                            >
                                <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition">
                                    Annuler l&apos;abonnement
                                </span>
                                <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-700 transition" />
                            </button>
                            <div className="border-t border-neutral-100" />
                        </>
                    )}

                {/* Action 2: Contacter le support */}
                <a
                    href="mailto:support@coridor.fr"
                    className="flex items-center justify-between py-3 group"
                >
                    <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition">
                        Contacter le support
                    </span>
                    <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-700 transition" />
                </a>
            </div>

            {/* ─── Cancellation Modal ──────────────────────────────────────────── */}
            {cancelModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-6 max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-neutral-900">
                                Annuler votre abonnement ?
                            </h3>
                            <button
                                onClick={() => setCancelModalOpen(false)}
                                className="text-neutral-400 hover:text-neutral-600 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-neutral-600 mb-6">
                            Votre abonnement restera actif jusqu&apos;au{' '}
                            {currentSubscription?.endDate
                                ? formatDateFR(currentSubscription.endDate)
                                : 'la fin de la période en cours'}
                            . Après cette date, vous passerez automatiquement au plan Gratuit.
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCancelModalOpen(false)}
                                className="flex-1 bg-neutral-900 text-white rounded-xl px-5 py-3 font-medium text-sm hover:bg-neutral-800 transition"
                            >
                                Garder mon abonnement
                            </button>
                            <button
                                onClick={handleCancelSubscription}
                                disabled={cancelling}
                                className="flex-1 border border-red-200 text-red-600 rounded-xl px-5 py-3 font-medium text-sm hover:bg-red-50 transition disabled:opacity-50"
                            >
                                {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
