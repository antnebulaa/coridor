'use client';

import { useState, useEffect } from "react";
import { Room, PropertyImage } from "@prisma/client";
import { DragDropContext } from "@hello-pangea/dnd";
import { X, Plus, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import PhotoGrid from "./PhotoGrid";
import MovePhotoModal from "./MovePhotoModal";
import AddRoomModal from "./AddRoomModal";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface AllPhotosModalProps {
    isOpen: boolean;
    onClose: () => void;
    listingId: string;
    rooms: (Room & { images: PropertyImage[] })[];
    unassignedImages: PropertyImage[];
    viewMode?: 'global' | 'room';
    initialGlobalImages?: PropertyImage[];
}

const AllPhotosModal: React.FC<AllPhotosModalProps> = ({
    isOpen,
    onClose,
    listingId,
    rooms,
    unassignedImages,
    viewMode = 'room',
    initialGlobalImages = []
}) => {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
    const [optimisticUnassigned, setOptimisticUnassigned] = useState(unassignedImages);
    const [optimisticRooms, setOptimisticRooms] = useState(rooms);
    const [optimisticGlobalImages, setOptimisticGlobalImages] = useState(initialGlobalImages);

    useEffect(() => {
        setOptimisticUnassigned(unassignedImages);
    }, [unassignedImages]);

    useEffect(() => {
        setOptimisticRooms(rooms);
    }, [rooms]);

    useEffect(() => {
        setOptimisticGlobalImages(initialGlobalImages);
    }, [initialGlobalImages]);

    if (!isOpen) return null;

    const handleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(item => item !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleClearSelection = () => {
        setSelectedIds([]);
    };

    const handleDeleteSelected = async () => {
        // Batch delete logic
        const promises = selectedIds.map(id => axios.delete(`/api/images/${id}`));
        try {
            await Promise.all(promises);
            toast.success("Photos supprimées");
            setSelectedIds([]);
            router.refresh();
        } catch (error) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;

        const sourceId = result.source.droppableId;
        const destinationId = result.destination.droppableId;

        if (sourceId !== destinationId) {
            // Moving between rooms not implemented yet via drag and drop
            return;
        }

        // Find the list
        let items: PropertyImage[] = [];
        let isUnassigned = false;
        let roomIndex = -1;
        let isGlobal = false;

        if (viewMode === 'global') {
            items = [...optimisticGlobalImages];
            isGlobal = true;
        } else if (sourceId === 'unassigned') {
            items = [...optimisticUnassigned];
            isUnassigned = true;
        } else {
            roomIndex = optimisticRooms.findIndex(r => r.id === sourceId);
            if (roomIndex !== -1) {
                items = [...optimisticRooms[roomIndex].images];
            }
        }

        // Reorder
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Optimistic update
        if (isGlobal) {
            setOptimisticGlobalImages(items);
        } else if (isUnassigned) {
            setOptimisticUnassigned(items);
        } else if (roomIndex !== -1) {
            const newRooms = [...optimisticRooms];
            newRooms[roomIndex] = {
                ...newRooms[roomIndex],
                images: items
            };
            setOptimisticRooms(newRooms);
        }

        // Calculate new orders
        const updates = items.map((item, index) => ({
            id: item.id,
            order: index
        }));

        axios.put('/api/images/reorder', { updates })
            .then(() => {
                router.refresh();
            })
            .catch(() => {
                toast.error('Erreur lors du réagencement');
                // Revert on error could be implemented here
            });
    };

    return (
        <div className="fixed inset-0 z-40 bg-white flex flex-col">
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition">
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-lg font-semibold">Toutes les photos</h2>
                </div>

                {selectedIds.length > 0 ? (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{selectedIds.length} sélectionnée(s)</span>
                        <Button
                            label="Déplacer"
                            onClick={() => setIsMoveModalOpen(true)}
                            small
                            variant="outline"
                        />
                        <Button
                            label="Supprimer"
                            onClick={handleDeleteSelected}
                            small
                            variant="outline"
                            className="text-primary border-primary hover:bg-primary/10"
                        />
                        <button onClick={handleClearSelection} className="text-sm underline font-medium ml-2">
                            Annuler
                        </button>
                    </div>
                ) : (
                    <Button
                        label="Ajouter une pièce"
                        onClick={() => setIsAddRoomModalOpen(true)}
                        small
                        icon={Plus}
                        variant="outline"
                        className="w-fit border-none shadow-none hover:bg-neutral-100"
                    />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-5xl mx-auto flex flex-col gap-10">
                    <DragDropContext onDragEnd={onDragEnd}>
                        {viewMode === 'global' ? (
                            <section>
                                <h3 className="text-xl font-semibold mb-4">Toutes les photos</h3>
                                <p className="text-neutral-500 text-sm mb-4">
                                    Réorganisez les photos pour définir l'ordre d'affichage sur votre annonce. La première photo sera la photo de couverture.
                                </p>
                                <PhotoGrid
                                    id="global"
                                    images={optimisticGlobalImages}
                                    selectable
                                    selectedIds={selectedIds}
                                    onSelect={handleSelect}
                                />
                            </section>
                        ) : (
                            <>
                                {/* Unassigned */}
                                {optimisticUnassigned.length > 0 && (
                                    <section>
                                        <h3 className="text-xl font-semibold mb-4">Photos non classées</h3>
                                        <PhotoGrid
                                            id="unassigned"
                                            images={optimisticUnassigned}
                                            selectable
                                            selectedIds={selectedIds}
                                            onSelect={handleSelect}
                                        />
                                    </section>
                                )}

                                {/* Rooms */}
                                {optimisticRooms.map((room) => (
                                    <section key={room.id}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-semibold">{room.name}</h3>
                                        </div>
                                        {room.images.length > 0 ? (
                                            <PhotoGrid
                                                id={room.id}
                                                images={room.images}
                                                selectable
                                                selectedIds={selectedIds}
                                                onSelect={handleSelect}
                                            />
                                        ) : (
                                            <div className="text-neutral-400 italic text-sm border-2 border-dashed rounded-xl p-8 text-center">
                                                Aucune photo dans cette pièce
                                            </div>
                                        )}
                                    </section>
                                ))}
                            </>
                        )}
                    </DragDropContext>
                </div>
            </div>

            {/* Modals */}
            <MovePhotoModal
                isOpen={isMoveModalOpen}
                onClose={() => setIsMoveModalOpen(false)}
                selectedPhotoIds={selectedIds}
                rooms={rooms}
                onSuccess={handleClearSelection}
            />

            <AddRoomModal
                isOpen={isAddRoomModalOpen}
                onClose={() => setIsAddRoomModalOpen(false)}
                listingId={listingId}
            />
        </div>
    );
}

export default AllPhotosModal;
