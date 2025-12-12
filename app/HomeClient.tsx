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
}

const HomeClient: React.FC<HomeClientProps> = ({
    listings,
    currentUser
}) => {
    const [selectedListingId, setSelectedListingId] = useState<string>('');

    const selectedListing = useMemo(() =>
        listings.find((listing) => listing.id === selectedListingId) || listings[0],
        [listings, selectedListingId]);

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
            ">
                {/* Left Column: List + Footer */}
                <div className="
                    col-span-1 md:col-span-7 xl:col-span-6
                    h-full 
                    overflow-y-auto 
                    scrollbar-hide
                ">
                    <div className="pt-6 px-4 md:pl-6 md:pr-3 pb-6">
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
                <div className="
                    hidden md:block
                    md:col-span-5 xl:col-span-6
                    h-full
                    py-6 pr-6 pl-3
                ">
                    <div className="h-full w-full relative">
                        <MapMain
                            listings={listings}
                            selectedListingId={selectedListingId}
                            onSelect={(id) => setSelectedListingId(id)}
                        />

                        {/* Map Overlay Modal (Google Maps Style) */}
                        {selectedListingId && selectedListing && (
                            <div className="
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
                                flex flex-col
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
            </div>
        </div>
    );
};

export default HomeClient;
