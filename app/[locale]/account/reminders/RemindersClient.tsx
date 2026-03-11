'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import PageHeader from "@/components/PageHeader";
import { Link } from "@/i18n/navigation";
import {
    Zap,
    Flame,
    AlertTriangle,
    Snowflake,
    Calendar,
    TrendingUp,
    Receipt,
    Wallet,
    Shield,
    FileText,
    Check,
    X,
    ExternalLink,
    MapPin,
    Loader2,
    Scale,
    Thermometer,
    Building2,
    BadgePercent,
    Home,
    Landmark,
    Briefcase,
    ClipboardList,
    ShieldCheck,
    Wrench,
    BatteryWarning,
    Bell,
} from 'lucide-react';

// ---------- Types ----------

interface ReminderProperty {
    address?: string;
    city?: string;
}

interface Reminder {
    id: string;
    type: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description?: string;
    legalReference?: string;
    actionUrl?: string;
    dueDate: string;
    reminderDate: string;
    status: 'PENDING' | 'UPCOMING' | 'NOTIFIED' | 'COMPLETED' | 'DISMISSED' | 'OVERDUE';
    propertyId?: string;
    property?: ReminderProperty;
    createdAt: string;
}

type CategoryFilter = 'ALL' | 'DIAGNOSTICS' | 'BAIL' | 'CHARGES' | 'FISCALITE' | 'OBLIGATIONS';
type StatusFilter = 'TODO' | 'OVERDUE' | 'COMPLETED';

// ---------- Constants ----------

const CATEGORY_TYPES: Record<string, string[]> = {
    DIAGNOSTICS: ['DPE_EXPIRY', 'ELECTRICAL_DIAGNOSTIC_EXPIRY', 'GAS_DIAGNOSTIC_EXPIRY', 'ERP_EXPIRY', 'RENT_FREEZE_DPE_FG', 'ENERGY_BAN_DEADLINE'],
    BAIL: ['LEASE_END_NOTICE_LANDLORD', 'DEPOSIT_RETURN_DEADLINE', 'TENANT_INSURANCE_CHECK'],
    CHARGES: ['CHARGES_REGULARIZATION', 'RENT_REVISION_IRL', 'TEOM_RECOVERY'],
    FISCALITE: ['TAX_DECLARATION_DEADLINE', 'PROPERTY_TAX_DEADLINE', 'VACANT_PROPERTY_TAX', 'SECONDARY_RESIDENCE_TAX', 'CFE_DEADLINE', 'SOCIAL_CONTRIBUTIONS_INFO'],
    OBLIGATIONS: ['OCCUPANCY_DECLARATION', 'PNO_INSURANCE_RENEWAL', 'BOILER_MAINTENANCE_CHECK', 'SMOKE_DETECTOR_CHECK'],
};

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
    ALL: 'Tous',
    DIAGNOSTICS: 'Diagnostics',
    BAIL: 'Bail',
    CHARGES: 'Charges',
    FISCALITE: 'Fiscalité',
    OBLIGATIONS: 'Obligations',
};

const STATUS_LABELS: Record<StatusFilter, string> = {
    TODO: 'À faire',
    OVERDUE: 'En retard',
    COMPLETED: 'Complétés',
};

const PRIORITY_STYLES: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    LOW: 'bg-gray-100 text-gray-600',
};

const PRIORITY_LABELS: Record<string, string> = {
    CRITICAL: 'CRITIQUE',
    HIGH: 'IMPORTANT',
    MEDIUM: 'MOYEN',
    LOW: 'FAIBLE',
};

// ---------- Helpers ----------

function getIconForType(type: string) {
    switch (type) {
        case 'DPE_EXPIRY':
            return Thermometer;
        case 'ELECTRICAL_DIAGNOSTIC_EXPIRY':
            return Zap;
        case 'GAS_DIAGNOSTIC_EXPIRY':
            return Flame;
        case 'ERP_EXPIRY':
            return AlertTriangle;
        case 'RENT_FREEZE_DPE_FG':
            return Snowflake;
        case 'LEASE_END_NOTICE_LANDLORD':
            return Calendar;
        case 'RENT_REVISION_IRL':
            return TrendingUp;
        case 'CHARGES_REGULARIZATION':
            return Receipt;
        case 'DEPOSIT_RETURN_DEADLINE':
            return Wallet;
        case 'TENANT_INSURANCE_CHECK':
            return Shield;
        case 'TAX_DECLARATION_DEADLINE':
            return FileText;
        case 'PROPERTY_TAX_DEADLINE':
            return Landmark;
        case 'TEOM_RECOVERY':
            return BadgePercent;
        case 'VACANT_PROPERTY_TAX':
            return Home;
        case 'SECONDARY_RESIDENCE_TAX':
            return Building2;
        case 'CFE_DEADLINE':
            return Briefcase;
        case 'SOCIAL_CONTRIBUTIONS_INFO':
            return Receipt;
        case 'OCCUPANCY_DECLARATION':
            return ClipboardList;
        case 'PNO_INSURANCE_RENEWAL':
            return ShieldCheck;
        case 'BOILER_MAINTENANCE_CHECK':
            return Wrench;
        case 'ENERGY_BAN_DEADLINE':
            return BatteryWarning;
        case 'SMOKE_DETECTOR_CHECK':
            return Bell;
        default:
            return Scale;
    }
}

function getCardStyles(status: string) {
    switch (status) {
        case 'OVERDUE':
            return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
        case 'UPCOMING':
        case 'NOTIFIED':
            return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800';
        case 'COMPLETED':
            return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
        case 'DISMISSED':
            return 'bg-gray-50 dark:bg-neutral-800/50 border-gray-200 dark:border-neutral-700';
        case 'PENDING':
            return 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700';
        default:
            return 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700';
    }
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatRelative(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `il y a ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`;
    if (diffDays === 0) return "aujourd'hui";
    if (diffDays === 1) return 'demain';
    if (diffDays < 30) return `dans ${diffDays} jours`;
    const months = Math.round(diffDays / 30);
    if (months === 1) return 'dans 1 mois';
    return `dans ${months} mois`;
}

function sortByUrgency(a: Reminder, b: Reminder): number {
    const statusOrder: Record<string, number> = {
        OVERDUE: 0,
        NOTIFIED: 1,
        UPCOMING: 2,
        PENDING: 3,
        COMPLETED: 4,
        DISMISSED: 5,
    };
    const aOrder = statusOrder[a.status] ?? 3;
    const bOrder = statusOrder[b.status] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

// ---------- Component ----------

export default function RemindersClient() {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODO');

    const fetchReminders = useCallback(async () => {
        try {
            const res = await axios.get('/api/reminders');
            const data = res.data;
            setReminders(Array.isArray(data) ? data : data.reminders || []);
        } catch (error) {
            console.error('Failed to fetch reminders:', error);
            toast.error('Erreur lors du chargement des rappels');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    // ---------- Actions ----------

    const handleComplete = async (id: string) => {
        setActionLoading(id);
        try {
            await axios.patch(`/api/reminders/${id}/complete`);
            toast.success('Rappel marqué comme fait');
            await fetchReminders();
        } catch (error) {
            console.error('Failed to complete reminder:', error);
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDismiss = async (id: string) => {
        setActionLoading(id);
        try {
            await axios.patch(`/api/reminders/${id}/dismiss`, { reason: 'Ignoré par le propriétaire' });
            toast.success('Rappel ignoré');
            await fetchReminders();
        } catch (error) {
            console.error('Failed to dismiss reminder:', error);
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setActionLoading(null);
        }
    };

    // ---------- Computed ----------

    const overdueCount = reminders.filter(r => r.status === 'OVERDUE').length;
    const upcomingCount = reminders.filter(r => ['UPCOMING', 'NOTIFIED', 'PENDING'].includes(r.status)).length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedThisMonth = reminders.filter(r =>
        r.status === 'COMPLETED' && new Date(r.createdAt) >= startOfMonth
    ).length;

    const filteredReminders = reminders
        .filter(r => {
            // Category filter
            if (categoryFilter !== 'ALL') {
                const types = CATEGORY_TYPES[categoryFilter];
                if (!types?.includes(r.type)) return false;
            }
            // Status filter
            switch (statusFilter) {
                case 'TODO':
                    return ['UPCOMING', 'NOTIFIED', 'PENDING'].includes(r.status);
                case 'OVERDUE':
                    return r.status === 'OVERDUE';
                case 'COMPLETED':
                    return ['COMPLETED', 'DISMISSED'].includes(r.status);
                default:
                    return true;
            }
        })
        .sort(sortByUrgency);

    // ---------- Render ----------

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PageHeader
                title="Rappels légaux"
                subtitle="Échéances et obligations à ne pas oublier"
            />

            {/* Counters */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{overdueCount}</div>
                    <div className="text-sm text-red-600 dark:text-red-500">en retard</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{upcomingCount}</div>
                    <div className="text-sm text-orange-600 dark:text-orange-500">à venir</div>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{completedThisMonth}</div>
                    <div className="text-sm text-green-600 dark:text-green-500">complétés ce mois</div>
                </div>
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                            categoryFilter === cat
                                ? 'bg-neutral-900 text-white'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                    >
                        {CATEGORY_LABELS[cat]}
                    </button>
                ))}
            </div>

            {/* Status filters */}
            <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((st) => (
                    <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                            statusFilter === st
                                ? 'bg-neutral-900 text-white'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                    >
                        {STATUS_LABELS[st]}
                    </button>
                ))}
            </div>

            {/* Reminders list */}
            {filteredReminders.length === 0 ? (
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <Scale className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-white">Aucun rappel</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                        {statusFilter === 'COMPLETED'
                            ? 'Aucun rappel complété pour le moment.'
                            : statusFilter === 'OVERDUE'
                            ? 'Aucun rappel en retard. Tout est en ordre !'
                            : 'Aucun rappel à afficher avec ces filtres.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReminders.map((reminder) => {
                        const Icon = getIconForType(reminder.type);
                        const isCompleted = ['COMPLETED', 'DISMISSED'].includes(reminder.status);
                        const isProcessing = actionLoading === reminder.id;

                        return (
                            <div
                                key={reminder.id}
                                className={`rounded-2xl border p-5 transition-all hover:shadow-md ${getCardStyles(reminder.status)}`}
                            >
                                {/* Header: priority badge + due date */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${PRIORITY_STYLES[reminder.priority]}`}>
                                        {PRIORITY_LABELS[reminder.priority]}
                                    </span>
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                        Échéance {formatRelative(reminder.dueDate)} · {formatDate(reminder.dueDate)}
                                    </span>
                                </div>

                                {/* Title + description */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-xl shrink-0">
                                        <Icon size={20} className="text-neutral-700 dark:text-neutral-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-semibold text-neutral-900 dark:text-white ${isCompleted ? 'line-through opacity-60' : ''}`}>
                                            {reminder.title}
                                        </h3>
                                        {reminder.description && (
                                            <p className={`text-sm text-neutral-600 dark:text-neutral-400 mt-1 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                                                {reminder.description}
                                            </p>
                                        )}
                                        {reminder.legalReference && (
                                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                                                Réf. : {reminder.legalReference}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Property location */}
                                {reminder.property && (reminder.property.address || reminder.property.city) && (
                                    <div className="flex items-center gap-1.5 text-sm text-neutral-500 mb-4">
                                        <MapPin size={14} />
                                        <span>
                                            {[reminder.property.address, reminder.property.city].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                )}

                                {/* Actions */}
                                {!isCompleted && (
                                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/50">
                                        <button
                                            onClick={() => handleComplete(reminder.id)}
                                            disabled={isProcessing}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                                        >
                                            {isProcessing ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Check size={14} />
                                            )}
                                            Fait
                                        </button>
                                        <button
                                            onClick={() => handleDismiss(reminder.id)}
                                            disabled={isProcessing}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-neutral-600 text-sm font-medium rounded-lg hover:bg-neutral-200 transition disabled:opacity-50"
                                        >
                                            <X size={14} />
                                            Ignorer
                                        </button>
                                        {reminder.actionUrl && (
                                            <Link
                                                href={reminder.actionUrl}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-neutral-600 text-sm font-medium rounded-lg hover:bg-neutral-200 transition ml-auto"
                                            >
                                                <ExternalLink size={14} />
                                                Voir le bien
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
