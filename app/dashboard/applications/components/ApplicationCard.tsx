'use client';

import { SafeListing, SafeUser } from "@/types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ApplicationCardProps {
    application: any; // SafeApplication
    currentUser: SafeUser;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({
    application,
    currentUser
}) => {
    const router = useRouter();
    const listing = application.listing;
    const rentalUnit = listing.rentalUnit;
    const property = rentalUnit.property;

    // Determine Status Visuals
    let statusLabel = '';
    let statusColor = 'bg-gray-100 text-gray-700';
    let actionLabel = 'Voir l\'annonce';
    let actionType = 'listing'; // listing | conversation | visit

    switch (application.status) {
        case 'PENDING':
        case 'SENT':
            statusLabel = 'Dossier envoyé';
            statusColor = 'bg-yellow-100 text-yellow-800';
            break;
        case 'VISIT_PROPOSED':
            statusLabel = 'Visite proposée';
            statusColor = 'bg-blue-100 text-blue-800';
            actionLabel = 'Choisir un créneau';
            actionType = 'conversation';
            break;
        case 'VISIT_CONFIRMED':
            statusLabel = 'Visite confirmée';
            statusColor = 'bg-green-100 text-green-800';
            actionLabel = 'Voir les détails';
            actionType = 'conversation';
            break;
        case 'ACCEPTED':
            statusLabel = 'Dossier accepté';
            statusColor = 'bg-purple-100 text-purple-800';
            actionType = 'conversation';
            break;
        case 'REJECTED':
            statusLabel = 'Refusé';
            statusColor = 'bg-red-50 text-red-600';
            break;
        default:
            statusLabel = application.status;
    }

    // Determine Image
    const imageUrl = rentalUnit.images?.[0]?.url || property.images?.[0]?.url || listing.images?.[0]?.url || '/images/placeholder.jpg';

    // Title
    const title = rentalUnit.type === 'PRIVATE_ROOM'
        ? "Chambre en colocation"
        : (property.category + (listing.propertyAdjective ? ` ${listing.propertyAdjective}` : ''));

    const location = property.city || listing.address || '';

    const handleClickKey = () => {
        if (actionType === 'conversation') {
            // We need to know conversation ID. It's usually found via listingId + currentUserId lookup,
            // or we assume it exists if status > SENT.
            // For robustness, link to inbox with listingId query could work?
            // Actually Coridor structure: /inbox/[conversationId]. 
            // We don't have conversationId easily here without fetching it.
            // BUT, if the status is VISIT_PROPOSED, a conversation surely exists.
            // We can try to navigate to inbox? Or just Listing page for now?
            // Listing Page has "Contacter" which opens/creates conversation.
            router.push(`/listings/${listing.id}`);
        } else {
            router.push(`/listings/${listing.id}`);
        }
    };

    return (
        <div
            onClick={() => router.push(`/listings/${listing.id}`)}
            className="flex flex-col md:flex-row gap-4 p-4 border border-gray-200 rounded-2xl bg-white hover:border-black/20 hover:shadow-sm transition cursor-pointer group"
        >
            {/* Image */}
            <div className="w-full md:w-[180px] aspect-[4/3] relative rounded-xl overflow-hidden shrink-0 bg-gray-100">
                <Image
                    fill
                    src={imageUrl}
                    alt={title}
                    className="object-cover group-hover:scale-105 transition duration-500"
                />

                {/* ID Badge on Image for quick debug/status if needed, or just overlays */}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase ${statusColor}`}>
                    {statusLabel}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-lg text-neutral-900 line-clamp-1">{title}</h3>
                            <div className="text-neutral-500 text-sm mt-0.5">{location}</div>
                        </div>
                        <div className="text-neutral-900 font-medium">
                            {listing.price}€<span className="text-gray-400 text-xs font-normal">/mois</span>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {/* Info Chips */}
                        <div className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium text-gray-600">
                            {listing.rentalUnit.surface ? `${listing.rentalUnit.surface} m²` : 'Surface N/A'}
                        </div>
                        <div className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium text-gray-600">
                            {listing.roomCount} pièces
                        </div>
                        <div className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium text-gray-600">
                            Envoyé le {format(new Date(application.appliedAt), 'dd MMM', { locale: fr })}
                        </div>
                    </div>
                </div>

                <div className="mt-4 md:mt-0 flex justify-end">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClickKey();
                        }}
                        className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition"
                    >
                        {actionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ApplicationCard;
