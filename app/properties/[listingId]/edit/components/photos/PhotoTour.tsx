'use client';

import { useState } from "react";
import { PropertyImage, Room } from "@prisma/client";
import { Plus, Image as ImageIcon } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import MultiImageUpload from "@/components/inputs/MultiImageUpload";
import RoomCard from "./RoomCard";
import AllPhotosModal from "./AllPhotosModal";
import AddRoomModal from "./AddRoomModal";

interface PhotoTourProps {
    listingId: string;
    rooms: (Room & { images: PropertyImage[] })[];
    unassignedImages: PropertyImage[];
    allImages: PropertyImage[];
    isAllPhotosOpen: boolean;
    setIsAllPhotosOpen: (value: boolean) => void;
    isAddRoomModalOpen: boolean;
    setIsAddRoomModalOpen: (value: boolean) => void;
    photoViewMode: 'global' | 'room';
    setPhotoViewMode: (mode: 'global' | 'room') => void;
}

const PhotoTour: React.FC<PhotoTourProps> = ({
    listingId,
    rooms,
    unassignedImages,
    allImages,
    isAllPhotosOpen,
    setIsAllPhotosOpen,
    isAddRoomModalOpen,
    setIsAddRoomModalOpen,
    photoViewMode,
    setPhotoViewMode
}) => {
    const router = useRouter();
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Room Deletion
    const handleDeleteRoom = (roomId: string) => {
        setIsLoading(true);
        axios.delete(`/api/rooms/${roomId}`)
            .then(() => {
                toast.success('Pièce supprimée');
                router.refresh();
            })
            .catch(() => toast.error('Erreur lors de la suppression'))
            .finally(() => setIsLoading(false));
    };

    // Image Upload (to unassigned)
    const handleUpload = (urls: string[]) => {
        setIsUploading(true);
        axios.post(`/api/listings/${listingId}/images`, {
            images: urls
        })
            .then(() => {
                toast.success('Photos ajoutées');
                router.refresh();
            })
            .catch(() => toast.error('Erreur lors de l\'ajout'))
            .finally(() => setIsUploading(false));
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Header / Actions */}
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="text-start">
                    <div className="text-xl md:text-2xl font-medium">
                        Gestion des photos
                    </div>
                    <div className="font-light text-neutral-500 mt-2 hidden md:block">
                        Organisez vos photos par pièce pour offrir une visite virtuelle.
                    </div>
                </div>
                <div className="hidden md:flex gap-2 md:gap-3 shrink-0 items-center">
                    <button
                        onClick={() => {
                            setPhotoViewMode('global');
                            setIsAllPhotosOpen(true);
                        }}
                        className="
                            px-6 
                            py-3 
                            bg-neutral-100 
                            hover:bg-neutral-200 
                            rounded-full 
                            font-semibold 
                            text-sm 
                            transition
                            cursor-pointer
                        "
                    >
                        Toutes les photos
                    </button>
                    <div className="w-12 h-12 relative">
                        {/* Plus button for quick add */}
                        <button
                            onClick={() => setIsAddRoomModalOpen(true)}
                            className="w-12 h-12 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                            title="Ajouter une pièce"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Rooms Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {/* Unassigned Card if any */}
                {unassignedImages.length > 0 && (
                    <div
                        className="flex flex-col gap-3 cursor-pointer group"
                        onClick={() => {
                            setPhotoViewMode('room');
                            setIsAllPhotosOpen(true);
                        }}
                    >
                        <div className="aspect-square relative rounded-2xl overflow-hidden bg-neutral-100 border-[1px] border-neutral-200">
                            {/* Collage of up to 4 images */}
                            <div className="grid grid-cols-2 gap-[1px] w-full h-full">
                                {unassignedImages.slice(0, 4).map((img, index) => (
                                    <div key={img.id} className={`relative w-full h-full overflow-hidden ${unassignedImages.length === 1 ? 'col-span-2 row-span-2' : ''}`}>
                                        <img src={img.url} className="object-cover w-full h-full" alt="" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="font-semibold text-base">Photos non classées</div>
                            <div className="text-neutral-500 text-sm">{unassignedImages.length} photo{unassignedImages.length > 1 ? 's' : ''}</div>
                        </div>
                    </div>
                )}

                {rooms.map((room) => (
                    <RoomCard
                        key={room.id}
                        room={room}
                        onClick={() => {
                            setPhotoViewMode('room');
                            setIsAllPhotosOpen(true);
                        }}
                        onDelete={() => handleDeleteRoom(room.id)}
                    />
                ))}
            </div>

            {/* Upload Area */}
            <div className="mt-4 border-t pt-6">
                <h4 className="font-medium mb-4">Ajouter des photos</h4>
                <MultiImageUpload
                    value={[]}
                    onChange={handleUpload}
                />
            </div>

            <AllPhotosModal
                isOpen={isAllPhotosOpen}
                onClose={() => setIsAllPhotosOpen(false)}
                listingId={listingId}
                rooms={rooms}
                unassignedImages={unassignedImages}
                viewMode={photoViewMode}
                initialGlobalImages={allImages}
            />

            <AddRoomModal
                isOpen={isAddRoomModalOpen}
                onClose={() => setIsAddRoomModalOpen(false)}
                listingId={listingId}
            />
        </div>
    );
}

export default PhotoTour;
