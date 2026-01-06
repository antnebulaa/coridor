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
import ListingCommute from "./ListingCommute";
import NeighborhoodScore from "./NeighborhoodScore";
import ListingCardCarousel from "./ListingCardCarousel";
import { Camera, Euro } from "lucide-react";
import ImageModal from "../modals/ImageModal";
import { Button } from "../ui/Button";
import useLoginModal from "@/hooks/useLoginModal";
import ApplicationModal from "../modals/ApplicationModal";
import { useCallback } from "react";
import ListingMobileFooter from "./ListingMobileFooter";
import IncompleteProfileModal from "../modals/IncompleteProfileModal";

const MapComponent = dynamic(() => import('../Map'), {
    ssr: false
});

interface ListingPreviewProps {
    listing: SafeListing & { user?: SafeUser };
    currentUser?: SafeUser | null;
    isMobileModal?: boolean;
}

const ListingPreview: React.FC<ListingPreviewProps> = ({
    listing,
    currentUser,
    isMobileModal = false
}) => {
    const { getByValue } = useCountries();
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
    const [isIncompleteProfileModalOpen, setIsIncompleteProfileModalOpen] = useState(false);
    const loginModal = useLoginModal();

    const onApply = useCallback(() => {
        if (!currentUser) {
            return loginModal.onOpen();
        }

        // Check if profile is complete (basic check: jobType OR netSalary)
        const isProfileComplete = !!(currentUser.tenantProfile?.jobType || currentUser.tenantProfile?.netSalary);

        if (!isProfileComplete) {
            return setIsIncompleteProfileModalOpen(true);
        }

        setIsApplicationModalOpen(true);
    }, [currentUser, loginModal]);

    const location = getByValue((listing as any).locationValue);
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
        if ((listing as any).rooms) {
            (listing as any).rooms.forEach((room: any) => {
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
    }, [listing.images, (listing as any).rooms]);

    // Reusable Image Component
    const ImageSection = (
        <div
            className={`
                w-full
                overflow-hidden 
                relative
                group
                ${isMobileModal ? 'h-[40vh] rounded-none' : 'h-[40vh] rounded-xl'}
            `}
        >
            <div onClick={() => setIsImageModalOpen(true)} className="w-full h-full cursor-pointer">
                <ListingCardCarousel images={listingImages} />
            </div>

            <div className={`absolute z-10 ${isMobileModal ? 'top-6 right-6' : 'top-5 right-5'}`}>
                <HeartButton
                    listingId={listing.id}
                    currentUser={currentUser}
                    listingImage={listing.images?.[0]?.url}
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
                {listingImages.length} photos
            </button>
        </div>
    );

    // Reusable Header Component
    const HeaderSection = (
        <Heading
            title={titleDisplay}
            subtitle={locationLabel}
            subtitleClassName="mt-1"
        />
    );


    return (
        <>
            <div className={`col-span-4 flex flex-col gap-8`}>
                {/* Header Section */}
                <div className={`flex flex-col gap-6 ${isMobileModal ? 'px-0' : ''}`}>
                    {isMobileModal ? (
                        <>
                            {ImageSection}
                            <div className="px-6">
                                {HeaderSection}
                            </div>
                        </>
                    ) : (
                        <>
                            {HeaderSection}
                            {ImageSection}
                        </>
                    )}
                </div>


                <div className={`
                    flex 
                    flex-row 
                    flex-wrap 
                    items-center 
                    gap-4 
                    font-normal
                    text-base
                    text-neutral-500
                    ${isMobileModal ? 'px-6' : ''}
                `}>
                    <div>
                        {listing.guestCount || 0} {(listing.guestCount || 0) > 1 ? 'chambres' : 'chambre'}
                    </div>
                    <div>
                        {listing.roomCount || 0} {(listing.roomCount || 0) > 1 ? 'pièces' : 'pièce'}
                    </div>
                    <div>
                        {listing.bathroomCount || 0} {(listing.bathroomCount || 0) > 1 ? 'salles de bain' : 'salle de bain'}
                    </div>
                    {listing.isFurnished !== undefined && (
                        <div>• {listing.isFurnished ? 'Meublé' : 'Non meublé'}</div>
                    )}
                    {listing.floor !== undefined && listing.floor !== null && (
                        <div>
                            • {listing.floor === 0 ? 'RDC' : `Étage ${listing.floor}`}{listing.totalFloors ? ` / ${listing.totalFloors}` : ''}
                        </div>
                    )}
                </div>


                <hr className={isMobileModal ? 'mx-6' : ''} />

                <div className={`text-base font-normal text-neutral-500 ${isMobileModal ? 'px-6' : ''}`}>
                    {listing.description}
                </div>

                <hr className={isMobileModal ? 'mx-6' : ''} />

                {/* Financial Details Section */}
                <div className={`flex flex-col gap-6 ${isMobileModal ? 'px-6' : ''}`}>
                    <div className="text-xl font-semibold flex items-center gap-2">
                        <Euro size={24} />
                        Informations financières
                    </div>
                    <div className="flex flex-col gap-4 text-muted-foreground">
                        <div className="flex justify-between max-w-[400px]">
                            <span>Loyer hors charges :</span>
                            <span className="font-medium text-black">{listing.price} € / mois</span>
                        </div>
                        {listing.charges && (
                            <div className="flex justify-between max-w-[400px]">
                                <span>Provisions sur charges :</span>
                                <span className="font-medium text-black">+ {(listing.charges as any).amount} € / mois</span>
                            </div>
                        )}
                        {/* Total Display */}
                        <div className="flex justify-between max-w-[400px] border-t pt-2 mt-1">
                            <span className="font-medium text-black">Loyer charges comprises :</span>
                            <span className="font-bold text-black">{listing.price + (listing.charges ? (listing.charges as any).amount : 0)} € / mois</span>
                        </div>

                        {listing.securityDeposit !== undefined && listing.securityDeposit !== null && (
                            <div className="flex justify-between max-w-[400px] mt-2 bg-neutral-50 p-2 rounded-lg">
                                <span>Dépôt de garantie :</span>
                                <span className="font-medium text-black">{listing.securityDeposit === 0 ? "Aucun" : `${listing.securityDeposit} €`}</span>
                            </div>
                        )}
                    </div>
                </div>

                <hr className={isMobileModal ? 'mx-6' : ''} />

                <div className={isMobileModal ? 'px-6' : ''}>
                    <ListingAmenities listing={listing} />
                </div>

                <hr className={isMobileModal ? 'mx-6' : ''} />

                <div className={isMobileModal ? 'px-6' : ''}>
                    <ListingEnergy
                        dpe={listing.dpe}
                        ges={listing.ges}
                        heatingSystem={listing.heatingSystem}
                        glazingType={listing.glazingType}
                        listing={listing}
                    />
                </div>

                <hr className={isMobileModal ? 'mx-6' : ''} />

                {/* Commute Section */}
                <div className={isMobileModal ? 'px-6' : ''}>
                    <ListingCommute listing={listing} currentUser={currentUser} />
                </div>
                <hr className={isMobileModal ? 'mx-6' : ''} />

                {/* Transit Section */}
                {listing.latitude && listing.longitude && (
                    <>
                        <div className={isMobileModal ? 'px-6' : ''}>
                            <ListingTransit
                                latitude={listing.latitude}
                                longitude={listing.longitude}
                                listingId={listing.id}
                            />
                        </div>
                        <hr className={isMobileModal ? 'mx-6' : ''} />
                    </>
                )}

                {/* Neighborhood Score Section */}
                {/* {listing.latitude && listing.longitude && (
                    <NeighborhoodScore
                        latitude={listing.latitude}
                        longitude={listing.longitude}
                    />
                )} */}

            </div >

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

            <IncompleteProfileModal
                isOpen={isIncompleteProfileModalOpen}
                onClose={() => setIsIncompleteProfileModalOpen(false)}
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
    const [isIncompleteProfileModalOpen, setIsIncompleteProfileModalOpen] = useState(false);

    const onApply = useCallback(() => {
        if (!currentUser) {
            return loginModal.onOpen();
        }

        // Check if profile is complete (basic check: jobType OR netSalary)
        const isProfileComplete = !!(currentUser.tenantProfile?.jobType || currentUser.tenantProfile?.netSalary);

        if (!isProfileComplete) {
            return setIsIncompleteProfileModalOpen(true);
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
            <IncompleteProfileModal
                isOpen={isIncompleteProfileModalOpen}
                onClose={() => setIsIncompleteProfileModalOpen(false)}
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
