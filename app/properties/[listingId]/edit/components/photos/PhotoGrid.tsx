'use client';

import { PropertyImage } from "@prisma/client";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { SortablePhoto } from "./SortablePhoto";
import Image from "next/image";
import { Check, Trash } from "lucide-react";

interface PhotoGridProps {
    id?: string;
    images: PropertyImage[];
    onDelete?: (imageId: string) => void;
    onSelect?: (imageId: string) => void;
    selectedIds?: string[];
    selectable?: boolean;
    emptyContent?: React.ReactNode;
    getItemBadge?: (image: PropertyImage) => string | null | undefined;
    onReorder?: (newOrder: PropertyImage[]) => void;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
    images,
    onDelete,
    onSelect,
    selectedIds = [],
    selectable = false,
    emptyContent,
    getItemBadge,
    onReorder
}) => {
    // Static Grid (Fallback if no Reorder)
    if (!onReorder) {
        return (
            <div className={
                images.length > 0
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    : "w-full h-full min-h-[100px]"
            }>
                {images.length === 0 && emptyContent}
                {images.map((image) => (
                    <div
                        key={image.id}
                        className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer"
                        onClick={() => selectable && onSelect?.(image.id)}
                    >
                        <Image
                            fill
                            src={image.url}
                            alt="Property"
                            className="object-cover group-hover:scale-110 transition"
                        />
                        {getItemBadge?.(image) && (
                            <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded-md text-xs font-semibold shadow-sm z-10 pointer-events-none">
                                {getItemBadge(image)}
                            </div>
                        )}
                        {selectable && (
                            <div className={`
                                absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition z-20
                                ${selectedIds.includes(image.id) ? 'bg-black border-black' : 'bg-black/20 hover:bg-black/40'}
                            `}>
                                {selectedIds.includes(image.id) && <Check size={14} className="text-white" />}
                            </div>
                        )}
                        {!selectable && onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(image.id);
                                }}
                                className="absolute top-2 right-2 bg-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-primary hover:text-white z-20"
                            >
                                <Trash size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <SortableContext items={images.map(img => img.id)} strategy={rectSortingStrategy}>
            <div className={
                images.length > 0
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    : "w-full h-full min-h-[100px]"
            }>
                {images.length === 0 && emptyContent}
                {images.map((image) => (
                    <SortablePhoto
                        key={image.id}
                        image={image}
                        selectable={selectable}
                        selected={selectedIds.includes(image.id)}
                        onSelect={onSelect}
                        onDelete={onDelete}
                        badge={getItemBadge?.(image)}
                    />
                ))}
            </div>
        </SortableContext>
    );
}

export default PhotoGrid;
