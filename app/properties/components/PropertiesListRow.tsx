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
                bg-white
                hover:bg-neutral-50 
                transition 
                cursor-pointer
                group
            "
        >
            {/* Column 1: Annonce (Image + Details) - 40% */}
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
                <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-neutral-900 truncate">
                        {data.category}
                    </span>
                    <span className="text-sm text-neutral-500 truncate">
                        {data.roomCount} pièces
                        {data.roomCount > 1 ? ` • ${data.roomCount - 1} ch.` : ''}
                        {surfaceDisplay ? ` • ${surfaceDisplay}` : ''}
                    </span>
                </div>
            </div>

            {/* Column 2: Location - 30% */}
            <div className="flex-[2] text-sm text-neutral-600 min-w-0">
                <div className="font-medium text-neutral-900 truncate">
                    {data.city || location?.label}
                </div>
                {data.district && (
                    <div className="text-neutral-500 truncate">
                        {data.district}
                    </div>
                )}
            </div>

            {/* Column 3: Price - 15% */}
            <div className="flex-1 font-medium text-neutral-900 whitespace-nowrap">
                {data.price}€ /mois
            </div>

            {/* Column 4: Status - 15% */}
            <div className="flex-1 flex flex-col items-end">
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
