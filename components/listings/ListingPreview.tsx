'use client';

import { SafeListing, SafeUser } from "@/types";
import Avatar from "../Avatar";
import useCountries from "@/hooks/useCountries";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import ListingEnergy from "./ListingEnergy";
import ListingAmenities from "./ListingAmenities";

import Image from "next/image";
import HeartButton from "../HeartButton";
import Heading from "../Heading";
import ListingTransit from "./ListingTransit";
import NeighborhoodScore from "./NeighborhoodScore";

const Map = dynamic(() => import('../Map'), {
    ssr: false
});

interface ListingPreviewProps {
    listing: SafeListing & { user?: SafeUser };
    currentUser?: SafeUser | null;
}

const ListingPreview: React.FC<ListingPreviewProps> = ({
    listing,
    currentUser
}) => {
    const { getByValue } = useCountries();
    const location = getByValue(listing.locationValue);
    const coordinates = listing.latitude && listing.longitude ? [listing.latitude, listing.longitude] : undefined;


    const category = useMemo(() => {
        return {
            icon: undefined, //  We don't have icons map here easily without importing from constants, but text is fine
            label: listing.category,
            description: ''
        }
    }, [listing.category]);

    const locationLabel = useMemo(() => {
        if (listing) {
            const parts = [];

            // City + District
            if (listing.city) {
                let cityPart = listing.city;
                if (listing.district) {
                    cityPart += ` ${listing.district}`;
                }
                parts.push(cityPart);
            }

            // Neighborhood field from listing
            if (listing.neighborhood) {
                parts.push(`Quartier ${listing.neighborhood}`);
            }

            // Country
            const country = listing.country || location?.label;
            if (country) {
                parts.push(country);
            }

            if (parts.length > 0) {
                return parts.join(', ');
            }
        }

        if (location?.region && location?.label) {
            return `${location?.region}, ${location?.label}`;
        }

        return location?.label || "Localisation inconnue";
    }, [location, listing]);

    const surfaceDisplay = useMemo(() => {
        if (!listing.surface) return null;

        if (currentUser?.measurementSystem === 'imperial') {
            return `${Math.round(listing.surface * 10.764)} sq ft`;
        }

        return `${listing.surface} m²`;
    }, [listing.surface, currentUser?.measurementSystem]);

    const titleDisplay = useMemo(() => {
        if (listing.category && surfaceDisplay) {
            return `${listing.category} de ${surfaceDisplay}`;
        }
        return listing.title;
    }, [listing.category, surfaceDisplay, listing.title]);

    return (
        <div className="col-span-4 flex flex-col gap-8">
            {/* Header Section */}
            <div className="flex flex-col gap-6">
                <Heading
                    title={titleDisplay}
                    subtitle={locationLabel}
                    subtitleClassName="mt-1"
                />
                <div
                    className="
                        w-full
                        h-[40vh]
                        overflow-hidden 
                        rounded-xl
                        relative
                    "
                >
                    <Image
                        alt="Image"
                        src={listing.images[0]?.url || '/images/placeholder.svg'} // Access via relation if available or listing.imageSrc
                        fill
                        className="object-cover w-full"
                    />
                    <div className="absolute top-5 right-5">
                        <HeartButton
                            listingId={listing.id}
                            currentUser={currentUser}
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div
                    className="
                        text-xl 
                        font-semibold 
                        flex 
                        flex-row 
                        items-center
                        gap-2
                    "
                >
                    <div>Hébergé par {listing.user?.name}</div>
                    <Avatar src={listing.user?.image} />
                </div>
                <div className="
                    flex 
                    flex-row 
                    items-center 
                    gap-4 
                    font-light
                    text-neutral-500
                ">
                    <div>
                        {listing.guestCount} guests
                    </div>
                    <div>
                        {listing.roomCount} rooms
                    </div>
                    <div>
                        {listing.bathroomCount} bathrooms
                    </div>
                </div>
            </div>

            <hr />

            <div className="text-lg font-light text-neutral-500">
                {listing.description}
            </div>

            <hr />

            <ListingAmenities listing={listing} />

            <hr />

            <ListingEnergy dpe={listing.dpe} ges={listing.ges} />

            <hr />

            {/* Transit Section */}
            {listing.latitude && listing.longitude && (
                <>
                    <ListingTransit
                        latitude={listing.latitude}
                        longitude={listing.longitude}
                        listingId={listing.id}
                    />
                    <hr />
                </>
            )}

            {/* Neighborhood Score Section */}
            {listing.latitude && listing.longitude && (
                <NeighborhoodScore
                    latitude={listing.latitude}
                    longitude={listing.longitude}
                />
            )}

        </div>
    );
}

export default ListingPreview;
