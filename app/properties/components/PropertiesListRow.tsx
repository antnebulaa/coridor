'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import { SafeListing, SafeUser } from "@/types";
import useCountries from "@/hooks/useCountries";

interface PropertiesListRowProps {
    data: SafeListing;
    currentUser?: SafeUser | null;
    isMainProperty?: boolean;
    isSmall?: boolean;
    isColocation?: boolean;
}

const PropertiesListRow: React.FC<PropertiesListRowProps> = ({
    data,
    currentUser,
    isMainProperty,
    isSmall,
    isColocation
}) => {
    const router = useRouter();
    const { getByValue } = useCountries();
    const location = getByValue((data as any).locationValue);

    const surfaceDisplay = data.surface
        ? (currentUser?.measurementSystem === 'imperial'
            ? `${Math.round(data.surface * 10.764)} sq ft`
            : `${data.surface} m²`)
        : null;

    // Determine Label logic:
    // 1. If Main Property (Entire Place), use Category (Maison, Appartement, etc)
    // 2. If Room (Private/Shared), use "Chambre" or Unit Name
    const categoryLabel = (isMainProperty || data.rentalUnit?.type === 'ENTIRE_PLACE')
        ? data.category
        : (data.rentalUnit?.name && data.rentalUnit.name.toLowerCase().includes('chambre'))
            ? data.rentalUnit.name
            : 'Chambre';

    return (
        <div
            onClick={() => router.push(`/properties/${data.id}/edit`)}
            className="
                flex 
                items-center 
                gap-4 
                py-3
                px-0
                md:px-4 
                border-b 
                border-neutral-200
                bg-white
                hover:bg-neutral-50 
                transition 
                cursor-pointer
                group
            "
        >
            {/* Column 1: Annonce (Image + Details) - Reduced width to pull address left */}
            <div className="flex-1 md:flex-[1.5] flex gap-4 items-center min-w-0">
                <div className={`
                    relative 
                    ${isSmall ? 'w-16 h-16' : 'w-20 h-20'}
                    rounded-[19px] 
                    overflow-hidden 
                    shrink-0
                    bg-neutral-200
                `}>
                    {data.images?.[0]?.url && (
                        <Image
                            fill
                            src={data.images[0].url}
                            alt="Listing"
                            className="object-cover group-hover:scale-110 transition"
                        />
                    )}
                </div>
                <div className="flex flex-col min-w-0 gap-0.5">
                    {/* Title: [Type] [Door] • [Floor] • [T#] */}
                    {/* Title: [Type] [Door] • [Floor] • [T#] */}
                    <div className={`flex items-center font-medium text-neutral-900 truncate ${isMainProperty ? 'text-lg' : 'text-base'}`}>
                        {(() => {
                            // If it's a Room, override the category "Maison/Appart" with "Chambre"
                            const isRoom = data.rentalUnit?.type === 'PRIVATE_ROOM';
                            let typeLabel = isRoom ? 'Chambre' : (data.category === 'Appartement' ? 'Appart' : data.category);

                            // For rooms, we might want to append the name/number if available
                            let roomName = '';
                            if (isRoom && data.rentalUnit?.name) {
                                let name = data.rentalUnit.name.replace('Bedroom ', ''); // Remove English default if present
                                name = name.trim();

                                // Avoid "Chambre Chambre"
                                if (name.toLowerCase().startsWith('chambre')) {
                                    typeLabel = ''; // The name already has it
                                    roomName = name;
                                } else {
                                    roomName = ` ${name}`;
                                }
                            }

                            return [
                                `${typeLabel}${data.apartment ? ` ${data.apartment}` : ''}${roomName}`,
                                data.floor !== null && data.floor !== undefined ? (data.floor === 0 ? 'RDC' : `${data.floor}e`) : null,
                                data.roomCount ? `T${data.roomCount}` : null
                            ].filter(Boolean).map((part, index, arr) => (
                                <div key={index} className="flex items-center">
                                    <span>{part}</span>
                                    {index < arr.length - 1 && (
                                        <span className="text-[8px] text-neutral-400 mx-1.5">•</span>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>

                    {/* Subtitle: Street */}
                    <span className="text-sm text-gray-500 truncate">
                        {data.addressLine1 || data.city || ''}
                    </span>

                    {/* Smart Footer - Mock Data */}
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                        <span className="text-sm text-neutral-900 truncate">
                            Loyer en retard de 5j
                        </span>
                    </div>
                </div>
            </div>

            {/* Column 2: Location - Increased width */}
            <div className="hidden md:block flex-[3] text-sm text-neutral-600 min-w-0">
                {data.rentalUnit?.type === 'PRIVATE_ROOM' ? (
                    <div className="font-medium text-neutral-900 truncate">
                        {data.description || data.city || 'Chambre'}
                    </div>
                ) : (
                    data.addressLine1 ? (
                        <div className="flex flex-col justify-center h-full">
                            <div className="font-medium text-neutral-900 truncate" title={[
                                data.addressLine1,
                                data.zipCode && data.city ? `${data.zipCode} ${data.city}` : (data.city || location?.label),
                                data.apartment && `Appt ${data.apartment}`,
                                data.building && `Bat ${data.building}`
                            ].filter(Boolean).join(', ')}>
                                {[
                                    data.addressLine1,
                                    data.zipCode && data.city ? `${data.zipCode} ${data.city}` : (data.city || location?.label),
                                    data.apartment && `Appt ${data.apartment}`,
                                    data.building && `Bat ${data.building}`
                                ].filter(Boolean).join(', ')}
                            </div>
                            {isColocation && (
                                <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full w-fit mt-1">
                                    COLOCATION
                                </span>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="font-medium text-neutral-900 truncate">
                                {data.city || location?.label}
                            </div>
                            {data.district && (
                                <div className="text-neutral-500 truncate">
                                    {data.district}
                                </div>
                            )}
                        </>
                    )
                )}
            </div>

            {/* Column 3: Price - 15% (Desktop Only) */}
            <div className="hidden md:block flex-1 font-medium text-neutral-900 whitespace-nowrap">
                {data.price}€ /mois
            </div>


        </div>
    );
};

export default PropertiesListRow;
