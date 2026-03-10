'use client';

import { Link } from '@/i18n/navigation';
import { RentTrackingItem } from '@/app/actions/getFinancialOverview';
import { AlertTriangle, Check, Clock, MessageCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import CustomToast from '@/components/ui/CustomToast';

interface RentTrackingTabProps {
    data: RentTrackingItem[];
}

function formatCents(cents: number): string {
    return Math.round(cents / 100).toLocaleString('fr-FR');
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

const RentTrackingTab: React.FC<RentTrackingTabProps> = ({ data }) => {
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);
    const [showPaid, setShowPaid] = useState(false);

    const overdue = data.filter(d => d.status === 'OVERDUE' || d.status === 'LATE');
    const pending = data.filter(d => d.status === 'PENDING');
    const paid = data.filter(d => d.status === 'PAID');

    const handleSendReminder = async (item: RentTrackingItem) => {
        if (!item.applicationId) return;
        setSendingReminder(item.id);
        try {
            await axios.post(`/api/rent-tracking/${item.id}/send-reminder`);
            toast.custom((t) => (
                <CustomToast t={t} message="Rappel envoyé" type="success" />
            ));
        } catch {
            toast.custom((t) => (
                <CustomToast t={t} message="Erreur lors de l'envoi" type="error" />
            ));
        } finally {
            setSendingReminder(null);
        }
    };

    if (data.length === 0) {
        return (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500">
                Aucun suivi de loyer ce mois
            </div>
        );
    }

    const renderCard = (item: RentTrackingItem, variant: 'overdue' | 'pending' | 'paid') => {
        const isOverdue = variant === 'overdue';
        const isSevere = isOverdue && (item.daysOverdue ?? 0) > 15;
        const isPaid = variant === 'paid';

        const cardBg = isSevere
            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
            : isOverdue
                ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50'
                : isPaid
                    ? 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800';

        return (
            <div
                key={item.id}
                className={`rounded-xl border p-4 ${cardBg} transition-all`}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className={`text-sm font-medium ${
                            isPaid
                                ? 'text-neutral-500 dark:text-neutral-400'
                                : 'text-neutral-900 dark:text-white'
                        }`}>
                            {item.propertyTitle} · {item.tenantName}
                        </p>
                        <p className={`text-sm mt-0.5 tabular-nums ${
                            isPaid
                                ? 'text-neutral-400 dark:text-neutral-500'
                                : 'text-neutral-600 dark:text-neutral-400'
                        }`}>
                            {formatCents(item.amount)} €
                            {isPaid && item.paidDate
                                ? ` · Payé le ${formatDate(item.paidDate)}`
                                : ` · Dû le ${formatDate(item.dueDate)}`
                            }
                            {item.daysOverdue && item.daysOverdue > 0 && (
                                <span className="text-red-500 font-medium"> · {item.daysOverdue} jour{item.daysOverdue > 1 ? 's' : ''} de retard</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Action buttons for overdue/pending */}
                {!isPaid && (
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => handleSendReminder(item)}
                            disabled={sendingReminder === item.id}
                            className="text-sm font-medium px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        >
                            {sendingReminder === item.id ? 'Envoi...' : isSevere ? 'Relancer' : 'Envoyer un rappel'}
                        </button>
                        {item.conversationId && (
                            <Link
                                href={`/inbox/${item.conversationId}`}
                                className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 px-3 py-2"
                            >
                                <MessageCircle size={14} />
                                Conversation →
                            </Link>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Overdue section */}
            {overdue.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3 text-red-500">
                        <AlertTriangle size={16} />
                        <span className="text-sm font-semibold">En retard</span>
                    </div>
                    <div className="space-y-2">
                        {overdue.map(item => renderCard(item, 'overdue'))}
                    </div>
                </div>
            )}

            {/* Pending section */}
            {pending.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3 text-amber-500">
                        <Clock size={16} />
                        <span className="text-sm font-semibold">En attente</span>
                    </div>
                    <div className="space-y-2">
                        {pending.map(item => renderCard(item, 'pending'))}
                    </div>
                </div>
            )}

            {/* Paid section — collapsible */}
            {paid.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowPaid(!showPaid)}
                        className="flex items-center gap-2 mb-3 text-emerald-500 group"
                    >
                        <Check size={16} />
                        <span className="text-sm font-semibold">Payés ({paid.length})</span>
                        <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${showPaid ? 'rotate-0' : '-rotate-90'}`}
                        />
                    </button>
                    {showPaid && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            {paid.map(item => renderCard(item, 'paid'))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RentTrackingTab;
