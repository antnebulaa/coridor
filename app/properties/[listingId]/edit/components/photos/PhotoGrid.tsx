'use client';

import Image from "next/image";
import { PropertyImage } from "@prisma/client";
import { Check, Trash } from "lucide-react";

import { Droppable, Draggable } from "@hello-pangea/dnd";

interface PhotoGridProps {
    id?: string; // Droppable ID
    images: PropertyImage[];
    onDelete?: (imageId: string) => void;
    onSelect?: (imageId: string) => void;
    selectedIds?: string[];
    selectable?: boolean;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
    id = "grid",
    images,
    onDelete,
    onSelect,
    selectedIds = [],
    selectable = false
}) => {
    return (
        <Droppable droppableId={id} direction="horizontal">
            {(provided) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                    {images.map((image, index) => {
                        const isSelected = selectedIds.includes(image.id);

                        return (
                            <Draggable key={image.id} draggableId={image.id} index={index}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`
                                            relative 
                                            aspect-square 
                                            rounded-2xl 
                                            overflow-hidden 
                                            group
                                            cursor-pointer
                                            border-2
                                            transition-colors
                                            ${isSelected ? 'border-black' : 'border-transparent'}
                                        `}
                                        onClick={() => selectable && onSelect && onSelect(image.id)}
                                    >
                                        <Image
                                            fill
                                            src={image.url}
                                            alt="Property"
                                            className="object-cover group-hover:scale-110 transition"
                                        />

                                        {/* Selection Overlay */}
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
                                                ${isSelected ? 'bg-black border-black' : 'bg-black/20 hover:bg-black/40'}
                                            `}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                            </div>
                                        )}

                                        {/* Delete Button (only if not selectable or if specific delete action needed) */}
                                        {!selectable && onDelete && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(image.id);
                                                }}
                                                className="
                                                    absolute 
                                                    top-2 
                                                    right-2 
                                                    bg-white 
                                                    p-1 
                                                    rounded-full 
                                                    opacity-0 
                                                    group-hover:opacity-100 
                                                    transition
                                                    hover:bg-primary
                                                    hover:text-white
                                                "
                                            >
                                                <Trash size={16} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </Draggable>
                        );
                    })}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    );
}

export default PhotoGrid;
