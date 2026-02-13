'use client';

import { toast } from "react-hot-toast";
import axios from "axios";

import { SafeUser } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, User, MessageCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useTranslations, useFormatter } from 'next-intl';

interface VisitCardProps {
    visit: any; // SafeVisit
}

const VisitCard: React.FC<VisitCardProps> = ({
    visit
}) => {
    const router = useRouter();
    const t = useTranslations('dashboard.visits');
    const tListing = useTranslations('listing');
    const tCommon = useTranslations('common');
    const format = useFormatter();
    const [isConfirming, setIsConfirming] = useState(false);

    const listing = visit.listing;
    const property = listing.rentalUnit.property;
    const owner = property.owner;

    // Formatting
    const visitDate = new Date(visit.date);
    const dateStr = format.dateTime(visitDate, { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = visit.startTime; // Assuming HH:mm format stored as string

    const roomInfo = listing.roomCount ? `T${listing.roomCount}` : '';

    // Correct Title Logic
    let propertyTitle = `${property.category} ${roomInfo}`;

    if (listing.rentalUnit.type === 'PRIVATE_ROOM') {
        propertyTitle = tListing('privateRoom');
    }

    if (listing.rentalUnit.surface) {
        propertyTitle += ` - ${listing.rentalUnit.surface}m²`;
    }
    const ownerName = owner.name || owner.firstName || tCommon('owner');
    // Format "Adrien L."
    const shortName = owner.firstName && owner.lastName
        ? `${owner.firstName} ${owner.lastName.charAt(0)}.`
        : ownerName;

    const street = property.addressLine1 || property.address || '';
    const zip = property.zipCode || '';
    const city = property.city || '';

    const addressStr = [street, `${zip} ${city}`.trim()].filter(Boolean).join(', ');

    const handleContact = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (visit.conversationId) {
            router.push(`/inbox/${visit.conversationId}`);
        } else {
            router.push(`/listings/${listing.id}`);
        }
    };

    const handleCancel = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();

        if (window.confirm(t('confirmCancel'))) {
            axios.delete(`/api/visits/${visit.id}`)
                .then(() => {
                    toast.success(t('cancelSuccess'));
                    router.refresh();
                })
                .catch(() => {
                    toast.error(t('cancelError'));
                });
        }
    }, [visit.id, router, t]);

    const handleConfirm = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsConfirming(true);

        try {
            await axios.post(`/api/visits/${visit.id}/confirm`);
            toast.success('Visite confirmée !');
            router.refresh();
        } catch {
            toast.error('Erreur lors de la confirmation');
        } finally {
            setIsConfirming(false);
        }
    }, [visit.id, router]);

    const statusBadge = () => {
        switch (visit.status) {
            case 'PENDING':
                return (
                    <div className="bg-amber-100 text-amber-800 font-medium px-3 py-1 rounded-sm text-xs uppercase flex items-center gap-1">
                        <Clock size={12} />
                        En attente
                    </div>
                );
            case 'CONFIRMED':
                return (
                    <div className="bg-green-100 text-green-800 font-medium px-3 py-1 rounded-sm text-xs uppercase flex items-center gap-1">
                        <CheckCircle size={12} />
                        {t('confirmed')}
                    </div>
                );
            case 'CANCELLED':
                return (
                    <div className="bg-red-100 text-red-700 font-medium px-3 py-1 rounded-sm text-xs uppercase flex items-center gap-1">
                        <XCircle size={12} />
                        {t('cancelled')}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={`bg-white border rounded-2xl transition flex flex-col gap-2 ${visit.status === 'PENDING' ? 'border-amber-300' : 'border-gray-200'}`}>

            {/* Confirmation Banner for PENDING visits */}
            {visit.status === 'PENDING' && (
                <div className="bg-amber-50 border-b border-amber-200 rounded-t-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-amber-800 text-sm">
                        <Clock size={16} className="shrink-0" />
                        <span className="font-medium">Confirmez votre présence (24h)</span>
                    </div>
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirming}
                        className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 shrink-0"
                    >
                        {isConfirming ? '...' : 'Confirmer'}
                    </button>
                </div>
            )}

            {/* Header: Date */}
            <div className="flex items-center gap-3 p-3 bg-neutral-100 border-b border-gray-100" style={visit.status !== 'PENDING' ? { borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' } : {}}>
                {statusBadge()}
                <div className={`font-bold text-neutral-800 uppercase px-3 py-1 rounded-sm text-sm bg-neutral-100`}>
                    {dateStr} - {timeStr}
                </div>
            </div>

            {/* Property Info */}
            <div className="flex gap-3 items-center px-3 py-1">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-200 shrink-0">
                    {listing.images?.[0]?.url && (
                        <Image src={listing.images[0].url} fill alt="Property" className="object-cover" />
                    )}
                </div>
                <div className="flex flex-col">
                    <h3 className="font-medium text-sm text-neutral-800">{propertyTitle}</h3>
                    <div className="flex items-start gap-1 mt-0 text-neutral-500 text-sm">
                        <span>{addressStr}</span>
                    </div>
                </div>
            </div>

            {/* Owner & Action */}
            <div className="flex items-center justify-between mt-0 p-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 overflow-hidden relative">
                        {owner.image ? (
                            <Image src={owner.image} fill alt={shortName} className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                <User size={16} />
                            </div>
                        )}
                    </div>
                    <div className="text-sm font-medium text-neutral-700">
                        {shortName}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {visit.status !== 'CANCELLED' && (
                        <button
                            onClick={handleCancel}
                            className="px-3 py-2 bg-neutral-100 text-neutral-600 rounded-xl text-sm font-medium hover:bg-neutral-200 transition"
                        >
                            {t('cancelAppointment')}
                        </button>
                    )}
                    <button
                        onClick={handleContact}
                        className="flex items-center gap-2 px-3 py-2 bg-white text-neutral-800 rounded-xl text-sm font-medium hover:bg-neutral-800 hover:text-white border border-neutral-200 hover:border-transparent transition"
                    >
                        <MessageCircle size={16} />

                    </button>
                </div>
            </div>

        </div>
    );
}

export default VisitCard;
