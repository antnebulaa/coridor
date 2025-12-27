'use client';

import useCountries from "@/hooks/useCountries";
import { SafeUser, SafeListing } from "@/types";
import { useMemo, useState } from "react";

import Heading from "../Heading";
import HeartButton from "../HeartButton";
import Image from "next/image";
import ImageModal from "../modals/ImageModal";
import { Camera } from "lucide-react";

interface ListingHeadProps {
    title: string;
    locationValue: string;
    imageSrc: string;
    id: string;
    currentUser?: SafeUser | null;
    listing?: SafeListing;
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

    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const images = useMemo(() => {
        if (!listing) return [{ url: imageSrc }];

        if (listing.images && listing.images.length > 0) {
            return listing.images.map(img => {
                const room = (listing as any).rooms?.find((r: any) => r.id === img.roomId);

                // DEBUG: Force label visualization
                const debugLabel = room?.name || (img.roomId ? `ERR: ROOM NOT FOUND` : `UNASSIGNED`);

                return {
                    url: img.url,
                    label: debugLabel
                }
            })
        }

        return [{ url: imageSrc }];
    }, [listing, imageSrc]);

    return (
        <>
            <Heading
                title={title}
                subtitle={locationLabel}
            />
            <div
                onClick={() => setIsImageModalOpen(true)}
                className="
          w-full
          h-[60vh]
          overflow-hidden 
          rounded-xl
          relative
          cursor-pointer
          group
        "
            >
                <Image
                    alt="Image"
                    src={imageSrc || '/images/placeholder.svg'}
                    fill
                    className="object-cover w-full group-hover:scale-110 transition"
                />
                <div className="absolute top-5 right-5 z-10">
                    <HeartButton
                        listingId={id}
                        currentUser={currentUser}
                    />
                </div>
                <div className="absolute bottom-5 right-5 z-10">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsImageModalOpen(true);
                        }}
                        className="
                            bg-white 
                            hover:bg-neutral-100 
                            text-neutral-800 
                            px-4 
                            py-2 
                            rounded-lg 
                            text-sm 
                            font-semibold 
                            shadow-md 
                            transition 
                            flex 
                            items-center 
                            gap-2
                            border
                            border-neutral-200
                        "
                    >
                        <Camera size={16} />
                        {images.length} photos
                    </button>
                </div>
            </div>
            <ImageModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                images={images}
            />
        </>
    );
}

export default ListingHead;
