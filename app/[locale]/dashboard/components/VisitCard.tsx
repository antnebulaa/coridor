'use client';

import { toast } from "react-hot-toast";
import axios from "axios";

import { SafeUser } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, User, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
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
            // Fallback if no conversation found (should imply starting one)
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
    }, [visit.id, router]);

    return (
        <div className="bg-white border border-gray-200 rounded-2xl transition flex flex-col gap-2">

            {/* Header: Date */}
            <div className="flex items-center gap-3 p-3 rounded-t-2xl bg-neutral-100 border-b border-gray-100">
                {visit.status === 'CANCELLED' ? (
                    <div className="font-medium px-3 py-1 rounded-sm text-xs uppercase">
                        {t('cancelled')}
                    </div>
                ) : (
                    <div className="bg-green-100 text-green-800 font-medium px-3 py-1 rounded-sm text-xs uppercase">
                        {t('confirmed')}
                    </div>
                )}

                <div className={`font-bold text-neutral-800 uppercase px-3 py-1 rounded-sm text-sm ${visit.status === 'CANCELLED' ? 'bg-neutral-100' : 'bg-neutral-100'}`}>
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
