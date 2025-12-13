'use client';

import { useState } from "react";
import { Drawer } from "vaul";
import ListingCard from "@/components/listings/ListingCard";
import { SafeUser } from "@/types";

interface MobileBottomSheetProps {
    listings: any[];
    currentUser?: SafeUser | null;
    onSelectListing: (id: string) => void;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
    listings,
    currentUser,
    onSelectListing
}) => {
    // Snap points: 
    // - "130px": Collapsed view (Header only)
    // - 0.4: Half-height view (shows ~1-2 listings)
    // - 1: Expanded view (Full available height)
    const [snap, setSnap] = useState<number | string | null>(0.4);

    return (
        <Drawer.Root
            snapPoints={["130px", 0.4, 1]}
            activeSnapPoint={snap}
            setActiveSnapPoint={setSnap}
            open={true}
            modal={false} // Allows interaction with the map when collapsed
            dismissible={false} // Cannot completely close it
        >
            <Drawer.Portal>
                <Drawer.Content
                    className="fixed flex flex-col bg-background border border-border border-b-none rounded-t-[10px] bottom-0 left-0 right-0 h-full max-h-[96%] -mx-px z-1001 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] outline-none md:hidden text-foreground"
                    style={{ pointerEvents: 'auto' }} // Ensure content captures events
                >
                    <Drawer.Title className="sr-only">Liste des logements</Drawer.Title>
                    {/* Handle + Header */}
                    <div className="w-full bg-background flex flex-col items-center pt-4 pb-2 rounded-t-[10px] shrink-0 border-b border-border">
                        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mb-4" />
                        <div className="w-full px-6 pb-2 flex justify-between items-center">
                            <h2 className="text-sm font-semibold text-foreground">
                                {listings.length} {listings.length > 1 ? 'logements' : 'logement'}
                            </h2>
                            {snap !== 1 && (
                                <button
                                    onClick={() => setSnap(1)}
                                    className="text-xs text-muted-foreground font-medium bg-secondary px-3 py-1.5 rounded-full"
                                >
                                    Liste
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 pb-32 bg-muted/30">
                        <div className="flex flex-col gap-4">
                            {listings.map((listing) => (
                                <ListingCard
                                    key={listing.id}
                                    data={listing}
                                    currentUser={currentUser}
                                    variant="horizontal"
                                    onSelect={() => onSelectListing(listing.id)}
                                />
                            ))}
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
};

export default MobileBottomSheet;
