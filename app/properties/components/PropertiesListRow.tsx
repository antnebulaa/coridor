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
}

const PropertiesListRow: React.FC<PropertiesListRowProps> = ({
    data,
    currentUser,
    isMainProperty
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
                py-2
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
            <div className="flex-[1.5] flex gap-4 items-center min-w-0">
                <div className="
                    relative 
                    w-20 
                    h-20 
                    rounded-[19px] 
                    overflow-hidden 
                    shrink-0
                    bg-neutral-200
                ">
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
                    {/* Title: Category */}
                    <span className={`font-medium text-neutral-900 truncate ${isMainProperty ? 'font-bold text-lg' : ''}`}>
                        {categoryLabel}
                    </span>

                    {/* Desktop Details: Rooms/Surface */}
                    <span className="hidden md:block text-sm text-neutral-500 truncate">
                        {((data as any).rentalUnitType && (data as any).rentalUnitType !== 'ENTIRE_PLACE') ? (
                            surfaceDisplay || ''
                        ) : (
                            <>
                                {data.roomCount || 0} pièces
                                {(data.roomCount || 0) > 1 ? ` • ${(data.roomCount || 0) - 1} ch.` : ''}
                                {surfaceDisplay ? ` • ${surfaceDisplay}` : ''}
                            </>
                        )}
                    </span>

                    {/* Mobile Address: Replaces Details - Optimized for distinguishing units */}
                    <div className="md:hidden flex flex-col mt-0.5 min-w-0">
                        {data.addressLine1 ? (
                            <>
                                {/* Primary Identifier: Appt/Building */}
                                {(data.apartment || data.building) && (
                                    <span className="text-xs font-semibold text-gray-900 truncate">
                                        {[
                                            data.apartment ? `Appt ${data.apartment}` : null,
                                            data.building ? `Bat ${data.building}` : null
                                        ].filter(Boolean).join(' • ')}
                                    </span>
                                )}
                                {/* Secondary Identifier: Street */}
                                <span className={`${(data.apartment || data.building) ? 'text-neutral-500' : 'text-neutral-700'} text-xs truncate`}>
                                    {data.addressLine1}, {data.zipCode} {data.city}
                                </span>
                            </>
                        ) : (
                            // Fallback
                            <span className="text-xs text-neutral-500 truncate">
                                {data.city || location?.label || ''} {data.district || ''}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Column 2: Location - Increased width */}
            <div className="hidden md:block flex-[3] text-sm text-neutral-600 min-w-0">
                {data.addressLine1 ? (
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
                )}
            </div>

            {/* Column 3: Price - 15% (Desktop Only) */}
            <div className="hidden md:block flex-1 font-medium text-neutral-900 whitespace-nowrap">
                {data.price}€ /mois
            </div>

            {/* Column 4: Status - 15% (Desktop) / Visible on Mobile */}
            <div className="flex flex-1 flex-col items-end pl-2">
                {data.isPublished ? (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Publié
                    </div>
                ) : (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                        En pause
                    </div>
                )}
                {data.statusUpdatedAt && (
                    <div className="text-[10px] text-neutral-400 mt-1 whitespace-nowrap hidden md:block">
                        {formatDistanceToNow(new Date(data.statusUpdatedAt), { addSuffix: true, locale: fr })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropertiesListRow;
