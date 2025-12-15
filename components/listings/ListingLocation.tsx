'use client';

import dynamic from "next/dynamic";
import { SafeListing } from "@/types";
import useCountries from "@/hooks/useCountries";
import { MapPin } from "lucide-react";

const Map3D = dynamic(() => import('@/components/Map3D'), {
    ssr: false
});

interface ListingLocationProps {
    listing: SafeListing;
}

const ListingLocation: React.FC<ListingLocationProps> = ({
    listing
}) => {
    const { getByValue } = useCountries();
    const countryCoordinates = getByValue(listing.locationValue)?.latlng;

    // Use precise coordinates if available, otherwise fallback to country center
    const coordinates = (listing.latitude && listing.longitude)
        ? [listing.latitude, listing.longitude]
        : countryCoordinates;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <div className="text-xl font-semibold flex items-center gap-2">
                    <MapPin size={24} />
                    Emplacement
                </div>
                <div className="text-neutral-500 font-normal">
                    {listing.city}, {listing.country}
                </div>
            </div>
            <div className="h-[400px] w-full rounded-xl overflow-hidden">
                <Map3D center={coordinates} />
            </div>
        </div>
    );
}

export default ListingLocation;
