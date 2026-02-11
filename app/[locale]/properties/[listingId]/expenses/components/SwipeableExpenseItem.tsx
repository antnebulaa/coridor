'use client';

import { useMotionValue, useTransform, motion, PanInfo, useAnimation } from "framer-motion";
import { Trash2, Receipt } from "lucide-react";
import { useState } from "react";

interface SwipeableExpenseItemProps {
    children: React.ReactNode;
    onDelete: () => void;
    onAddProof: () => void;
    disabled?: boolean;
}

const SwipeableExpenseItem: React.FC<SwipeableExpenseItemProps> = ({
    children,
    onDelete,
    onAddProof,
    disabled
}) => {
    const x = useMotionValue(0);
    const controls = useAnimation();

    // Background Opacity mapping
    // Show immediately starting from 0px up to 80px
    const proofOpacity = useTransform(x, [0, 80], [0, 1]); // Right swipe -> Blue (Left side)
    const deleteOpacity = useTransform(x, [-80, 0], [1, 0]); // Left swipe -> Red (Right side)

    // Background Scale mapping for a nice pop effect
    const proofScale = useTransform(x, [0, 80], [0.8, 1]);
    const deleteScale = useTransform(x, [-80, 0], [1, 0.8]);

    const handleDragEnd = async (_: any, info: PanInfo) => {
        if (disabled) return;

        const threshold = 100; // Trigger threshold
        const dragDistance = info.offset.x;

        if (dragDistance > threshold) {
            // Swiped Right -> Add Proof
            // Trigger action
            onAddProof();
            // Snap back to center
            controls.start({ x: 0 });
        } else if (dragDistance < -threshold) {
            // Swiped Left -> Delete
            onDelete();
            // Snap back to center immediately to avoid UI sticking if deletion isn't instant
            // The visual feedback of deletion should be handled by the list/toast
            controls.start({ x: 0 });
        } else {
            // Not far enough, snap back
            controls.start({ x: 0 });
        }
    };

    return (
        <div className="relative select-none touch-pan-y">
            {/* Background Actions Layer - Only show if not disabled */}
            {!disabled && (
                <div className="absolute inset-0 flex items-center justify-between rounded-xl overflow-hidden pointer-events-none">
                    {/* Left Background (Revealed when swiping Right) - Blue */}
                    <motion.div
                        style={{ opacity: proofOpacity }}
                        className="absolute left-0 top-0 bottom-0 w-full bg-blue-500 flex items-center justify-start pl-2 text-white"
                    >
                        <motion.div style={{ scale: proofScale }} className="flex items-center">
                            <Receipt size={24} />
                            <span className="font-medium ml-2">Reçu</span>
                        </motion.div>
                    </motion.div>

                    {/* Right Background (Revealed when swiping Left) - Red */}
                    <motion.div
                        style={{ opacity: deleteOpacity }}
                        className="absolute right-0 top-0 bottom-0 w-full bg-red-500 flex items-center justify-end pr-2 text-white"
                    >
                        <motion.div style={{ scale: deleteScale }} className="flex items-center">
                            <span className="font-medium mr-2">Supprimer</span>
                            <Trash2 size={24} />
                        </motion.div>
                    </motion.div>
                </div>
            )}

            {/* Foreground Content Layer */}
            <motion.div
                drag={disabled ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }} // This creates the resistance!
                dragElastic={disabled ? 0 : 0.7} // Allow pulling significantly past constraints
                animate={controls}
                onDragEnd={handleDragEnd}
                style={{ x, touchAction: "pan-y" }}
                className={`relative bg-white z-10 rounded-xl ${!disabled && "cursor-grab active:cursor-grabbing"}`}
            >
                {children}
            </motion.div>
        </div>
    );
}

export default SwipeableExpenseItem;
