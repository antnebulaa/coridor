'use client';

import { useState } from "react";
import { PropertyImage, Room } from "@prisma/client";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

import PillButton from "@/components/ui/PillButton";
import CircleButton from "@/components/ui/CircleButton";
import RoomCard from "./RoomCard";
import AllPhotosModal from "./AllPhotosModal";
import AddRoomModal from "./AddRoomModal";
import EmptyStateRooms from "./EmptyStateRooms";
import CustomToast from "@/components/ui/CustomToast";

interface PhotoTourProps {
    listingId: string;
    rooms: (Room & { images: PropertyImage[] })[];
    unassignedImages: PropertyImage[];
    allImages: PropertyImage[];
    isAllPhotosOpen: boolean;
    setIsAllPhotosOpen: (value: boolean) => void;
    isAddRoomModalOpen: boolean;
    setIsAddRoomModalOpen: (value: boolean) => void;

    // Lifted props
    activeView: 'global' | 'unassigned' | 'room';
    setActiveView: (view: 'global' | 'unassigned' | 'room') => void;
    activeRoomId: string | null;
    setActiveRoomId: (id: string | null) => void;
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
    activeView,
    setActiveView,
    activeRoomId,
    setActiveRoomId
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Toggle selection of a room
    const toggleSelect = (roomId: string) => {
        setSelectedRoomIds(prev =>
            prev.includes(roomId)
                ? prev.filter(id => id !== roomId)
                : [...prev, roomId]
        );
    };

    // Exit selection mode
    const exitSelecting = () => {
        setIsSelecting(false);
        setSelectedRoomIds([]);
        setConfirmDelete(false);
    };

    // Delete selected rooms
    const handleDeleteSelected = async () => {
        if (selectedRoomIds.length === 0) return;
        setIsLoading(true);
        try {
            await Promise.all(
                selectedRoomIds.map(id => axios.delete(`/api/rooms/${id}`))
            );
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message={selectedRoomIds.length > 1 ? `${selectedRoomIds.length} pièces supprimées` : 'Pièce supprimée'}
                    type="success"
                />
            ));
            router.refresh();
            exitSelecting();
        } catch {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors de la suppression"
                    type="error"
                />
            ));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-20">
            {/* Header / Actions */}
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="text-start">
                    <h3 className="text-xl font-semibold">
                        Gestion des photos
                    </h3>
                    <div className="font-light text-neutral-500 mt-2 hidden md:block">
                        Organisez vos photos par pièce pour offrir une visite virtuelle.
                    </div>
                </div>
                <div className="hidden md:flex gap-2 md:gap-3 shrink-0 items-center">
                    <PillButton
                        label="Toutes les photos"
                        onClick={() => {
                            setActiveView('global');
                            setActiveRoomId(null);
                            setIsAllPhotosOpen(true);
                        }}
                    />

                    {/* Plus button for quick add */}
                    <div className="relative">
                        <CircleButton
                            icon={Plus}
                            onClick={() => setIsAddRoomModalOpen(true)}
                            title="Ajouter une pièce"
                        />
                    </div>
                </div>
            </div>

            {/* Rooms Grid or Empty State */}
            {rooms.length === 0 ? (
                <EmptyStateRooms onCreateClick={() => setIsAddRoomModalOpen(true)} />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Unassigned Card if any */}
                    {unassignedImages.length > 0 && (
                        <div
                            className="flex flex-col gap-3 cursor-pointer group"
                            onClick={() => {
                                if (isSelecting) return;
                                setActiveView('unassigned');
                                setActiveRoomId(null);
                                setIsAllPhotosOpen(true);
                            }}
                        >
                            <div className="aspect-square relative rounded-3xl overflow-hidden bg-neutral-100 border-[1px] border-neutral-200">
                                {/* Collage of up to 4 images */}
                                <div className="grid grid-cols-2 gap-[3px] w-full h-full">
                                    {unassignedImages.slice(0, 4).map((img) => (
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
                                setActiveView('room');
                                setActiveRoomId(room.id);
                                setIsAllPhotosOpen(true);
                            }}
                            isSelecting={isSelecting}
                            isSelected={selectedRoomIds.includes(room.id)}
                            onSelect={() => toggleSelect(room.id)}
                        />
                    ))}
                </div>
            )}

            {/* Floating action button */}
            {rooms.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <AnimatePresence mode="popLayout">
                        {isSelecting ? (
                            <motion.div
                                key="selection-bar"
                                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="flex gap-3"
                            >
                                {/* Cancel */}
                                <motion.button
                                    onClick={exitSelecting}
                                    whileTap={{ scale: 0.93 }}
                                    className="h-12 px-5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-lg flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                >
                                    <X size={16} />
                                    Annuler
                                </motion.button>

                                {/* Delete / count */}
                                <motion.button
                                    onClick={() => {
                                        if (selectedRoomIds.length > 0) setConfirmDelete(true);
                                    }}
                                    disabled={selectedRoomIds.length === 0}
                                    whileTap={selectedRoomIds.length > 0 ? { scale: 0.93 } : undefined}
                                    animate={selectedRoomIds.length > 0
                                        ? { backgroundColor: 'rgb(239 68 68)', color: '#fff' }
                                        : { backgroundColor: 'rgb(245 245 245)', color: 'rgb(163 163 163)' }
                                    }
                                    transition={{ duration: 0.15 }}
                                    className="h-12 px-6 rounded-full shadow-lg flex items-center gap-3 text-sm font-medium whitespace-nowrap"
                                >
                                    <Trash2 size={18} />
                                    {selectedRoomIds.length > 0
                                        ? <>
                                            Supprimer
                                            <motion.span
                                                key={selectedRoomIds.length}
                                                initial={{ scale: 0.6 }}
                                                animate={{ scale: 1 }}
                                                transition={{ duration: 0.1 }}
                                                className="bg-white text-neutral-900 font-medium text-sm min-w-[28px] h-7 rounded-full flex items-center justify-center px-2"
                                            >
                                                {selectedRoomIds.length}
                                            </motion.span>
                                        </>
                                        : 'Sélectionnez'
                                    }
                                </motion.button>
                            </motion.div>
                        ) : (
                            <motion.button
                                key="edit-btn"
                                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                whileTap={{ scale: 0.93 }}
                                onClick={() => setIsSelecting(true)}
                                className="h-12 px-6 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-lg flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                            >
                                <Pencil size={16} />
                                Modifier
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <AllPhotosModal
                isOpen={isAllPhotosOpen}
                onClose={() => setIsAllPhotosOpen(false)}
                listingId={listingId}
                rooms={rooms}
                unassignedImages={unassignedImages}
                initialGlobalImages={allImages}

                // New props for focused view
                activeView={activeView}
                activeRoomId={activeRoomId}
            />

            <AddRoomModal
                isOpen={isAddRoomModalOpen}
                onClose={() => setIsAddRoomModalOpen(false)}
                listingId={listingId}
                unassignedImages={unassignedImages}
            />

            {/* Delete confirmation overlay */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-6">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <h3 className="text-lg font-semibold mb-2">
                            Supprimer {selectedRoomIds.length > 1 ? `${selectedRoomIds.length} pièces` : 'cette pièce'} ?
                        </h3>
                        <p className="text-sm text-neutral-500 mb-6">Toutes les photos associées seront également supprimées.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
                            >
                                {isLoading ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PhotoTour;
