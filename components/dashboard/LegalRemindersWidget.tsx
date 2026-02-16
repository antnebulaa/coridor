'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from "next/link";
import { Scale, ArrowRight, CheckCircle2 } from 'lucide-react';

interface WidgetReminder {
    id: string;
    type: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    dueDate: string;
    status: string;
}

const PRIORITY_BADGE: Record<string, { label: string; style: string }> = {
    CRITICAL: { label: 'CRITIQUE', style: 'text-red-600 font-semibold' },
    HIGH: { label: 'IMPORTANT', style: 'text-orange-600 font-semibold' },
    MEDIUM: { label: 'MOYEN', style: 'text-blue-600 font-medium' },
    LOW: { label: 'FAIBLE', style: 'text-gray-500 font-medium' },
};

function formatShortDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
    });
}

const LegalRemindersWidget = () => {
    const [reminders, setReminders] = useState<WidgetReminder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReminders = async () => {
            try {
                const res = await axios.get('/api/reminders?status=UPCOMING,NOTIFIED,OVERDUE');
                setReminders(res.data.reminders || []);
            } catch (error) {
                console.error('Failed to fetch legal reminders:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchReminders();
    }, []);

    if (loading) {
        return (
            <div className="bg-white p-5 rounded-xl border border-neutral-200 animate-pulse">
                <div className="h-6 w-48 bg-neutral-100 rounded mb-4" />
                <div className="space-y-3">
                    <div className="h-4 w-full bg-neutral-100 rounded" />
                    <div className="h-4 w-3/4 bg-neutral-100 rounded" />
                </div>
            </div>
        );
    }

    const overdueCount = reminders.filter(r => r.status === 'OVERDUE').length;
    const upcomingCount = reminders.filter(r => ['UPCOMING', 'NOTIFIED'].includes(r.status)).length;
    const hasOverdue = overdueCount > 0;
    const displayReminders = reminders.slice(0, 5);

    return (
        <div className={`bg-white p-5 rounded-xl border ${hasOverdue ? 'border-red-300' : 'border-neutral-200'} transition`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-neutral-800 flex items-center gap-2">
                    <Scale className="w-5 h-5" />
                    Rappels legaux
                </h3>
                <Link
                    href="/account/reminders"
                    className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition"
                >
                    Voir
                    <ArrowRight size={14} />
                </Link>
            </div>

            {/* Content */}
            {reminders.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600 py-2">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-medium">Tout est en ordre</span>
                </div>
            ) : (
                <>
                    {/* Summary */}
                    <div className="flex items-center gap-3 mb-4 text-sm">
                        {overdueCount > 0 && (
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <span className="text-red-700 font-medium">{overdueCount} en retard</span>
                            </span>
                        )}
                        {upcomingCount > 0 && (
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                <span className="text-orange-700 font-medium">{upcomingCount} a venir</span>
                            </span>
                        )}
                    </div>

                    {/* Reminder items */}
                    <div className="space-y-2">
                        {displayReminders.map((reminder) => {
                            const badge = PRIORITY_BADGE[reminder.priority] || PRIORITY_BADGE.MEDIUM;
                            return (
                                <div
                                    key={reminder.id}
                                    className="flex items-center justify-between py-1.5"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                            reminder.status === 'OVERDUE' ? 'bg-red-500' : 'bg-orange-400'
                                        }`} />
                                        <span className="text-sm text-neutral-700 truncate">
                                            {reminder.title.length > 35
                                                ? reminder.title.substring(0, 35) + '...'
                                                : reminder.title}
                                        </span>
                                    </div>
                                    <span className={`text-xs shrink-0 ml-2 ${badge.style}`}>
                                        {badge.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* See all link */}
                    {reminders.length > 5 && (
                        <div className="mt-3 pt-3 border-t border-neutral-100">
                            <Link
                                href="/account/reminders"
                                className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition"
                            >
                                Voir tous les rappels
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default LegalRemindersWidget;
