'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/Button";
import { RefreshCw, Plus, CheckCircle, AlertTriangle, Shield, Lock, Search } from "lucide-react";
import { useTranslations, useFormatter, useLocale } from 'next-intl';

interface FinancesClientProps {
    currentUser: any;
    connections: any[];
}

const FinancesClient: React.FC<FinancesClientProps> = ({
    currentUser,
    connections
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations('dashboard.finances');
    const tCommon = useTranslations('common');
    const format = useFormatter();
    const locale = useLocale();

    // Handle OAuth Code Return
    useEffect(() => {
        const code = searchParams?.get('code');
        const connectionIdParam = searchParams?.get('connection_id'); // Sometimes provided by widget

        if (code) {
            const handleConnect = async () => {
                setIsLoading(true);
                try {
                    await axios.post('/api/powens/connect-landlord', {
                        code,
                        connectionId: connectionIdParam,
                        locale
                    });
                    toast.success(t('connectBank'));
                    router.push('/dashboard/finances'); // Clear params via replace/push
                    router.refresh(); // Refresh server data
                } catch (error) {
                    toast.error(t('connectError'));
                    console.error(error);
                } finally {
                    setIsLoading(false);
                }
            };
            handleConnect();
        }
    }, [searchParams, router]);

    const onConnect = async () => {
        setIsLoading(true);
        try {
            // Get WebView URL with mode=landlord
            const response = await axios.get(`/api/powens/init?mode=landlord&locale=${locale}`);
            window.location.href = response.data.link; // Redirect to Powens
        } catch (error) {
            toast.error(t('initializationError'));
        } finally {
            setIsLoading(false);
        }
    }

    const onSync = async (connectionId: string) => {
        setIsLoading(true); // Ideally specific loading state
        try {
            const res = await axios.post('/api/powens/sync', { connectionId });
            const count = res.data.count;
            const matches = res.data.matches?.length || 0;

            toast.success(t('syncSuccess', { count, matches }));
            router.refresh();
        } catch (error) {
            toast.error(t('syncError'));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Container>
            <div className="pt-24 pb-10">
                <div className="flex flex-row items-center justify-between mb-8">
                    <Heading
                        title={t('title')}
                        subtitle={t('subtitle')}
                    />
                    {connections.length > 0 && (
                        <Button
                            label={t('addAccount')}
                            icon={Plus}
                            onClick={onConnect}
                            disabled={isLoading}
                        />
                    )}
                </div>

                {/* Content */}
                {connections.length > 0 ? (
                    <div className="grid gap-6">
                        {connections.map((conn) => (
                            <div key={conn.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                                {/* Header */}
                                <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                            BK
                                        </div>
                                        <div>
                                            <div className="font-semibold text-neutral-800">{t('mainAccount')}</div>
                                            <div className="text-xs text-neutral-500">
                                                {t('lastSync', {
                                                    date: conn.lastSyncedAt
                                                        ? format.dateTime(new Date(conn.lastSyncedAt), { dateStyle: 'short', timeStyle: 'short' })
                                                        : t('never')
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        label={t('sync')}
                                        small
                                        variant="outline"
                                        icon={RefreshCw}
                                        onClick={() => onSync(conn.id)}
                                        disabled={isLoading}
                                    />
                                </div>

                                {/* Transactions Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-neutral-50 text-neutral-500 font-medium">
                                            <tr>
                                                <th className="p-4">{t('table.date')}</th>
                                                <th className="p-4">{t('table.label')}</th>
                                                <th className="p-4">{t('table.amount')}</th>
                                                <th className="p-4">{t('table.status')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                            {conn.transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-neutral-500">
                                                        {t('table.noTransactions')}
                                                    </td>
                                                </tr>
                                            ) : (
                                                conn.transactions.map((tx: any) => (
                                                    <tr key={tx.id} className="hover:bg-neutral-50/50">
                                                        <td className="p-4 text-neutral-600">
                                                            {format.dateTime(new Date(tx.date), { dateStyle: 'short' })}
                                                        </td>
                                                        <td className="p-4 font-medium text-neutral-900">
                                                            {tx.label}
                                                        </td>
                                                        <td className={`p-4 font-bold text-right ${tx.amount > 0 ? 'text-green-600' : 'text-neutral-900'}`}>
                                                            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} €
                                                        </td>
                                                        <td className="p-4">
                                                            {/* Needs t function passed or context */}
                                                            {parsedStatus(tx, t)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto mt-8">
                        {/* Premium Hero Card */}
                        <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xl relative">
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-linear-to-br from-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-50/50 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />

                            <div className="relative z-10 p-8 md:p-12 text-center">
                                <div className="inline-flex items-center gap-2 bg-neutral-100 border border-neutral-200 rounded-full px-3 py-1 mb-8">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">{t('hero.secure')}</span>
                                </div>

                                <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-6 tracking-tight">
                                    {t.rich('hero.title', { green: (chunks) => <span className="text-green-500">{chunks}</span> })}
                                </h2>
                                <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                                    {t('hero.description')}
                                </p>

                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-full max-w-sm">
                                        <Button
                                            label={t('hero.cta')}
                                            onClick={onConnect}
                                            icon={Shield}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <p className="text-xs text-neutral-400">
                                        {t('hero.footer')}
                                    </p>
                                </div>
                            </div>

                            {/* Detailed How-it-Works Grid */}
                            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-100 border-t border-neutral-100 bg-neutral-50/50">
                                <div className="p-8 flex flex-col items-center text-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm text-primary">
                                        <Lock size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 mb-1">{t('features.secureConn')}</h3>
                                        <p className="text-sm text-neutral-500 leading-normal">
                                            {t.rich('features.secureConnDesc', { strong: (chunks) => <strong>{chunks}</strong> })}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-8 flex flex-col items-center text-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm text-primary">
                                        <Search size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 mb-1">{t('features.targetedAnalysis')}</h3>
                                        <p className="text-sm text-neutral-500 leading-normal">
                                            {t.rich('features.targetedAnalysisDesc', { strong: (chunks) => <strong>{chunks}</strong> })}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-8 flex flex-col items-center text-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm text-primary">
                                        <CheckCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 mb-1">{t('features.simpleValidation')}</h3>
                                        <p className="text-sm text-neutral-500 leading-normal">
                                            {t.rich('features.simpleValidationDesc', { strong: (chunks) => <strong>{chunks}</strong> })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trust Badge */}
                        <div className="mt-10 flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-full border border-neutral-100 shadow-sm transition-all hover:shadow-md hover:border-neutral-200 cursor-default group">
                                <Shield size={16} className="text-primary group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-neutral-800 tracking-tight">POWENS</span>
                                <span className="text-neutral-300">|</span>
                                <span className="text-xs font-semibold text-neutral-500">Open Banking Secure</span>
                            </div>
                            <p className="text-[10px] text-neutral-400 max-w-md text-center leading-relaxed">
                                {t.rich('trust.description', { strong: (chunks) => <strong>{chunks}</strong>, br: () => <br /> })}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Container>
    );
}

function parsedStatus(tx: any, t: any) {
    if (tx.matchedLeaseId) {
        return (
            <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-medium w-fit">
                <CheckCircle size={12} /> {t('status.rent')}
            </span>
        );
    }
    if (tx.amount > 0 && tx.amount > 200) {
        return (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-1 rounded-full text-xs font-medium w-fit">
                <AlertTriangle size={12} /> {t('status.toVerify')}
            </span>
        );
    }
    return <span className="text-neutral-400 text-xs">-</span>;
}

export default FinancesClient;
