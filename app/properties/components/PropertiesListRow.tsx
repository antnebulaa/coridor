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
                    {/* Title: Category + Location (Mobile) */}
                    <span className="font-semibold text-neutral-900 truncate">
                        {data.category}
                        <span className="md:hidden font-normal text-neutral-600 ml-1">
                            à {data.city} {data.district}
                        </span>
                    </span>

                    {/* Details: Rooms/Surface */}
                    <span className="text-sm text-neutral-500 truncate">
                        {data.roomCount} pièces
                        {data.roomCount > 1 ? ` • ${data.roomCount - 1} ch.` : ''}
                        {surfaceDisplay ? ` • ${surfaceDisplay}` : ''}
                    </span>

                    {/* Status: Mobile Only */}
                    <div className="md:hidden mt-1 flex items-center gap-2">
                        {data.isPublished ? (
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                                En ligne
                            </div>
                        ) : (
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-800">
                                En pause
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Column 2: Location - 30% (Desktop Only) */}
            <div className="hidden md:block flex-[2] text-sm text-neutral-600 min-w-0">
                <div className="font-medium text-neutral-900 truncate">
                    {data.city || location?.label}
                </div>
                {data.district && (
                    <div className="text-neutral-500 truncate">
                        {data.district}
                    </div>
                )}
            </div>

            {/* Column 3: Price - 15% (Desktop Only) */}
            <div className="hidden md:block flex-1 font-medium text-neutral-900 whitespace-nowrap">
                {data.price}€ /mois
            </div>

            {/* Column 4: Status - 15% (Desktop Only) */}
            <div className="hidden md:flex flex-1 flex-col items-end">
                {data.isPublished ? (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        En ligne
                    </div>
                ) : (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                        En pause
                    </div>
                )}
                {data.statusUpdatedAt && (
                    <div className="text-[10px] text-neutral-400 mt-1 whitespace-nowrap">
                        {formatDistanceToNow(new Date(data.statusUpdatedAt), { addSuffix: true, locale: fr })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropertiesListRow;
