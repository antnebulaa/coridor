'use client';

import { CheckCircle2, ArrowRight, Send, Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { ActionItem } from '@/app/actions/getOperationalStats';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface ActionCardsProps {
    actionItems: ActionItem[];
}

const PRIORITY_STYLES = {
    URGENT: {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800',
        dot: 'bg-red-500',
        link: 'text-red-700 dark:text-red-400',
    },
    ACTION: {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
        link: 'text-amber-700 dark:text-amber-400',
    },
    INFO: {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500',
        link: 'text-blue-700 dark:text-blue-400',
    },
};

const MAX_VISIBLE = 5;

const ActionCardContent: React.FC<{ item: ActionItem; styles: typeof PRIORITY_STYLES.URGENT; resendButton?: React.ReactNode }> = ({ item, styles, resendButton }) => (
    <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
            <span className={`w-2 h-2 rounded-full ${styles.dot} mt-2 shrink-0`} />
            <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {item.title}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                    {item.subtitle}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            {resendButton}
            <ArrowRight size={16} className={`${styles.link} opacity-0 group-hover:opacity-100 transition`} />
        </div>
    </div>
);

const ActionCards: React.FC<ActionCardsProps> = ({ actionItems }) => {
    const router = useRouter();
    const [resendingId, setResendingId] = useState<string | null>(null);
    const [resentIds, setResentIds] = useState<Set<string>>(new Set());
    const [showAll, setShowAll] = useState(false);

    const handleResendLink = async (inspectionId: string) => {
        setResendingId(inspectionId);
        try {
            const res = await fetch(`/api/inspection/${inspectionId}/send-sign-link`, { method: 'POST' });
            if (res.ok) {
                setResentIds(prev => new Set([...prev, inspectionId]));
            }
        } catch {
            // silent
        } finally {
            setResendingId(null);
        }
    };

    if (actionItems.length === 0) {
        return (
            <div className="flex items-center gap-2 py-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    Tout est en ordre
                </span>
            </div>
        );
    }

    const visible = showAll ? actionItems : actionItems.slice(0, MAX_VISIBLE);
    const hasMore = actionItems.length > MAX_VISIBLE;

    return (
        <div className="space-y-3">
            {visible.map((item, index) => {
                const styles = PRIORITY_STYLES[item.priority];
                const isEdlPending = item.type === 'PENDING_EDL' && item.edlStatus === 'PENDING_SIGNATURE';
                const isResent = item.edlId ? resentIds.has(item.edlId) : false;
                const isResending = item.edlId ? resendingId === item.edlId : false;

                const cardClass = `block ${styles.bg} border ${styles.border} rounded-2xl p-5 hover:shadow-sm transition group cursor-pointer`;

                const resendButton = isEdlPending ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.edlId) handleResendLink(item.edlId);
                        }}
                        disabled={isResending || isResent}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition ${
                            isResent
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        } disabled:opacity-60`}
                    >
                        {isResending ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : isResent ? (
                            'Renvoyé'
                        ) : (
                            <>
                                <Send size={12} />
                                Renvoyer
                            </>
                        )}
                    </button>
                ) : undefined;

                return (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08, duration: 0.3 }}
                    >
                        {isEdlPending ? (
                            <div
                                className={cardClass}
                                onClick={() => router.push(item.href)}
                                role="link"
                            >
                                <ActionCardContent item={item} styles={styles} resendButton={resendButton} />
                            </div>
                        ) : (
                            <Link href={item.href} className={cardClass}>
                                <ActionCardContent item={item} styles={styles} />
                            </Link>
                        )}
                    </motion.div>
                );
            })}

            {hasMore && !showAll && (
                <button
                    onClick={() => setShowAll(true)}
                    className="text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition"
                >
                    Voir toutes les actions ({actionItems.length})
                </button>
            )}
        </div>
    );
};

export default ActionCards;
