'use client';


import dynamic from "next/dynamic";
import ListingCard from "@/components/listings/ListingCard";
import ListingPreview from "@/components/listings/ListingPreview";
// Fix for Leaflet SSR: import dynamically with ssr: false
const MapMain = dynamic(() => import('@/components/MapMain'), {
    ssr: false
});
import Footer from "@/components/Footer";
import { SafeListing, SafeUser } from "@/types";
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";

import { IoClose } from 'react-icons/io5';
import MobileBottomSheet from "@/components/MobileBottomSheet";
import Modal from "@/components/modals/Modal";
import ResumeSearch from "@/components/listings/ResumeSearch";

interface HomeClientProps {
    listings: any[]; // SafeListing + relation
    currentUser?: SafeUser | null;
    isSearchActive?: boolean;
}

const HomeClient: React.FC<HomeClientProps> = ({
    listings,
    currentUser,
    isSearchActive = false
}) => {
    const [selectedListingId, setSelectedListingId] = useState<string>('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const selectedListing = useMemo(() =>
        listings.find((listing) => listing.id === selectedListingId) || listings[0],
        [listings, selectedListingId]);

    // Map Column Classes
    const mapColumnClasses = isSearchActive
        ? "col-span-1 md:col-span-5 xl:col-span-6 h-full w-full absolute inset-0 md:relative md:block md:py-6 md:pr-6 md:pl-3 z-0"
        : "hidden md:block md:col-span-5 xl:col-span-6 h-full py-6 pr-6 pl-3";

    // List Column Classes
    const listColumnClasses = isSearchActive
        ? "hidden md:block col-span-1 md:col-span-7 xl:col-span-6 h-full overflow-y-auto scrollbar-hide"
        : "col-span-1 md:col-span-7 xl:col-span-6 h-full overflow-y-auto scrollbar-hide";

    return (
        <div className="
            max-w-[2520px] 
            mx-auto
        ">
            <div className="
                h-[calc(100vh-5rem)]
                grid 
                grid-cols-1 md:grid-cols-12 
                gap-0
                overflow-hidden
                relative
            ">
                {/* Left Column: List + Footer */}
                <div className={listColumnClasses}>
                    <div className="pt-6 px-[10px] md:pl-6 md:pr-3 pb-32 md:pb-6">

                        {!isSearchActive && (
                            <ResumeSearch />
                        )}
                        <div className="
                            grid 
                            grid-cols-1 
                            gap-1.5
                        ">
                            {listings.map((listing: any) => (
                                <div
                                    key={listing.id}
                                    className="cursor-pointer border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-4 md:border-none md:pb-0 md:mb-0 last:border-none last:pb-0 last:mb-0"
                                >
                                    <ListingCard
                                        currentUser={currentUser}
                                        data={listing}
                                        variant="horizontal"
                                        onSelect={() => setSelectedListingId(listing.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <Footer />
                </div>

                {/* Right Column: Map */}
                <div className={mapColumnClasses}>
                    <div className="h-full w-full relative">
                        <MapMain
                            listings={listings}
                            selectedListingId={selectedListingId}
                            onSelect={(id) => setSelectedListingId(id)}
                            currentUser={currentUser}
                        />

                        {/* DESKTOP Overlay Modal */}
                        {selectedListingId && selectedListing && (
                            <div className="
                                hidden md:flex
                                absolute 
                                top-6 
                                bottom-6
                                left-6 
                                w-[400px] 
                                z-[1000]
                                bg-card 
                                rounded-[20px] 
                                shadow-2xl
                                overflow-hidden
                                flex-col
                            ">
                                <div className="relative h-full flex flex-col">
                                    <button
                                        onClick={() => setSelectedListingId('')}
                                        className="
                                            absolute 
                                            top-4 
                                            right-4 
                                            z-50 
                                            p-2
                                            bg-card 
                                            rounded-full 
                                            hover:bg-muted 
                                            shadow-md
                                        "
                                    >
                                        <IoClose size={24} />
                                    </button>
                                    <div className="flex-1 overflow-y-auto p-6">
                                        <ListingPreview
                                            listing={selectedListing}
                                            currentUser={currentUser}
                                        />
                                    </div>
                                    {/* Fixed Bottom Footer for Desktop Overlay */}
                                    <div className="p-4 border-t bg-white flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <div className="flex flex-row items-center gap-1">
                                                <div className="font-semibold text-lg">
                                                    {selectedListing.price} €
                                                </div>
                                                <div className="font-light text-neutral-500 text-sm">
                                                    / mois
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-[140px]">
                                            <ListingPreview.ApplyButton
                                                currentUser={currentUser}
                                                listing={selectedListing}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* BOTTOM SHEET - Mobile Search Only - Hide when a listing is selected to prevent scroll locking */}
                {isSearchActive && !selectedListingId && (
                    <MobileBottomSheet
                        listings={listings}
                        currentUser={currentUser}
                        onSelectListing={(id) => setSelectedListingId(id)}
                    />
                )}
            </div>

            {/* Mobile Listing Modal - Using Shared Modal Component to fix scroll */}
            <Modal
                isOpen={!!(selectedListingId && selectedListing)}
                onClose={() => setSelectedListingId('')}
                onSubmit={() => setSelectedListingId('')}
                title="Détails du logement"
                actionLabel="" /* Hide default footer button */
                className="md:hidden"
                body={
                    selectedListing ? (
                        <div className="pb-24">
                            <ListingPreview
                                listing={selectedListing}
                                currentUser={currentUser}
                            />
                        </div>
                    ) : undefined
                }
            />
        </div>
    );
};

export default HomeClient;
