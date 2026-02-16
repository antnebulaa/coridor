'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
    HiUser,
    HiHome,
    HiDocumentCheck,
    HiEye,
    HiPencilSquare,
    HiChatBubbleLeft,
    HiExclamationTriangle,
    HiBanknotes,
} from 'react-icons/hi2';
import type { ActivityEvent } from '@/app/actions/getAdminAdvancedStats';

interface ActivityFeedProps {
    events: ActivityEvent[];
}

const EVENT_CONFIG: Record<ActivityEvent['type'], { icon: React.ReactNode; label: string; color: string }> = {
    user_signup: {
        icon: <HiUser className="w-4 h-4" />,
        label: 'Inscription',
        color: 'bg-blue-100 text-blue-600',
    },
    listing_published: {
        icon: <HiHome className="w-4 h-4" />,
        label: 'Annonce publiée',
        color: 'bg-green-100 text-green-600',
    },
    application_sent: {
        icon: <HiDocumentCheck className="w-4 h-4" />,
        label: 'Candidature',
        color: 'bg-purple-100 text-purple-600',
    },
    visit_confirmed: {
        icon: <HiEye className="w-4 h-4" />,
        label: 'Visite confirmée',
        color: 'bg-amber-100 text-amber-600',
    },
    lease_signed: {
        icon: <HiPencilSquare className="w-4 h-4" />,
        label: 'Bail signé',
        color: 'bg-emerald-100 text-emerald-700',
    },
    message_sent: {
        icon: <HiChatBubbleLeft className="w-4 h-4" />,
        label: 'Message',
        color: 'bg-slate-100 text-slate-600',
    },
    report_created: {
        icon: <HiExclamationTriangle className="w-4 h-4" />,
        label: 'Signalement',
        color: 'bg-red-100 text-red-600',
    },
    bank_connected: {
        icon: <HiBanknotes className="w-4 h-4" />,
        label: 'Banque connectée',
        color: 'bg-indigo-100 text-indigo-600',
    },
};

function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin}min`;
    if (diffH < 24) return `il y a ${diffH}h`;
    if (diffD < 7) return `il y a ${diffD}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getEventDescription(event: ActivityEvent): string {
    const { type, data } = event;
    const name = data.name || 'Utilisateur';
    const title = data.title || 'annonce';
    const city = data.city ? ` (${data.city})` : '';

    switch (type) {
        case 'user_signup':
            return `${name} s'est inscrit${city}`;
        case 'listing_published':
            return `${title}${city}`;
        case 'application_sent':
            return `${name} a candidaté sur ${title}`;
        case 'visit_confirmed':
            return `Visite de ${name} pour ${title}`;
        case 'lease_signed':
            return `${name} — ${title}`;
        case 'message_sent':
            if (data.count && data.count > 1) {
                return `${name} a envoyé ${data.count} messages`;
            }
            return `${name} a envoyé un message`;
        case 'report_created':
            return `Signalement par ${name}`;
        case 'bank_connected':
            return `${name} a connecté sa banque`;
        default:
            return name;
    }
}

function getEventLink(event: ActivityEvent): string | null {
    switch (event.type) {
        case 'user_signup': return `/admin/users`;
        case 'listing_published': return `/admin/listings`;
        case 'application_sent': return `/admin/listings`;
        case 'visit_confirmed': return `/admin/listings`;
        case 'lease_signed': return `/admin/listings`;
        case 'report_created': return `/admin/reports`;
        default: return null;
    }
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ events }) => {
    const displayEvents = useMemo(() => events.slice(0, 20), [events]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 h-full">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Activité récente</h3>
                <p className="text-sm text-slate-500 mt-0.5">{events.length} événements</p>
            </div>
            <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
                {displayEvents.map((event, idx) => {
                    const config = EVENT_CONFIG[event.type];
                    const link = getEventLink(event);
                    const Wrapper = link ? ({ children, className }: { children: React.ReactNode; className?: string }) => (
                        <Link href={link} className={className}>{children}</Link>
                    ) : ({ children, className }: { children: React.ReactNode; className?: string }) => (
                        <div className={className}>{children}</div>
                    );

                    return (
                        <Wrapper
                            key={`${event.data.id}-${idx}`}
                            className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition ${
                                idx % 2 === 1 ? 'bg-slate-50/30' : ''
                            } ${link ? 'cursor-pointer' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${config.color}`}>
                                {config.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-500">{config.label}</span>
                                </div>
                                <p className="text-sm text-slate-700 truncate mt-0.5">
                                    {getEventDescription(event)}
                                </p>
                            </div>
                            <span className="text-xs text-slate-400 shrink-0 mt-1">
                                {formatRelativeDate(event.date)}
                            </span>
                        </Wrapper>
                    );
                })}
                {displayEvents.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-sm italic">
                        Aucune activité récente
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;
