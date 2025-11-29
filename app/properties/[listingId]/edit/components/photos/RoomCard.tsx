'use client';

import Image from "next/image";
import { Room, PropertyImage } from "@prisma/client";
import { MoreHorizontal, Trash } from "lucide-react";
import { useState } from "react";

interface RoomCardProps {
    room: Room & { images: PropertyImage[] };
    onClick: () => void;
    onDelete?: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({
    room,
    onClick,
    onDelete
}) => {
    const coverImage = room.images.length > 0 ? room.images[0].url : '/images/placeholder.svg'; // Need a placeholder or handle empty

    return (
        <div
            className="flex flex-col gap-3 cursor-pointer group"
            onClick={onClick}
        >
            <div className="aspect-square relative rounded-2xl overflow-hidden bg-neutral-100">
                {room.images.length > 0 ? (
                    <Image
                        fill
                        src={coverImage}
                        alt={room.name}
                        className="object-cover group-hover:scale-110 transition"
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-neutral-400">
                        No photos
                    </div>
                )}
            </div>
            <div className="flex flex-row items-center justify-between">
                <div>
                    <div className="font-semibold text-base">{room.name}</div>
                    <div className="text-neutral-500 text-sm">
                        {room.images.length} photo{room.images.length > 1 ? 's' : ''}
                    </div>
                </div>
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-2 hover:bg-neutral-100 rounded-full transition text-neutral-500 hover:text-rose-500"
                    >
                        <Trash size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}

export default RoomCard;
