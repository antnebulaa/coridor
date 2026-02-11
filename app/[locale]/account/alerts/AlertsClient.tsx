'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, BellOff, Edit, Trash2, Plus, MapPin, Home as HomeIcon, DollarSign, Bed, Clock, Hash } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PageHeader from "@/components/PageHeader";
import axios from 'axios';
import { SafeUser } from "@/types";
import SearchAlertModal from '@/components/modals/SearchAlertModal';

interface SearchAlert {
    id: string;
    locationValue?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    roomCount?: number;
    frequency: 'INSTANT' | 'DAILY';
    isActive: boolean;
    createdAt: string;
    lastSentAt?: string;
    matchCount: number;
}

export default function AlertsClient({ currentUser }: { currentUser: SafeUser | null }) {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<SearchAlert[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<SearchAlert | null>(null);
    const t = useTranslations('account.alerts');

    async function fetchAlerts() {
        try {
            const res = await axios.get('/api/alerts');
            setAlerts(res.data);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
            toast.error(t('toasts.error'));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAlerts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function deleteAlert(id: string) {
        if (!confirm(t('deleteConfirm.description'))) return;

        try {
            await axios.delete(`/api/alerts/${id}`);
            setAlerts((prev) => prev.filter((a) => a.id !== id));
            toast.success(t('toasts.deleted'));
        } catch (error) {
            console.error('Failed to delete alert:', error);
            toast.error(t('toasts.error'));
        }
    }

    async function toggleAlert(id: string, isActive: boolean) {
        try {
            await axios.patch(`/api/alerts/${id}`, { isActive: !isActive });
            setAlerts((prev) =>
                prev.map((a) => (a.id === id ? { ...a, isActive: !isActive } : a))
            );
            toast.success(isActive ? t('toasts.paused') : t('toasts.resumed'));
        } catch (error) {
            console.error('Failed to toggle alert:', error);
            toast.error(t('toasts.error'));
        }
    }

    const getCriteriaDisplay = (alert: SearchAlert) => {
        const criteria = [];
        if (alert.locationValue) criteria.push(t('criteria.location', { value: alert.locationValue }));
        if (alert.category) criteria.push(t('criteria.category', { value: alert.category }));
        if (alert.minPrice && alert.maxPrice) {
            criteria.push(t('criteria.price', { min: alert.minPrice, max: alert.maxPrice }));
        } else if (alert.minPrice) {
            criteria.push(t('criteria.priceMin', { min: alert.minPrice }));
        } else if (alert.maxPrice) {
            criteria.push(t('criteria.priceMax', { max: alert.maxPrice }));
        }
        if (alert.roomCount) criteria.push(t('criteria.rooms', { count: alert.roomCount }));
        return criteria;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 dark:border-neutral-100"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PageHeader
                title={t('title')}
                subtitle={t('subtitle')}
            />

            {/* Create Alert Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition font-medium"
                >
                    <Plus size={20} />
                    {t('create')}
                </button>
            </div>

            {/* Alerts List */}
            {alerts.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                        <Bell className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">{t('empty')}</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                        {t('emptyDescription')}
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition font-medium"
                    >
                        <Plus size={20} />
                        {t('createFirst')}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {alerts.map((alert) => {
                        const criteria = getCriteriaDisplay(alert);
                        return (
                            <div
                                key={alert.id}
                                className={`bg-white dark:bg-neutral-800 rounded-2xl border ${
                                    alert.isActive
                                        ? 'border-neutral-200 dark:border-neutral-700'
                                        : 'border-neutral-100 dark:border-neutral-800 opacity-60'
                                } p-6 transition-all hover:shadow-md`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                alert.isActive
                                                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400'
                                            }`}
                                        >
                                            {alert.isActive ? <Bell size={24} /> : <BellOff size={24} />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                                                {alert.isActive ? t('active') : t('paused')}
                                            </h3>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                                {t('frequency.label')}: {t(`frequency.${alert.frequency}`)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleAlert(alert.id, alert.isActive)}
                                            className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition"
                                            title={alert.isActive ? t('actions.pause') : t('actions.resume')}
                                        >
                                            {alert.isActive ? <BellOff size={20} /> : <Bell size={20} />}
                                        </button>
                                        <button
                                            onClick={() => deleteAlert(alert.id)}
                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                            title={t('actions.delete')}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>

                                {criteria.length > 0 ? (
                                    <>
                                        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-4">
                                            <div className="flex flex-wrap gap-2">
                                                {criteria.map((criterion, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-700 dark:text-neutral-300"
                                                    >
                                                        {criterion.includes('Lieu') || criterion.includes('Location') && <MapPin size={14} />}
                                                        {criterion.includes('Type') || criterion.includes('Catégorie') && <HomeIcon size={14} />}
                                                        {criterion.includes('Prix') || criterion.includes('Price') && <DollarSign size={14} />}
                                                        {criterion.includes('Pièces') || criterion.includes('Rooms') && <Bed size={14} />}
                                                        {criterion}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Statistics */}
                                        {(alert.matchCount > 0 || alert.lastSentAt) && (
                                            <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 pt-2">
                                                {alert.matchCount > 0 && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Hash size={14} />
                                                        <span>{alert.matchCount} match{alert.matchCount > 1 ? 'es' : ''}</span>
                                                    </div>
                                                )}
                                                {alert.lastSentAt && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={14} />
                                                        <span>
                                                            Dernière alerte: {new Date(alert.lastSentAt).toLocaleDateString('fr-FR', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
                                        {t('modal.noCriteria')}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Alert Modal */}
            <SearchAlertModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    fetchAlerts(); // Refresh after creating
                }}
                currentUser={currentUser}
                currentSearch={{}}
            />
        </div>
    );
}
