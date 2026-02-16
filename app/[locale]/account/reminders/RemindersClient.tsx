'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
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

type CategoryFilter = 'ALL' | 'DIAGNOSTICS' | 'BAIL' | 'CHARGES' | 'FISCALITE';
type StatusFilter = 'TODO' | 'OVERDUE' | 'COMPLETED';

// ---------- Constants ----------

const CATEGORY_TYPES: Record<string, string[]> = {
    DIAGNOSTICS: ['DPE_EXPIRY', 'ELECTRICAL_DIAGNOSTIC_EXPIRY', 'GAS_DIAGNOSTIC_EXPIRY', 'ERP_EXPIRY', 'RENT_FREEZE_DPE_FG'],
    BAIL: ['LEASE_END_NOTICE_LANDLORD', 'DEPOSIT_RETURN_DEADLINE', 'TENANT_INSURANCE_CHECK'],
    CHARGES: ['CHARGES_REGULARIZATION', 'RENT_REVISION_IRL'],
    FISCALITE: ['TAX_DECLARATION_DEADLINE'],
};

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
    ALL: 'Tous',
    DIAGNOSTICS: 'Diagnostics',
    BAIL: 'Bail',
    CHARGES: 'Charges',
    FISCALITE: 'Fiscalite',
};

const STATUS_LABELS: Record<StatusFilter, string> = {
    TODO: 'A faire',
    OVERDUE: 'En retard',
    COMPLETED: 'Completes',
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
        default:
            return Scale;
    }
}

function getCardStyles(status: string) {
    switch (status) {
        case 'OVERDUE':
            return 'bg-red-50 border-red-200';
        case 'UPCOMING':
        case 'NOTIFIED':
            return 'bg-orange-50 border-orange-200';
        case 'COMPLETED':
            return 'bg-green-50 border-green-200';
        case 'DISMISSED':
            return 'bg-gray-50 border-gray-200';
        default:
            return 'bg-white border-neutral-200';
    }
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
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
            setReminders(res.data.reminders || []);
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
            toast.success('Rappel marque comme fait');
            await fetchReminders();
        } catch (error) {
            console.error('Failed to complete reminder:', error);
            toast.error('Erreur lors de la mise a jour');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDismiss = async (id: string) => {
        setActionLoading(id);
        try {
            await axios.patch(`/api/reminders/${id}/dismiss`, { reason: 'Ignore par le proprietaire' });
            toast.success('Rappel ignore');
            await fetchReminders();
        } catch (error) {
            console.error('Failed to dismiss reminder:', error);
            toast.error('Erreur lors de la mise a jour');
        } finally {
            setActionLoading(null);
        }
    };

    // ---------- Computed ----------

    const overdueCount = reminders.filter(r => r.status === 'OVERDUE').length;
    const upcomingCount = reminders.filter(r => ['UPCOMING', 'NOTIFIED'].includes(r.status)).length;
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
                title="Rappels legaux"
                subtitle="Echeances et obligations a ne pas oublier"
            />

            {/* Counters */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-700">{overdueCount}</div>
                    <div className="text-sm text-red-600">en retard</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-orange-700">{upcomingCount}</div>
                    <div className="text-sm text-orange-600">a venir</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">{completedThisMonth}</div>
                    <div className="text-sm text-green-600">completes ce mois</div>
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
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
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
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                    >
                        {STATUS_LABELS[st]}
                    </button>
                ))}
            </div>

            {/* Reminders list */}
            {filteredReminders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
                        <Scale className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-neutral-900">Aucun rappel</h3>
                    <p className="text-neutral-500 max-w-md mx-auto">
                        {statusFilter === 'COMPLETED'
                            ? 'Aucun rappel complete pour le moment.'
                            : statusFilter === 'OVERDUE'
                            ? 'Aucun rappel en retard. Tout est en ordre !'
                            : 'Aucun rappel a afficher avec ces filtres.'}
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
                                    <span className="text-sm text-neutral-500">
                                        Echeance : {formatDate(reminder.dueDate)}
                                    </span>
                                </div>

                                {/* Title + description */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 bg-white border border-neutral-200 rounded-xl shrink-0">
                                        <Icon size={20} className="text-neutral-700" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-semibold text-neutral-900 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                                            {reminder.title}
                                        </h3>
                                        {reminder.description && (
                                            <p className={`text-sm text-neutral-600 mt-1 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                                                {reminder.description}
                                            </p>
                                        )}
                                        {reminder.legalReference && (
                                            <p className="text-xs text-neutral-400 mt-1">
                                                Ref. : {reminder.legalReference}
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
