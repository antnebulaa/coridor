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
import { useTranslations, useLocale } from 'next-intl';
import type { ActivityEvent } from '@/app/actions/getAdminAdvancedStats';

interface ActivityFeedProps {
    events: ActivityEvent[];
}

const EVENT_ICONS: Record<ActivityEvent['type'], { icon: React.ReactNode; color: string }> = {
    user_signup: { icon: <HiUser className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600' },
    listing_published: { icon: <HiHome className="w-4 h-4" />, color: 'bg-green-100 text-green-600' },
    application_sent: { icon: <HiDocumentCheck className="w-4 h-4" />, color: 'bg-purple-100 text-purple-600' },
    visit_confirmed: { icon: <HiEye className="w-4 h-4" />, color: 'bg-amber-100 text-amber-600' },
    lease_signed: { icon: <HiPencilSquare className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700' },
    message_sent: { icon: <HiChatBubbleLeft className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600' },
    report_created: { icon: <HiExclamationTriangle className="w-4 h-4" />, color: 'bg-red-100 text-red-600' },
    bank_connected: { icon: <HiBanknotes className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-600' },
};

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function formatRelativeDate(dateStr: string, t: TranslateFn, locale: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return t('justNow');
    if (diffMin < 60) return t('minutesAgo', { count: diffMin });
    if (diffH < 24) return t('hoursAgo', { count: diffH });
    if (diffD < 7) return t('daysAgo', { count: diffD });
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
}

function getEventDescription(event: ActivityEvent, t: TranslateFn): string {
    const { type, data } = event;
    const name = data.name || t('defaultUser');
    const title = data.title || t('defaultListing');
    const city = data.city ? ` (${data.city})` : '';

    switch (type) {
        case 'user_signup':
            return t('descSignup', { name, city });
        case 'listing_published':
            return `${title}${city}`;
        case 'application_sent':
            return t('descApplication', { name, title });
        case 'visit_confirmed':
            return t('descVisit', { name, title });
        case 'lease_signed':
            return `${name} — ${title}`;
        case 'message_sent':
            if (data.count && data.count > 1) {
                return t('descMessages', { name, count: data.count });
            }
            return t('descMessage', { name });
        case 'report_created':
            return t('descReport', { name });
        case 'bank_connected':
            return t('descBank', { name });
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
    const t = useTranslations('admin.activityFeed');
    const locale = useLocale();
    const displayEvents = useMemo(() => events.slice(0, 20), [events]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 h-full">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">{t('title')}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{t('eventCount', { count: events.length })}</p>
            </div>
            <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
                {displayEvents.map((event, idx) => {
                    const config = EVENT_ICONS[event.type];
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
                                    <span className="text-xs font-semibold text-slate-500">{t(`event.${event.type}`)}</span>
                                </div>
                                <p className="text-sm text-slate-700 truncate mt-0.5">
                                    {getEventDescription(event, t)}
                                </p>
                            </div>
                            <span className="text-xs text-slate-400 shrink-0 mt-1">
                                {formatRelativeDate(event.date, t, locale)}
                            </span>
                        </Wrapper>
                    );
                })}
                {displayEvents.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-sm italic">
                        {t('noActivity')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;
