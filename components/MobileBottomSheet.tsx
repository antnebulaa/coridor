'use client';

import { useState, useEffect } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import ListingCard from "@/components/listings/ListingCard";
import { SafeListing, SafeUser } from "@/types";

interface MobileBottomSheetProps {
    listings: any[]; // SafeListing + relation
    currentUser?: SafeUser | null;
    onSelectListing: (id: string) => void;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
    listings,
    currentUser,
    onSelectListing
}) => {
    // Height states
    // We want the sheet to be:
    // 1. Collapsed: Showing just the top part (e.g., 140px)
    // 2. Expanded: Covering most of the screen (e.g., top-24)
    const [isOpen, setIsOpen] = useState(false);
    const controls = useAnimation();

    // Drag constraints
    // This needs to be responsive or estimated. For simplicity in this iteration:
    // Collapsed Y = 0 (we'll position the container relative to bottom)
    // Expanded Y = -negative value to slide up depending on viewport height?
    // Easier approach: Fixed positioning of the container top.

    // Let's use a fixed container at the bottom, and animate the height or Y transform.
    // Better: Fixed container `inset-x-0 bottom-0`.
    // Initial state (Collapsed): `height: 140px` or `y` offset.
    // Expanded state: `height: 80vh` or top constraint.

    // Framer Motion approach:
    // Container fixed at bottom, height 100vh? No.
    // Let's make the container height adaptable.

    // Using `y` translate is smoother.
    // Container: Fixed, `top-[10vh] bottom-0` but initially translated down?
    // Let's try:
    // Start: y = "calc(100% - 140px)" relative to a full-screen container?
    // Or just simpler:
    // The element is `fixed bottom-0 w-full h-[85vh] bg-white rounded-t-3xl`.
    // Initial `y`: `calc(100% - 80px)` (showing 80px header).

    useEffect(() => {
        // Start collapsed
        controls.start("collapsed");
    }, [controls]);

    const variants = {
        expanded: { y: 0 },
        collapsed: { y: "calc(100% - 140px)" } // Shows top 140px (enough for header + hint of card)
    };

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 100; // px to trigger change
        if (info.offset.y < -threshold) {
            setIsOpen(true);
            controls.start("expanded");
        } else if (info.offset.y > threshold) {
            setIsOpen(false);
            controls.start("collapsed");
        } else {
            // Revert to current state
            controls.start(isOpen ? "expanded" : "collapsed");
        }
    };

    return (
        <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }} // Constraints applied via controls/snap usually, here we enforce via dragElastic/snap
            dragElastic={0.2}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            animate={controls}
            variants={variants}
            initial="collapsed"
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="
        md:hidden
        fixed 
        left-0 
        right-0 
        bottom-0 
        h-[85vh] 
        bg-white 
        rounded-t-[24px] 
        shadow-[0_-4px_20px_rgba(0,0,0,0.1)] 
        z-[1001]
        flex
        flex-col
      "
        >
            {/* Handle / Grabber */}
            <div className="w-full h-8 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
            </div>

            {/* Content */}
            <div className="px-6 pb-4 shrink-0 border-b border-neutral-100 bg-white">
                <h2 className="text-lg font-bold text-neutral-800">
                    {listings.length} {listings.length > 1 ? 'logements' : 'logement'}
                </h2>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 pt-2 pb-24 touch-pan-y">
                {/* Important: touch-pan-y allows scrolling inside the draggable if not capturing drag? 
           Framer motion `drag` on parent might conflict with scroll.
           Usually we want drag on header only, or handle drag vs scroll.
           
           Solution: Apply `dragListener={false}` to main div, 
           and add a `dragControls` triggered by header?
           
           OR: Just keep drag on the whole thing but use `dragControls`.
           Let's try simpler: Drag handle area only?
           Airbnb allows dragging content if at top?
           
           Let's restrict drag to the Handle + Header area to avoid scroll conflicts for now.
        */}
            </div>
        </motion.div>
    );
};

// Re-write to use dragControls for better scroll handling
import { useDragControls } from "framer-motion";

const MobileBottomSheetFinal: React.FC<MobileBottomSheetProps> = ({
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
        if (info.offset.y < -50 || (info.velocity.y < -500 && !isOpen)) {
            setIsOpen(true);
            controls.start("expanded");
        } else if (info.offset.y > 50 || (info.velocity.y > 500 && isOpen)) {
            setIsOpen(false);
            controls.start("collapsed");
        } else {
            controls.start(isOpen ? "expanded" : "collapsed");
        }
    };

    return (
        <motion.div
            animate={controls}
            initial="collapsed"
            variants={variants}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="
            md:hidden
            fixed 
            left-0 
            right-0 
            bottom-0 
            h-[85vh] 
            bg-white 
            rounded-t-[24px] 
            shadow-[0_-4px_25px_rgba(0,0,0,0.15)] 
            z-[1001]
            flex
            flex-col
            will-change-transform
        "
            drag="y"
            dragListener={false} // Only trigger drag via controls
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.05}
            onDragEnd={handleDragEnd}
        >
            {/* Drag Handle Area - Target for Drag */}
            <div
                className="w-full pt-3 pb-3 flex flex-col items-center justify-center shrink-0 touch-none cursor-grab active:cursor-grabbing bg-white rounded-t-[24px]"
                onPointerDown={(e) => dragControls.start(e)}
            >
                <div className="w-10 h-1 bg-neutral-300 rounded-full mb-3" />
                <div className="w-full px-6 flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-neutral-800">
                        {listings.length} {listings.length > 1 ? 'logements' : 'logement'}
                    </h2>
                    {!isOpen && (
                        <span className="text-xs text-neutral-500 font-medium">Afficher la liste</span>
                    )}
                </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 pb-24">
                <div className="flex flex-col gap-4">
                    {listings.map((listing) => (
                        <ListingCard
                            key={listing.id}
                            data={listing}
                            currentUser={currentUser}
                            variant="horizontal" // Use Horizontal (landscape) cards for the list
                            onSelect={() => onSelectListing(listing.id)}
                        />
                    ))}
                </div>
                {/* Safe area spacer */}
                <div className="h-12" />
            </div>
        </motion.div>
    );
};

export default MobileBottomSheetFinal;
