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
import { useState, useMemo } from "react";

import { IoClose } from 'react-icons/io5';

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
                        <div className="
                            grid 
                            grid-cols-1 
                            gap-1.5
                        ">
                            {listings.map((listing: any) => (
                                <ListingCard
                                    key={listing.id}
                                    currentUser={currentUser}
                                    data={listing}
                                    variant="horizontal"
                                    onSelect={() => setSelectedListingId(listing.id)}
                                />
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
                                bg-white 
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
                                            bg-white 
                                            rounded-full 
                                            hover:bg-gray-100 
                                            shadow-md
                                        "
                                    >
                                        <IoClose size={24} />
                                    </button>
                                    <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
                                        <ListingPreview
                                            listing={selectedListing}
                                            currentUser={currentUser}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* BOTTOM SHEET - Mobile Search Only */}
                {isSearchActive && (
                    <div className="md:hidden absolute bottom-24 left-0 right-0 z-10 p-4">
                        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x">
                            {listings.map((listing: any) => (
                                <div key={listing.id} className="min-w-[280px] w-[280px] snap-center bg-white rounded-2xl shadow-lg border border-neutral-200 overflow-hidden">
                                    <ListingCard
                                        currentUser={currentUser}
                                        data={listing}
                                        variant="vertical" // Vertical variant for compact card feel
                                        onSelect={() => setSelectedListingId(listing.id)}
                                        showHeart={true}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Listing Modal - Full Screen */}
            {selectedListingId && selectedListing && (
                <div className="
                    md:hidden
                    fixed 
                    inset-0 
                    z-[2000] 
                    bg-white 
                    flex 
                    flex-col
                ">
                    <div className="relative flex-1 flex flex-col">
                        <button
                            onClick={() => setSelectedListingId('')}
                            className="
                                absolute 
                                top-4 
                                left-4 
                                z-50 
                                p-2
                                bg-white 
                                rounded-full 
                                hover:bg-neutral-100 
                                shadow-sm
                                border
                                border-neutral-200
                            "
                        >
                            <IoClose size={24} />
                        </button>
                        <div className="flex-1 overflow-y-auto scrollbar-hide pt-16 px-6 pb-6">
                            <ListingPreview
                                listing={selectedListing}
                                currentUser={currentUser}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeClient;
