'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useState, useMemo } from 'react';
import { HiCheck, HiXMark, HiEye, HiFunnel, HiArrowsUpDown } from 'react-icons/hi2';
import Modal from '@/components/modals/Modal';
import Heading from '@/components/Heading';
import SoftInput from '@/components/inputs/SoftInput';
import { FieldValues, useForm, SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

interface ListingModerationClientProps {
    listings: any[];
}

const ListingModerationTable: React.FC<ListingModerationClientProps> = ({ listings }) => {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const t = useTranslations('admin.listingModeration');
    const tAdmin = useTranslations('admin');

    // Filters & Sorting
    const [filterCity, setFilterCity] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    // Rejection Modal State
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [listingToReject, setListingToReject] = useState<string | null>(null);
    const { register, handleSubmit, reset, formState: { errors } } = useForm<FieldValues>({
        defaultValues: {
            reason: ''
        }
    });

    const cities = useMemo(() => {
        const uniqueCities = Array.from(new Set(listings.map(l => l.rentalUnit.property.city).filter(Boolean)));
        return uniqueCities.sort();
    }, [listings]);

    const filteredListings = useMemo(() => {
        return listings.filter(listing => {
            const matchesCity = filterCity ? listing.rentalUnit.property.city === filterCity : true;
            const matchesStatus = filterStatus === 'ALL' ? true : listing.status === filterStatus;
            return matchesCity && matchesStatus;
        }).sort((a, b) => {
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
    }, [listings, filterCity, filterStatus, sortOrder]);

    const onApprove = async (id: string) => {
        if (!confirm(t('confirmApprove'))) return;
        setLoadingId(id);
        try {
            await axios.post(`/api/admin/listings/${id}/approve`);
            toast.success(t('toastApproved'), { icon: '✅' });
            router.refresh();
        } catch (error) {
            toast.error(t('toastApproveError'));
        } finally {
            setLoadingId(null);
        }
    }

    const openRejectModal = (id: string) => {
        setListingToReject(id);
        reset();
        setIsRejectModalOpen(true);
    }

    const onRejectSubmit: SubmitHandler<FieldValues> = async (data) => {
        if (!listingToReject) return;
        setLoadingId(listingToReject);
        try {
            await axios.post(`/api/admin/listings/${listingToReject}/reject`, { reason: data.reason });
            toast.success(t('toastRejected'), { icon: '❌' });
            setIsRejectModalOpen(false);
            router.refresh();
        } catch (error) {
            toast.error(t('toastRejectError'));
        } finally {
            setLoadingId(null);
            setListingToReject(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold">{t('title')}</h2>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <select
                        value={filterCity}
                        onChange={(e) => setFilterCity(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
                    >
                        <option value="">{t('allCities')}</option>
                        {cities.map(city => (
                            <option key={city as string} value={city as string}>{city as string}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500"
                    >
                        <option value="ALL">{t('allStatuses')}</option>
                        <option value="PENDING_REVIEW">{tAdmin('pending')}</option>
                        <option value="PUBLISHED">{tAdmin('published')}</option>
                        <option value="REJECTED">{tAdmin('rejected')}</option>
                        <option value="DRAFT">{tAdmin('draft')}</option>
                    </select>

                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                        title={t('sortByDate')}
                    >
                        <HiArrowsUpDown size={20} className="text-slate-600" />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    {t('colListing', { count: filteredListings.length })}
                                </th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    {t('colOwner')}
                                </th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    {t('colStatus')}
                                </th>
                                <th className="px-6 py-3 text-left font-medium text-slate-500 uppercase tracking-wider">
                                    {t('colUpdated')}
                                </th>
                                <th className="px-6 py-3 text-right font-medium text-slate-500 uppercase tracking-wider">
                                    {t('colActions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200 text-slate-700">
                            {filteredListings.map((listing) => (
                                <tr key={listing.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="font-semibold text-slate-900 line-clamp-1 max-w-[200px]" title={listing.title}>
                                                {listing.title}
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {listing.rentalUnit.property.city} • {listing.price}€
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">
                                            {listing.rentalUnit.property.owner.name || tAdmin('noName')}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {listing.rentalUnit.property.owner.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={listing.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs">
                                        {new Date(listing.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                title={t('viewDetails')}
                                                onClick={() => router.push(`/admin/listings/${listing.id}`)}
                                                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
                                            >
                                                <HiEye size={18} />
                                            </button>

                                            {listing.status === 'PENDING_REVIEW' && (
                                                <>
                                                    <button
                                                        title={t('approve')}
                                                        onClick={() => onApprove(listing.id)}
                                                        disabled={loadingId === listing.id}
                                                        className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50 transition disabled:opacity-50"
                                                    >
                                                        <HiCheck size={18} />
                                                    </button>
                                                    <button
                                                        title={t('reject')}
                                                        onClick={() => openRejectModal(listing.id)}
                                                        disabled={loadingId === listing.id}
                                                        className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 transition disabled:opacity-50"
                                                    >
                                                        <HiXMark size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredListings.length === 0 && (
                    <div className="p-8 text-center text-slate-500 italic">
                        {t('noResults')}
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title={t('rejectModal.title')}
                actionLabel={t('rejectModal.action')}
                secondaryActionLabel={t('rejectModal.cancel')}
                secondaryAction={() => setIsRejectModalOpen(false)}
                onSubmit={handleSubmit(onRejectSubmit)}
                disabled={loadingId !== null}
                body={
                    <div className="flex flex-col gap-4">
                        <Heading
                            title={t('rejectModal.reasonTitle')}
                            subtitle={t('rejectModal.reasonSubtitle')}
                        />
                        <SoftInput
                            id="reason"
                            label={t('rejectModal.reasonLabel')}
                            disabled={loadingId !== null}
                            register={register}
                            errors={errors}
                            required
                        />
                    </div>
                }
            />
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const tAdmin = useTranslations('admin');
    switch (status) {
        case 'PUBLISHED':
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{tAdmin('published')}</div>;
        case 'PENDING_REVIEW':
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 animate-pulse">{tAdmin('pending')}</div>;
        case 'REJECTED':
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">{tAdmin('rejected')}</div>;
        case 'DRAFT':
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{tAdmin('draft')}</div>;
        default:
            return <div className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">{status}</div>;
    }
}

export default ListingModerationTable;
