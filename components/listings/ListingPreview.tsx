'use client';

import { SafeListing, SafeUser } from "@/types";
import Avatar from "../Avatar";
import useCountries from "@/hooks/useCountries";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ListingEnergy from "./ListingEnergy";
import ListingAmenities from "./ListingAmenities";

import Image from "next/image";
import HeartButton from "../HeartButton";
import Heading from "../Heading";
import ListingTransit from "./ListingTransit";
import NeighborhoodScore from "./NeighborhoodScore";
import ListingCardCarousel from "./ListingCardCarousel";
import { Camera } from "lucide-react";
import ImageModal from "../modals/ImageModal";
import { Button } from "../ui/Button";
import useLoginModal from "@/hooks/useLoginModal";
import ApplicationModal from "../modals/ApplicationModal";
import { useCallback } from "react";
import ListingMobileFooter from "./ListingMobileFooter";

const MapComponent = dynamic(() => import('../Map'), {
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
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
    const loginModal = useLoginModal();

    const onApply = useCallback(() => {
        if (!currentUser) {
            return loginModal.onOpen();
        }
        setIsApplicationModalOpen(true);
    }, [currentUser, loginModal]);

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



    const listingImages = useMemo(() => {
        // Create a map of room IDs to room names for O(1) lookup
        const roomMap = new Map<string, string>();
        if (listing.rooms) {
            listing.rooms.forEach(room => {
                roomMap.set(room.id, room.name);
            });
        }

        return listing.images.map(img => {
            let label = undefined;
            if (img.roomId && roomMap.has(img.roomId)) {
                label = roomMap.get(img.roomId);
            }

            return {
                url: img.url,
                label: label
            };
        });
    }, [listing.images, listing.rooms]);

    return (
        <>
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
                        group
                    "
                    >
                        <div onClick={() => setIsImageModalOpen(true)} className="w-full h-full cursor-pointer">
                            <ListingCardCarousel images={listingImages} />
                        </div>

                        <div className="absolute top-5 right-5 z-10">
                            <HeartButton
                                listingId={listing.id}
                                currentUser={currentUser}
                            />
                        </div>

                        {/* "Voir toutes les photos" Button */}
                        <button
                            onClick={() => setIsImageModalOpen(true)}
                            className="
                            absolute 
                            bottom-5 
                            right-5 
                            bg-white 
                            hover:bg-neutral-100 
                            text-black 
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
                            z-20
                        "
                        >
                            <Camera size={18} />
                            Voir toutes les photos
                        </button>
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
                    font-normal
                    text-base
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

                <div className="text-lg font-normal text-neutral-500">
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

            <ImageModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                images={listingImages}
            />

            <ApplicationModal
                isOpen={isApplicationModalOpen}
                onClose={() => setIsApplicationModalOpen(false)}
                listing={listing}
                currentUser={currentUser}
            />

            <ListingMobileFooter
                listing={listing}
                onApply={onApply}
            />
        </>
    );
}

// Subcomponent to handle Apply logic independently
const ApplyButton: React.FC<{ listing: SafeListing, currentUser?: SafeUser | null }> = ({
    listing,
    currentUser
}) => {
    const loginModal = useLoginModal();
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);

    const onApply = useCallback(() => {
        if (!currentUser) {
            return loginModal.onOpen();
        }
        setIsApplicationModalOpen(true);
    }, [currentUser, loginModal]);

    return (
        <>
            <Button
                label="Candidater"
                onClick={onApply}
            />
            <ApplicationModal
                isOpen={isApplicationModalOpen}
                onClose={() => setIsApplicationModalOpen(false)}
                listing={listing}
                currentUser={currentUser}
            />
        </>
    );
};

// Start of assigning static property to the component function
type ListingPreviewType = React.FC<ListingPreviewProps> & {
    ApplyButton: React.FC<{ listing: SafeListing, currentUser?: SafeUser | null }>
};

const ListingPreviewWithSub = ListingPreview as ListingPreviewType;
ListingPreviewWithSub.ApplyButton = ApplyButton;

export default ListingPreviewWithSub;
