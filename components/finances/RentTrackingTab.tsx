'use client';

import { Link } from '@/i18n/navigation';
import { RentTrackingItem } from '@/app/actions/getFinancialOverview';
import { AlertTriangle, Check, Clock, MessageCircle } from 'lucide-react';
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

    const overdue = data.filter(d => d.status === 'OVERDUE');
    const late = data.filter(d => d.status === 'LATE');
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

    const renderGroup = (
        items: RentTrackingItem[],
        label: string,
        icon: React.ReactNode,
        colorClass: string,
        showActions: boolean
    ) => {
        if (items.length === 0) return null;

        return (
            <div className="mb-6 last:mb-0">
                <div className={`flex items-center gap-2 mb-3 ${colorClass}`}>
                    {icon}
                    <span className="text-sm font-semibold">{label}</span>
                </div>

                <div className="space-y-2">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={`rounded-xl border p-4 ${
                                showActions
                                    ? 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10'
                                    : item.status === 'PAID'
                                        ? 'border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30'
                                        : 'border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={`text-sm font-medium ${
                                        item.status === 'PAID'
                                            ? 'text-neutral-500 dark:text-neutral-400'
                                            : 'text-neutral-900 dark:text-white'
                                    }`}>
                                        {item.propertyTitle} · {item.tenantName}
                                    </p>
                                    <p className={`text-sm mt-0.5 tabular-nums ${
                                        item.status === 'PAID'
                                            ? 'text-neutral-400 dark:text-neutral-500'
                                            : 'text-neutral-600 dark:text-neutral-400'
                                    }`}>
                                        {formatCents(item.amount)} €
                                        {item.status === 'PAID' && item.paidDate
                                            ? ` · Payé le ${formatDate(item.paidDate)}`
                                            : ` · Dû le ${formatDate(item.dueDate)}`
                                        }
                                        {item.daysOverdue && item.daysOverdue > 0 && (
                                            <span className="text-red-500"> · {item.daysOverdue} jour{item.daysOverdue > 1 ? 's' : ''} de retard</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {showActions && (
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => handleSendReminder(item)}
                                        disabled={sendingReminder === item.id}
                                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                                    >
                                        {sendingReminder === item.id ? 'Envoi...' : 'Envoyer un rappel'}
                                    </button>
                                    {item.conversationId && (
                                        <Link
                                            href={`/inbox/${item.conversationId}`}
                                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition flex items-center gap-1"
                                        >
                                            <MessageCircle size={12} />
                                            Conversation
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div>
            {renderGroup(overdue, 'En retard', <AlertTriangle size={16} />, 'text-red-500', true)}
            {renderGroup(late, 'En retard', <AlertTriangle size={16} />, 'text-red-500', true)}
            {renderGroup(pending, 'En attente', <Clock size={16} />, 'text-amber-500', false)}
            {renderGroup(paid, 'Payés', <Check size={16} />, 'text-emerald-500', false)}
        </div>
    );
};

export default RentTrackingTab;
