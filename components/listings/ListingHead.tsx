import useCountries from "@/hooks/useCountries";
import { SafeUser, SafeListing } from "@/types";
import { useMemo } from "react";

import Heading from "../Heading";
import HeartButton from "../HeartButton";
import Image from "next/image";

interface ListingHeadProps {
    title: string;
    locationValue: string;
    imageSrc: string;
    id: string;
    currentUser?: SafeUser | null;
    listing?: SafeListing; // Make optional initially to avoid breaking other usages slightly, or fix usage
}

const ListingHead: React.FC<ListingHeadProps> = ({
    title,
    locationValue,
    imageSrc,
    id,
    currentUser,
    listing
}) => {
    const { getByValue } = useCountries();

    const location = getByValue(locationValue);

    const locationLabel = useMemo(() => {
        if (listing) {
            const parts = [];
            // City + District (e.g. Paris 17e)
            if (listing.city) {
                let cityPart = listing.city;
                if (listing.district) {
                    cityPart += ` ${listing.district}`;
                }
                parts.push(cityPart);
            }

            // Neighborhood
            if (listing.neighborhood) {
                parts.push(`Quartier ${listing.neighborhood}`);
            }

            // Country (fallback to Hook region if not in listing specific)
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

    return (
        <>
            <Heading
                title={title}
                subtitle={locationLabel}
            />
            <div
                className="
          w-full
          h-[60vh]
          overflow-hidden 
          rounded-xl
          relative
        "
            >
                <Image
                    alt="Image"
                    src={imageSrc || '/images/placeholder.svg'}
                    fill
                    className="object-cover w-full"
                />
                <div className="absolute top-5 right-5">
                    <HeartButton
                        listingId={id}
                        currentUser={currentUser}
                    />
                </div>
            </div>
        </>
    );
}

export default ListingHead;
