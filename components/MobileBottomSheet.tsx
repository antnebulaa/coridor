'use client';

import { useState, useEffect } from "react";
import { motion, useAnimation, PanInfo, useDragControls } from "framer-motion";
import ListingCard from "@/components/listings/ListingCard";
import { SafeListing, SafeUser } from "@/types";

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
    const [isOpen, setIsOpen] = useState(false);
    const controls = useAnimation();
    const dragControls = useDragControls();

    useEffect(() => {
        controls.start("collapsed");
    }, [controls]);

    const variants = {
        expanded: { y: 0 },
        collapsed: { y: "calc(100% - 150px)" }
    };

    const handleDragEnd = (_: any, info: PanInfo) => {
        // Velocity check for flick
        const velocity = info.velocity.y;
        const offset = info.offset.y;

        // If dragging UP (negative velocity/offset)
        if (offset < -50 || velocity < -300) {
            setIsOpen(true);
            controls.start("expanded");
        }
        // If dragging DOWN (positive velocity/offset)
        else if (offset > 50 || velocity > 300) {
            setIsOpen(false);
            controls.start("collapsed");
        }
        else {
            // Snap back to nearest state
            controls.start(isOpen ? "expanded" : "collapsed");
        }
    };
                </div >
            </div >

    {/* Scrollable List */ }
{/* Added touch-action-pan-y to allow internal scroll without triggering page actions */ }
<div className="flex-1 overflow-y-auto overscroll-contain bg-neutral-50 p-4 pb-32 touch-pan-y">
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
        </motion.div >
    );
};

export default MobileBottomSheet;
