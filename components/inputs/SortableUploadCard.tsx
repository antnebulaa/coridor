'use client';

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { TbX } from 'react-icons/tb';

interface SortableUploadCardProps {
    url: string;
    onRemove: (url: string) => void;
    isCover?: boolean;
}

const SortableUploadCard: React.FC<SortableUploadCardProps> = ({
    url,
    onRemove,
    isCover
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: url });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
                relative 
                group 
                overflow-hidden 
                rounded-xl 
                border-neutral-200 
                border-[1px]
                bg-neutral-50
                cursor-grab
                active:cursor-grabbing
                ${isCover ? 'col-span-2 aspect-video' : 'col-span-1 aspect-square'}
            `}
        >
            <Image
                fill
                style={{ objectFit: 'cover' }}
                src={url}
                alt="Upload"
                className="group-hover:scale-110 transition pointer-events-none"
            />

            {/* Cover Badge */}
            {isCover && (
                <div className="absolute top-2 left-2 bg-neutral-900/80 text-white text-xs font-semibold px-2 py-1 rounded-md z-10">
                    Photo de couverture
                </div>
            )}

            {/* Remove Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation(); // prevent drag
                    onRemove(url);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="
                    absolute 
                    top-2 
                    right-2 
                    bg-white
                    text-neutral-700
                    p-1.5
                    rounded-full 
                    hover:bg-red-500
                    hover:text-white
                    transition
                    shadow-sm
                    opacity-100 md:opacity-0 
                    group-hover:opacity-100
                    z-20
                    cursor-pointer
                "
                type="button"
            >
                <TbX size={16} />
            </button>
        </div>
    );
};

export default SortableUploadCard;
