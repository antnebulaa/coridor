'use client';

import { useState, useEffect } from "react";
import { motion, useAnimation, PanInfo, useDragControls } from "framer-motion";
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
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
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
            pointer-events-auto
        "
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.05}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
        >
            {/* Drag Handle Area - Target for Drag */}
            <div
                className="
                    w-full 
                    pt-4 
                    pb-4 
                    flex 
                    flex-col 
                    items-center 
                    justify-center 
                    shrink-0 
                    touch-none 
                    cursor-grab 
                    active:cursor-grabbing 
                    bg-white 
                    rounded-t-[24px]
                    border-b
                    border-neutral-100
                "
                onPointerDown={(e) => dragControls.start(e)}
            >
                <div className="w-10 h-1 bg-neutral-300 rounded-full mb-3" />
                <div className="w-full px-6 flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-neutral-800">
                        {listings.length} {listings.length > 1 ? 'logements' : 'logement'}
                    </h2>
                    {!isOpen && (
                        <span className="text-xs text-neutral-500 font-medium bg-neutral-100 px-2 py-1 rounded-full">Afficher la liste</span>
                    )}
                </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto overscroll-contain bg-neutral-50 p-4 pb-32">
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
        </motion.div>
    );
};

export default MobileBottomSheet;
