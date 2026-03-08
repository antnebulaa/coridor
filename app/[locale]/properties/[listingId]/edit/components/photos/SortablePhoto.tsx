'use client';

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { PropertyImage } from "@prisma/client";
import { Check, GripVertical } from "lucide-react";

interface SortablePhotoProps {
    image: PropertyImage;
    selectable?: boolean;
    selected?: boolean;
    onSelect?: (id: string) => void;
    onDelete?: (id: string) => void;
    badge?: string | null;
}

export const SortablePhoto = ({
    image,
    selectable,
    selected,
    onSelect,
    onDelete,
    badge
}: SortablePhotoProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: image.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : "auto",
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`
                relative
                aspect-square
                rounded-2xl
                overflow-hidden
                group
            `}
            onClick={() => selectable && onSelect && onSelect(image.id)}
        >
            <Image
                fill
                src={image.url}
                alt="Property"
                className="object-cover group-hover:scale-110 transition pointer-events-none"
                draggable={false}
            />

            {/* Badge */}
            {badge && (
                <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded-md text-xs font-semibold shadow-sm z-10 pointer-events-none">
                    {badge}
                </div>
            )}

            {/* Drag handle — visible when not selecting */}
            {!selectable && (
                <div
                    {...listeners}
                    className="absolute top-2 left-2 w-9 h-9 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center cursor-grab active:cursor-grabbing z-20 touch-none"
                >
                    <GripVertical size={16} className="text-white" />
                </div>
            )}

            {/* Selection checkbox */}
            {selectable && (
                <div className={`
                    absolute
                    top-2
                    right-2
                    w-6
                    h-6
                    rounded-full
                    border-2
                    border-white
                    flex
                    items-center
                    justify-center
                    transition
                    z-20
                    ${selected ? 'bg-black border-black' : 'bg-black/20 hover:bg-black/40'}
                `}>
                    {selected && <Check size={14} className="text-white" />}
                </div>
            )}
        </div>
    );
};
