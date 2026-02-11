'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { HiCheck, HiXMark, HiTrash, HiArchiveBox, HiArrowLeft } from 'react-icons/hi2';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface AdminListingDetailClientProps {
    listing: any;
}

const AdminListingDetailClient: React.FC<AdminListingDetailClientProps> = ({ listing }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const t = useTranslations('admin.listingDetail');

    const onAction = async (action: 'approve' | 'reject' | 'delete' | 'archive') => {
        let confirmMsg = "";
        let endpoint = `/api/admin/listings/${listing.id}/${action}`;
        let body = {};

        if (action === 'delete') {
            confirmMsg = t('confirmDelete');
            endpoint = `/api/admin/listings/${listing.id}`;
        } else if (action === 'archive') {
            confirmMsg = t('confirmArchive');
            endpoint = `/api/admin/listings/${listing.id}/archive`;
        } else if (action === 'reject') {
            const reason = window.prompt(t('rejectPrompt'));
            if (!reason) return;
            body = { reason };
        }

        if (confirmMsg && !confirm(confirmMsg)) return;

        setLoading(true);
        try {
            if (action === 'delete') {
                await axios.delete(endpoint);
                toast.success(t('toastDeleted'));
                router.push('/admin/listings');
            } else {
                await axios.post(endpoint, body);
                toast.success(t('toastActionSuccess', { action }));
                router.refresh();
            }
        } catch (error) {
            toast.error(t('toastActionError'));
        } finally {
            setLoading(false);
        }
    }

    // Determine images to show
    const displayImages = listing.rentalUnit.images.length > 0
        ? listing.rentalUnit.images
        : listing.rentalUnit.property.images;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition"
            >
                <HiArrowLeft /> {t('back')}
            </button>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold">{listing.title}</h1>
                    <div className="text-slate-500 text-sm mt-1">
                        ID: {listing.id} • {t('back') !== 'Back' ? 'Créé le' : 'Created on'} {new Date(listing.createdAt).toLocaleDateString()}
                    </div>
                </div>
                <div className="flex gap-2">
                    {listing.status === 'PENDING_REVIEW' && (
                        <>
                            <button
                                onClick={() => onAction('approve')}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                            >
                                <HiCheck /> {t('approve')}
                            </button>
                            <button
                                onClick={() => onAction('reject')}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                            >
                                <HiXMark /> {t('reject')}
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => onAction('archive')}
                        disabled={loading || listing.status === 'ARCHIVED'}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
                    >
                        <HiArchiveBox /> {t('archive')}
                    </button>

                    <button
                        onClick={() => onAction('delete')}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                    >
                        <HiTrash /> {t('deleteListing')}
                    </button>
                </div>
            </div>

            {/* Status Panel */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                    <span className="text-sm font-medium text-slate-500 uppercase">{t('currentStatus')}</span>
                    <div className="font-bold text-lg mt-1">{listing.status}</div>
                </div>
                {listing.rejectionReason && (
                    <div className="text-red-600 text-sm max-w-md text-right">
                        <strong>{t('rejectionReason')}</strong> {listing.rejectionReason}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Images */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {displayImages.map((img: any) => (
                            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                                <Image
                                    src={img.url}
                                    alt="Property"
                                    fill
                                    className="object-cover"
                                    // eslint-disable-next-line
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Description */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-medium mb-2 text-slate-900">{t('description')}</h3>
                        <p className="text-slate-600 whitespace-pre-line">{listing.description}</p>
                    </div>

                    {/* Details */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-medium mb-4 text-slate-900">{t('details')}</h3>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                            <div>
                                <dt className="text-slate-500">{t('rent')}</dt>
                                <dd className="font-medium">{listing.price} €</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">{t('charges')}</dt>
                                <dd className="font-medium">{listing.charges?.amount || 0} €</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">{t('deposit')}</dt>
                                <dd className="font-medium">{listing.securityDeposit || 0} €</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">{t('propertyType')}</dt>
                                <dd className="font-medium">{listing.rentalUnit.property.category}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">{t('surface')}</dt>
                                <dd className="font-medium">{listing.rentalUnit.surface || listing.rentalUnit.property.totalSurface} m²</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">{t('furnished')}</dt>
                                <dd className="font-medium">{listing.rentalUnit.isFurnished ? t('yes') : t('no')}</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Owner Info */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-medium mb-4 text-slate-900">{t('owner')}</h3>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                                {listing.rentalUnit.property.owner.image ? (
                                    <Image src={listing.rentalUnit.property.owner.image} alt="Owner" width={40} height={40} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">?</div>
                                )}
                            </div>
                            <div>
                                <div className="font-medium">{listing.rentalUnit.property.owner.name}</div>
                                <div className="text-xs text-slate-500">{listing.rentalUnit.property.owner.email}</div>
                            </div>
                        </div>
                        <div className="text-xs space-y-2 text-slate-600">
                            <div>{t('phone')} {listing.rentalUnit.property.owner.phoneNumber || t('notProvided')}</div>
                            <div>{t('verifiedAccount')} {listing.rentalUnit.property.owner.emailVerified ? t('yes') : t('no')}</div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-medium mb-4 text-slate-900">{t('location')}</h3>
                        <address className="text-sm not-italic text-slate-600 space-y-1">
                            <div>{listing.rentalUnit.property.addressLine1}</div>
                            <div>{listing.rentalUnit.property.building} {listing.rentalUnit.property.apartment}</div>
                            <div>{listing.rentalUnit.property.zipCode} {listing.rentalUnit.property.city}</div>
                            <div>{listing.rentalUnit.property.country}</div>
                        </address>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminListingDetailClient;
