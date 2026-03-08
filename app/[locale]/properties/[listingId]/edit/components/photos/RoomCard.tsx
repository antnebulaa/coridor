'use client';

import Image from "next/image";
import { Room, PropertyImage } from "@prisma/client";
import { ImageOff, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ROOMS_CONFIG } from "./AddRoomModal";

interface RoomCardProps {
    room: Room & { images: PropertyImage[] };
    onClick: () => void;
    isSelecting?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({
    room,
    onClick,
    isSelecting,
    isSelected,
    onSelect
}) => {
    const coverImage = room.images.length > 0 ? room.images[0].url : null;
    const nameLower = room.name.toLowerCase();
    const roomConfig = ROOMS_CONFIG.find(r => nameLower.startsWith(r.label.toLowerCase()));
    const RoomIcon = roomConfig?.icon || ImageOff;

    const handleClick = () => {
        if (isSelecting) {
            onSelect?.();
        } else {
            onClick();
        }
    };

    return (
        <div
            className="flex flex-col gap-3 cursor-pointer group"
            onClick={handleClick}
        >
            <div className={`
                aspect-square relative rounded-3xl overflow-hidden bg-neutral-100 transition-shadow duration-200
                ${isSelected ? 'ring-2 ring-neutral-900 dark:ring-white' : ''}
            `}>
                {coverImage ? (
                    <Image
                        fill
                        src={coverImage}
                        alt={room.name}
                        className={`object-cover transition duration-200 ${isSelecting ? '' : 'group-hover:scale-110'} ${isSelected ? 'opacity-80' : ''}`}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center">
                        <RoomIcon size={36} strokeWidth={1.5} className="text-neutral-400" />
                    </div>
                )}

                {/* Selection checkbox */}
                <AnimatePresence>
                    {isSelecting && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className={`
                                absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-colors duration-150
                                ${isSelected
                                    ? 'bg-neutral-900 dark:bg-white'
                                    : 'bg-black/20 border-2 border-white'
                                }
                            `}
                        >
                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.1 }}
                                >
                                    <Check size={14} strokeWidth={3} className="text-white dark:text-neutral-900" />
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div>
                <div className="font-semibold text-base">{room.name}</div>
                <div className="text-neutral-500 text-sm">
                    {room.images.length} photo{room.images.length > 1 ? 's' : ''}
                </div>
            </div>
        </div>
    );
}

export default RoomCard;
