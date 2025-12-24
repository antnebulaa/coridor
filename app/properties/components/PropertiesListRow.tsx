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
}

const PropertiesListRow: React.FC<PropertiesListRowProps> = ({
    data,
    currentUser
}) => {
    const router = useRouter();
    const { getByValue } = useCountries();
    const location = getByValue(data.locationValue);

    const surfaceDisplay = data.surface
        ? (currentUser?.measurementSystem === 'imperial'
            ? `${Math.round(data.surface * 10.764)} sq ft`
            : `${data.surface} m²`)
        : null;

    return (
        <div
            onClick={() => router.push(`/properties/${data.id}/edit`)}
            className="
                flex 
                items-center 
                gap-4 
                p-4 
                border-b 
                border-neutral-200
                bg-white
                hover:bg-neutral-50 
                transition 
                cursor-pointer
                group
            "
        >
            {/* Column 1: Annonce (Image + Details) - Mobile: 100%, Desktop: 40% */}
            <div className="flex-[3] flex gap-4 items-center min-w-0">
                <div className="
                    relative 
                    w-24 
                    h-16 
                    rounded-lg 
                    overflow-hidden 
                    shrink-0
                    bg-neutral-200
                ">
                    <Image
                        fill
                        src={data.images[0]?.url || '/images/placeholder.jpg'}
                        alt="Listing"
                        className="object-cover group-hover:scale-110 transition"
                    />
                </div>
                <div className="flex flex-col min-w-0 gap-0.5">
                    {/* Title: Category */}
                    <span className="font-medium text-neutral-900 truncate">
                        {data.category}
                    </span>

                    {/* Desktop Details: Rooms/Surface */}
                    <span className="hidden md:block text-sm text-neutral-500 truncate">
                        {data.roomCount} pièces
                        {data.roomCount > 1 ? ` • ${data.roomCount - 1} ch.` : ''}
                        {surfaceDisplay ? ` • ${surfaceDisplay}` : ''}
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

            {/* Column 2: Location - 30% (Desktop Only) */}
            <div className="hidden md:block flex-[2] text-sm text-neutral-600 min-w-0">
                {data.addressLine1 ? (
                    <div className="flex flex-col">
                        <div className="font-medium text-neutral-900 truncate" title={data.addressLine1}>
                            {data.addressLine1}
                        </div>
                        {(data.apartment || data.building) && (
                            <div className="text-xs text-neutral-500 truncate">
                                {[
                                    data.apartment ? `Appt ${data.apartment}` : null,
                                    data.building ? `Bat ${data.building}` : null
                                ].filter(Boolean).join(', ')}
                            </div>
                        )}
                        <div className="text-neutral-500 truncate">
                            {data.zipCode} {data.city}
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
