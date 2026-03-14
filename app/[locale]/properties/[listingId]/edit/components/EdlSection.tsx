'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SafeListing } from '@/types';
import Heading from '@/components/Heading';
import { FileText, ExternalLink, Loader2, ClipboardList, CheckCircle2, Clock, Send } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import CustomToast from '@/components/ui/CustomToast';
import { useTranslations } from 'next-intl';

interface InspectionData {
    id: string;
    type: 'ENTRY' | 'EXIT';
    status: string;
    pdfUrl: string | null;
    startedAt: string | null;
    completedAt: string | null;
    landlordSignedAt: string | null;
    tenantSignedAt: string | null;
    createdAt: string;
    tenant: { name: string | null } | null;
    rooms: { isCompleted: boolean }[];
}

interface EdlSectionProps {
    listing: SafeListing;
}

const EdlSection: React.FC<EdlSectionProps> = ({ listing }) => {
    const router = useRouter();
    const t = useTranslations('properties.edit.edl');
    const [inspections, setInspections] = useState<InspectionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [resendingId, setResendingId] = useState<string | null>(null);

    const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
        SIGNED: { label: t('status.signed'), color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 },
        PENDING_SIGNATURE: { label: t('status.pendingSignature'), color: 'text-blue-700', bg: 'bg-blue-50', icon: Clock },
        DRAFT: { label: t('status.draft'), color: 'text-amber-700', bg: 'bg-amber-50', icon: ClipboardList },
    };

    useEffect(() => {
        fetch(`/api/inspection?listingId=${listing.id}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setInspections(data);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [listing.id]);

    const handleResendLink = async (inspectionId: string) => {
        setResendingId(inspectionId);
        try {
            const res = await fetch(`/api/inspection/${inspectionId}/send-sign-link`, { method: 'POST' });
            if (res.ok) {
                toast.custom((toastRef) => (
                    <CustomToast t={toastRef} message={t('notificationSent')} type="success" />
                ));
            } else {
                const data = await res.json();
                toast.custom((toastRef) => (
                    <CustomToast t={toastRef} message={data.error || t('error')} type="error" />
                ));
            }
        } catch {
            toast.custom((toastRef) => (
                <CustomToast t={toastRef} message={t('networkError')} type="error" />
            ));
        } finally {
            setResendingId(null);
        }
    };

    const entryEdl = inspections.find(i => i.type === 'ENTRY');
    const exitEdl = inspections.find(i => i.type === 'EXIT');

    const renderEdlCard = (edl: InspectionData | undefined, type: 'ENTRY' | 'EXIT') => {
        const typeLabel = type === 'ENTRY' ? t('type.entry') : t('type.exit');

        if (!edl) {
            return (
                <div className="p-5 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-neutral-500 dark:text-neutral-400">{typeLabel}</div>
                            <div className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">{t('status.notScheduled')}</div>
                        </div>
                    </div>
                </div>
            );
        }

        const config = STATUS_CONFIG[edl.status] || STATUS_CONFIG.DRAFT;
        const StatusIcon = config.icon;
        const completedRooms = edl.rooms.filter(r => r.isCompleted).length;
        const totalRooms = edl.rooms.length;
        const dateStr = edl.completedAt
            ? format(new Date(edl.completedAt), 'd MMM yyyy', { locale: fr })
            : edl.startedAt
                ? format(new Date(edl.startedAt), 'd MMM yyyy', { locale: fr })
                : format(new Date(edl.createdAt), 'd MMM yyyy', { locale: fr });

        return (
            <div className="p-5 border border-neutral-200 dark:border-neutral-700 rounded-xl">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{typeLabel}</span>
                            <span className="text-sm text-neutral-400">— {dateStr}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                                <StatusIcon size={13} />
                                {config.label}
                            </span>
                            {edl.tenant?.name && (
                                <span className="text-sm text-neutral-500">· {edl.tenant.name}</span>
                            )}
                        </div>

                        {edl.status === 'DRAFT' && totalRooms > 0 && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                                    <span>{t('rooms', { completed: completedRooms, total: totalRooms })}</span>
                                    <span>{Math.round((completedRooms / totalRooms) * 100)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-500 rounded-full transition-all"
                                        style={{ width: `${(completedRooms / totalRooms) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-4">
                    {edl.status === 'DRAFT' && (
                        <button
                            onClick={() => router.push(`/inspection/${edl.id}/rooms`)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition"
                        >
                            <ClipboardList size={15} />
                            {t('resumeEdl')}
                        </button>
                    )}

                    {edl.status === 'PENDING_SIGNATURE' && (
                        <button
                            onClick={() => handleResendLink(edl.id)}
                            disabled={resendingId === edl.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {resendingId === edl.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                            {t('resendLink')}
                        </button>
                    )}

                    {edl.pdfUrl && (
                        <a
                            href={edl.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-200 dark:border-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                        >
                            <FileText size={15} />
                            {t('viewPdf')}
                        </a>
                    )}

                    {edl.status === 'SIGNED' && (
                        <button
                            onClick={() => router.push(`/inspection/${edl.id}/done`)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-200 dark:border-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                        >
                            <ExternalLink size={15} />
                            {t('viewSummary')}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-8">
                <Heading
                    title={t('title')}
                    subtitle={t('subtitle')}
                />
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-neutral-400" size={24} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <Heading
                title={t('title')}
                subtitle={t('subtitle')}
            />

            {inspections.length === 0 ? (
                <div className="p-6 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl text-center">
                    <ClipboardList size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                    <div className="font-medium text-neutral-500 dark:text-neutral-400">{t('empty')}</div>
                    <div className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                        {t('emptyDescription')}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {renderEdlCard(entryEdl, 'ENTRY')}
                    {renderEdlCard(exitEdl, 'EXIT')}
                </div>
            )}
        </div>
    );
};

export default EdlSection;
