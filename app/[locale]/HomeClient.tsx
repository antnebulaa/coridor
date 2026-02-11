'use client';


import dynamic from "next/dynamic";
import ListingCard from "@/components/listings/ListingCard";
import ListingPreview from "@/components/listings/ListingPreview";
// Fix for Leaflet SSR: import dynamically with ssr: false
const MapMain = dynamic(() => import('@/components/MapMain'), {
    ssr: false
});
import Footer from "@/components/Footer";
import { SafeUser } from "@/types";
import { useState, useMemo, useEffect } from "react";
import { useTranslations } from 'next-intl';

import { IoClose } from 'react-icons/io5';
import { Minimize2, BellPlus } from 'lucide-react';
import MobileBottomSheet from "@/components/MobileBottomSheet";
import Modal from "@/components/modals/Modal";
import ResumeSearch from "@/components/listings/ResumeSearch";
import ListingSort from "@/components/listings/ListingSort";
import { useSearchParams } from "next/navigation";
import { getIsochrone } from "@/app/libs/mapbox"; // Import utility
import SearchAlertModal from "@/components/modals/SearchAlertModal";

interface HomeClientProps {
    listings: any[]; // SafeListing + relation
    currentUser?: SafeUser | null;
    isSearchActive?: boolean;
    likes?: string[];
}

const HomeClient: React.FC<HomeClientProps> = ({
    listings,
    currentUser,
    isSearchActive = false,
    likes = []
}) => {
    const [selectedListingId, setSelectedListingId] = useState<string>('');
    const [isOverlayMinimized, setIsOverlayMinimized] = useState(false);
    const searchParams = useSearchParams();
    const [isochrones, setIsochrones] = useState<any[]>([]);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const t = useTranslations('home');
    const tCommon = useTranslations('common');
    const tListing = useTranslations('listing');

    const currentSearch = useMemo(() => ({
        locationValue: searchParams?.get('locationValue') || undefined,
        category: searchParams?.get('category') || undefined,
        roomCount: searchParams?.get('roomCount') ? parseInt(searchParams.get('roomCount')!) : undefined,
        minPrice: searchParams?.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined,
        maxPrice: searchParams?.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined,
    }), [searchParams]);

    useEffect(() => {
        if (selectedListingId) {
            setIsOverlayMinimized(false);

            // Save selected listing image to localStorage for ResumeSearch
            const listing = listings.find(l => l.id === selectedListingId);
            if (listing && isSearchActive) {
                try {
                    const stored = localStorage.getItem('coridor_last_search');
                    if (stored) {
                        const data = JSON.parse(stored);
                        const firstImage = listing.rentalUnit?.images?.[0]?.url || listing.rentalUnit?.property?.images?.[0]?.url;
                        const updatedData = {
                            ...data,
                            lastListingImage: firstImage,
                            lastListingPrice: listing.price + (listing.charges?.amount || 0)
                        };
                        localStorage.setItem('coridor_last_search', JSON.stringify(updatedData));
                    }
                } catch (error) {
                    console.error('Failed to update last search image', error);
                }
            }
        }
    }, [selectedListingId, listings, isSearchActive]);

    // Fetch Isochrone Clientside for Visualization
    useEffect(() => {
        const fetchIsochrone = async () => {
            const commuteParam = searchParams?.get('commute');
            const lat = searchParams?.get('commuteLatitude');
            const lng = searchParams?.get('commuteLongitude');
            const mode = searchParams?.get('commuteTransportMode');
            const time = searchParams?.get('commuteMaxTime');

            let pointsToFetch: any[] = [];

            if (commuteParam) {
                try {
                    const parsed = JSON.parse(commuteParam);
                    if (Array.isArray(parsed)) pointsToFetch = parsed;
                } catch (e) {
                    console.error("Failed to parse commute param in HomeClient", e);
                }
            } else if (lat && lng && mode && time) {
                pointsToFetch.push({ lat, lng, mode, time });
            }

            if (pointsToFetch.length > 0) {
                try {
                    // Use Promise.all to fetch in parallel but map results to index to preserve order
                    // We want [Result1, Result2] even if Result2 finishes first.
                    const results = await Promise.all(pointsToFetch.map(async (point) => {
                        try {
                            const data = await getIsochrone([+point.lng, +point.lat], point.mode, +point.time);
                            if (data && data.features) {
                                return {
                                    type: 'FeatureCollection',
                                    features: data.features
                                };
                            }
                            return null;
                        } catch (err) {
                            console.error("Failed to fetch isochrone for point", point, err);
                            return null;
                        }
                    }));

                    // Filter out nulls but we should try to keep index if possible for coloring? 
                    // Actually if one fails, we just show what we have. 
                    // But to align with badges (1, 2), we ideally want isochrones[0] to be point[0].
                    // If point[0] fails, maybe we shouldn't show point[1] as "2" if "1" is missing? 
                    // Or just filter valid. Simple approach: Valid results.
                    const validIsochrones = results.filter(res => res !== null);
                    setIsochrones(validIsochrones);

                } catch (error) {
                    console.error("Failed to fetch visual isochrone", error);
                    setIsochrones([]);
                }
            } else {
                setIsochrones([]);
            }
        }

        fetchIsochrone();
    }, [searchParams]);


    const selectedListing = useMemo(() =>
        listings.find((listing) => listing.id === selectedListingId) || listings[0],
        [listings, selectedListingId]);

    // Map Column Classes
    const mapColumnClasses = isSearchActive
        ? "col-span-1 md:col-span-5 xl:col-span-6 h-full w-full absolute inset-0 md:relative md:block md:py-6 md:pr-6 md:pl-3 z-0"
        : "hidden md:block md:col-span-5 xl:col-span-6 h-full py-6 pr-6 pl-3";

    // Desktop Search Split View logic override:
    // When search is active, we often want split view again or full map? 
    // Standard User Request in past: "Two column layout". 
    // Let's keep split view for Search Mode too on desktop?
    // Current logic above seems to make map full width (col-span-12) if active? 
    // Wait, `md:col-span-5` is for non-active. 
    // Let's restore standard split view if that's preferred, but user just asked for Commute. 
    // I will not touch layout logic unless broken, just focusing on Isochrone passing.
    // The previous implementation had `md:col-span-5` for active search in *some* context or full width?
    // Reviewing lines 44-46:
    // Active: `md:col-span-5` for map? No, `md:col-span-5` is in the `else` (hidden on mobile, block on desktop). 
    // Active: `col-span-1 md:col-span-5` ?
    // Let's look at original again.
    // Original Active: `md:col-span-5` (implied by just overwriting `col-span-1` and `absolute` logic for mobile). 
    // Actually, line 45: `md:col-span-5` is there. 
    // Wait, I see `md:col-span-5` in the *Active* string in my review of `HomeClient.tsx` (Line 45)? 
    // No, Line 45 says `md:col-span-5` ? Ah, wait. 
    // Line 45: `... md:col-span-5 xl:col-span-6 ...` 
    // Yes, it keeps split view on desktop. Good.

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
                h-screen md:h-[calc(100vh-5rem)]
                grid 
                grid-cols-1 md:grid-cols-12 
                gap-0
                overflow-hidden
                relative
            ">
                {/* Left Column: List + Footer */}
                <div className={listColumnClasses}>
                    <div className="pt-20 md:pt-4 px-[10px] md:pl-6 md:pr-3 pb-32 md:pb-6">

                        {!isSearchActive && (
                            <ResumeSearch />
                        )}

                        {/* Header: Listings count + Alert button */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                                {t('listingsCount', { count: listings.length })}
                            </div>
                            <button
                                onClick={() => setIsAlertModalOpen(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm font-medium rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition"
                            >
                                <BellPlus size={16} />
                                <span className="hidden sm:inline">{t('alert.create')}</span>
                            </button>
                        </div>

                        {/* Sort dropdown */}
                        <div className="mb-4">
                            <ListingSort />
                        </div>

                        {/* Alert Banner - Desktop only, when search is active */}
                        {isSearchActive && (
                            <div className="hidden md:flex mb-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl p-4 items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-800 rounded-full text-rose-600 dark:text-rose-300">
                                        <BellPlus size={20} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-rose-900 dark:text-rose-100 text-sm">{t('alert.title')}</div>
                                        <div className="text-rose-700 dark:text-rose-300 text-xs">{t('alert.description')}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsAlertModalOpen(true)}
                                    className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition"
                                >
                                    {t('alert.create')}
                                </button>
                            </div>
                        )}

                        <div className="
                            grid 
                            grid-cols-1 
                            gap-4
                            lg:gap-3
                        ">
                            {listings.length === 0 ? (
                                <div className="h-[60vh] flex flex-col gap-2 justify-center items-center">
                                    <div className="text-xl font-bold">{t('noListings')}</div>
                                    <div className="text-neutral-500">{t('noResultsDescription')}</div>
                                </div>
                            ) : (
                                listings.map((listing: any) => (
                                    <div
                                        key={listing.id}
                                        className="cursor-pointer border-b border-neutral-200 dark:border-neutral-800 pb-0 mb-0 md:border-none md:pb-0 md:mb-0 last:border-none last:pb-0 last:mb-0"
                                    >
                                        <ListingCard
                                            currentUser={currentUser}
                                            data={listing}
                                            variant="horizontal"
                                            onSelect={() => setSelectedListingId(listing.id)}
                                            hasLiked={likes?.includes(listing.id)}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <Footer />
                </div>

                {/* Right Column: Map */}
                <div className={mapColumnClasses}>
                    <div className="h-full w-full relative">
                        <MapMain
                            // key removed to prevent "undefined reading appendChild" crash on layout change. 
                            // ResizeHandler within MapMain handles the size update.
                            listings={listings}
                            selectedListingId={selectedListingId}
                            onSelect={(id) => setSelectedListingId(id)}
                            currentUser={currentUser}
                            isochrones={isochrones} // Pass isochrones array
                        />



                        {/* DESKTOP Overlay Modal */}
                        {selectedListingId && selectedListing && (
                            <>
                                {/* MINIMIZED STATE */}
                                {isOverlayMinimized && (
                                    <button
                                        onClick={() => setIsOverlayMinimized(false)}
                                        className="
                                            hidden md:flex
                                            absolute 
                                            top-6 
                                            left-6 
                                            z-1000
                                            bg-white 
                                            dark:bg-neutral-800
                                            hover:bg-neutral-100
                                            dark:hover:bg-neutral-700
                                            text-black
                                            dark:text-white
                                            px-6
                                            py-3
                                            rounded-full 
                                            shadow-xl
                                            items-center
                                            gap-3
                                            font-semibold
                                            transition-transform
                                            hover:scale-105
                                        "
                                    >
                                        <div className="font-bold">{selectedListing.price + ((selectedListing.charges as any)?.amount || 0)} €</div>
                                        <div className="h-4 w-px bg-neutral-300 mx-1"></div>
                                        <div>{t('viewListing')}</div>
                                    </button>
                                )}

                                {/* MAXIMIZED STATE */}
                                {!isOverlayMinimized && (
                                    <div className="
                                        hidden md:flex
                                        absolute 
                                        top-6 
                                        bottom-6
                                        left-6 
                                        w-[400px] 
                                        z-1000
                                        bg-card 
                                        rounded-[20px] 
                                        shadow-2xl
                                        overflow-hidden
                                        flex-col
                                        animate-in slide-in-from-left-5 fade-in duration-300
                                    ">
                                        <div className="relative h-full flex flex-col">
                                            {/* Header Actions */}
                                            {/* Header Actions - RIGHT (Minimize + Close) */}
                                            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                                                {/* Minimize Button */}
                                                <button
                                                    onClick={() => setIsOverlayMinimized(true)}
                                                    className="
                                                        w-9 h-9 flex items-center justify-center
                                                        bg-white/80 dark:bg-black/40
                                                        backdrop-blur-sm
                                                        rounded-full 
                                                        hover:bg-white dark:hover:bg-black/60
                                                        text-neutral-700 dark:text-neutral-200
                                                        shadow-sm
                                                        transition
                                                    "
                                                    title={t('hideListing')}
                                                >
                                                    <Minimize2 size={18} />
                                                </button>

                                                {/* Close Button */}
                                                <button
                                                    onClick={() => setSelectedListingId('')}
                                                    className="
                                                        w-9 h-9 flex items-center justify-center
                                                        bg-transparent
                                                        border border-white
                                                        rounded-full 
                                                        hover:bg-white/20
                                                        text-white
                                                        shadow-sm
                                                        transition
                                                    "
                                                    title={tCommon('close')}
                                                >
                                                    <IoClose size={20} />
                                                </button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                                <ListingPreview
                                                    listing={selectedListing}
                                                    currentUser={currentUser}
                                                />
                                            </div>
                                            {/* Fixed Bottom Footer for Desktop Overlay */}
                                            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <div className="flex flex-row items-center gap-1">
                                                        <div className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                                                            {selectedListing.price + ((selectedListing.charges as any)?.amount || 0)} €
                                                        </div>
                                                        <div className="font-light text-muted-foreground text-sm">
                                                            {tListing('monthChargesIncluded')}
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
                            </>
                        )}
                    </div>
                </div>

                {/* BOTTOM SHEET - Mobile Search Only - Hide when a listing is selected to prevent scroll locking */}
                {isSearchActive && !selectedListingId && (
                    <MobileBottomSheet
                        listings={listings}
                        currentUser={currentUser}
                        onSelectListing={(id) => setSelectedListingId(id)}
                        onAlertClick={() => setIsAlertModalOpen(true)}
                    />
                )}
            </div>

            {/* Mobile Listing Modal - Using Shared Modal Component to fix scroll */}
            <Modal
                isOpen={!!(selectedListingId && selectedListing)}
                onClose={() => setSelectedListingId('')}
                onSubmit={() => setSelectedListingId('')}
                title=""
                actionLabel="" /* Hide default footer button */
                className="md:hidden"
                transparentHeader
                noBodyPadding
                closeButtonVariant="transparent-white"
                body={
                    selectedListing ? (
                        <div className="pb-24">
                            <ListingPreview
                                listing={selectedListing}
                                currentUser={currentUser}
                                isMobileModal
                            />
                        </div>
                    ) : undefined
                }
            />

            <SearchAlertModal
                isOpen={isAlertModalOpen}
                onClose={() => setIsAlertModalOpen(false)}
                currentUser={currentUser}
                currentSearch={currentSearch}
            />
        </div>
    );
};

export default HomeClient;
