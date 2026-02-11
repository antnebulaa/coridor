'use client';

import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import { HiCheck, HiTrash } from "react-icons/hi2";
import { useTranslations } from 'next-intl';

interface ReportsClientProps {
    // eslint-disable-next-line
    reports: any[];
}

const ReportsClient: React.FC<ReportsClientProps> = ({ reports }) => {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const t = useTranslations('admin.reports');
    const tAdmin = useTranslations('admin');

    const onResolve = useCallback(async (id: string, newStatus: string) => {
        setLoadingId(id);
        try {
            await axios.patch(`/api/admin/reports/${id}`, { status: newStatus });
            toast.success(t('toastUpdated'));
            router.refresh();
        } catch {
            toast.error(t('toastError'));
        } finally {
            setLoadingId(null);
        }
    }, [router, t]);

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    {t('title')}
                </h1>
                <p className="text-slate-500 mt-2">
                    {t('subtitle')}
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left font-medium text-slate-500">{t('colReport')}</th>
                            <th className="px-6 py-3 text-left font-medium text-slate-500">{t('colDate')}</th>
                            <th className="px-6 py-3 text-left font-medium text-slate-500">{t('colTarget')}</th>
                            <th className="px-6 py-3 text-left font-medium text-slate-500">{t('colStatus')}</th>
                            <th className="px-6 py-3 text-right font-medium text-slate-500">{t('colActions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                        {reports.map((report) => (
                            <tr key={report.id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-900">{report.reason}</div>
                                    <div className="text-slate-500 text-xs mt-1">{report.details || t('noDetails')}</div>
                                    <div className="text-xs text-slate-400 mt-1">{t('byReporter', { name: report.reporter.name || report.reporter.email || tAdmin('anonymous') })}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                                    {new Date(report.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    {report.listingId && (
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('listing')}</span>
                                            <a href={`/admin/listings/${report.listingId}`} className="text-blue-600 hover:underline">
                                                {report.listing?.title || t('unknownListing')}
                                            </a>
                                        </div>
                                    )}
                                    {report.targetUserId && (
                                        <div className="mt-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('user')}</span>
                                            <div className="text-slate-900">{report.targetUser?.name || report.targetUser?.email}</div>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <StatusBadge status={report.status} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        {report.status === 'PENDING' && (
                                            <>
                                                <button
                                                    onClick={() => onResolve(report.id, 'RESOLVED')}
                                                    disabled={loadingId === report.id}
                                                    title={t('resolve')}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-full transition"
                                                >
                                                    <HiCheck size={18} />
                                                </button>
                                                <button
                                                    onClick={() => onResolve(report.id, 'DISMISSED')}
                                                    disabled={loadingId === report.id}
                                                    title={t('dismiss')}
                                                    className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition"
                                                >
                                                    <HiTrash size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {reports.length === 0 && (
                    <div className="p-8 text-center text-slate-500 italic">
                        {t('noReports')}
                    </div>
                )}
            </div>
        </div>
    );
}

const StatusBadge = ({ status }: { status: string }) => {
    const t = useTranslations('admin.reports');
    switch (status) {
        case 'RESOLVED':
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{t('resolved')}</div>;
        case 'DISMISSED':
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-500">{t('dismissed')}</div>;
        case 'PENDING':
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 animate-pulse">{t('pendingStatus')}</div>;
        default:
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">{status}</div>;
    }
}

export default ReportsClient;
