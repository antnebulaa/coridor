'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from '@/i18n/navigation';
import { CalendarClock, ArrowRight } from 'lucide-react';

interface WidgetReminder {
    id: string;
    type: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    dueDate: string;
    status: string;
}

function formatRelativeDate(dateString: string): string {
    const now = new Date();
    const due = new Date(dateString);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `en retard de ${Math.abs(diffDays)} j`;
    if (diffDays === 0) return "aujourd'hui";
    if (diffDays === 1) return 'demain';
    if (diffDays < 30) return `dans ${diffDays} jours`;
    const diffMonths = Math.round(diffDays / 30);
    if (diffMonths === 1) return 'dans 1 mois';
    return `dans ${diffMonths} mois`;
}

const UpcomingDeadlinesWidget = () => {
    const [reminders, setReminders] = useState<WidgetReminder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReminders = async () => {
            try {
                const res = await axios.get('/api/reminders?status=UPCOMING,NOTIFIED,OVERDUE');
                setReminders(res.data.reminders || []);
            } catch (error) {
                console.error('Failed to fetch reminders:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchReminders();
    }, []);

    if (loading) return null;
    if (reminders.length === 0) return null;

    const displayReminders = reminders.slice(0, 3);

    return (
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                    <CalendarClock className="w-5 h-5" />
                    Prochaines échéances
                </h3>
                <Link
                    href="/calendar"
                    className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 flex items-center gap-1 transition"
                >
                    Voir tout
                    <ArrowRight size={14} />
                </Link>
            </div>

            {/* Items */}
            <div className="space-y-2">
                {displayReminders.map((reminder) => {
                    const isOverdue = reminder.status === 'OVERDUE';
                    const isCritical = reminder.priority === 'CRITICAL';
                    const dotColor = isOverdue || isCritical
                        ? 'bg-red-500'
                        : reminder.priority === 'HIGH'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500';

                    return (
                        <div
                            key={reminder.id}
                            className="flex items-center justify-between py-1.5"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                                <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">
                                    {reminder.title.length > 35
                                        ? reminder.title.substring(0, 35) + '...'
                                        : reminder.title}
                                </span>
                            </div>
                            <span className={`text-xs shrink-0 ml-2 ${
                                isOverdue ? 'text-red-600 font-semibold' : 'text-neutral-500'
                            }`}>
                                {formatRelativeDate(reminder.dueDate)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default UpcomingDeadlinesWidget;
