'use client';

import { useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import CustomToast from "@/components/ui/CustomToast";
import { ImageOff, Check, Loader2 } from "lucide-react";
import { Room, PropertyImage } from "@prisma/client";
import Image from "next/image";
import { ROOMS_CONFIG } from "./AddRoomModal";

interface MovePhotoModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPhotoIds: string[];
    rooms: (Room & { images: PropertyImage[] })[];
    onSuccess: () => void;
}

const MovePhotoModal: React.FC<MovePhotoModalProps> = ({
    isOpen,
    onClose,
    selectedPhotoIds,
    rooms,
    onSuccess
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [movingTo, setMovingTo] = useState<string | null>(null);

    const handleMove = async (roomId: string | null) => {
        setIsLoading(true);
        setMovingTo(roomId);

        try {
            await Promise.all(
                selectedPhotoIds.map(id => axios.put(`/api/images/${id}`, { roomId }))
            );
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message={selectedPhotoIds.length > 1
                        ? `${selectedPhotoIds.length} photos déplacées`
                        : 'Photo déplacée'
                    }
                    type="success"
                />
            ));
            onSuccess();
            onClose();
            router.refresh();
        } catch {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors du déplacement"
                    type="error"
                />
            ));
        } finally {
            setIsLoading(false);
            setMovingTo(null);
        }
    };

    const getRoomIcon = (roomName: string) => {
        const nameLower = roomName.toLowerCase();
        const config = ROOMS_CONFIG.find(r => nameLower.startsWith(r.label.toLowerCase()));
        return config?.icon || ImageOff;
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center bg-black/50"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-neutral-900 w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] pb-safe"
                >
                    {/* Handle bar (mobile) */}
                    <div className="flex justify-center pt-3 pb-1 md:hidden">
                        <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                    </div>

                    {/* Header */}
                    <div className="px-6 pt-4 pb-3">
                        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                            Déplacer vers
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1">
                            {selectedPhotoIds.length} photo{selectedPhotoIds.length > 1 ? 's' : ''} sélectionnée{selectedPhotoIds.length > 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="mx-6 border-t border-neutral-100 dark:border-neutral-800" />

                    {/* Room list */}
                    <div className="flex-1 overflow-y-auto px-3 py-3">
                        {/* Unassigned option */}
                        <button
                            onClick={() => handleMove(null)}
                            disabled={isLoading}
                            className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                                <ImageOff size={20} strokeWidth={1.5} className="text-neutral-400" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-medium text-neutral-900 dark:text-white text-[15px]">Non classées</div>
                                <div className="text-xs text-neutral-400 mt-0.5">Retirer de la pièce actuelle</div>
                            </div>
                            {movingTo === null && isLoading ? (
                                <Loader2 size={18} className="animate-spin text-neutral-400 shrink-0" />
                            ) : (
                                <div className="w-5" />
                            )}
                        </button>

                        {/* Room options */}
                        {rooms.map((room) => {
                            const RoomIcon = getRoomIcon(room.name);
                            const coverImage = room.images[0]?.url;

                            return (
                                <button
                                    key={room.id}
                                    onClick={() => handleMove(room.id)}
                                    disabled={isLoading}
                                    className="w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 group"
                                >
                                    {/* Thumbnail or icon */}
                                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative bg-neutral-100 dark:bg-neutral-800">
                                        {coverImage ? (
                                            <Image
                                                fill
                                                src={coverImage}
                                                alt={room.name}
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                                                <RoomIcon size={20} strokeWidth={1.5} className="text-neutral-400" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 text-left min-w-0">
                                        <div className="font-medium text-neutral-900 dark:text-white text-[15px] truncate">{room.name}</div>
                                        <div className="text-xs text-neutral-400 mt-0.5">
                                            {room.images.length} photo{room.images.length > 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    {movingTo === room.id && isLoading ? (
                                        <Loader2 size={18} className="animate-spin text-neutral-400 shrink-0" />
                                    ) : (
                                        <div className="w-5" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Cancel button */}
                    <div className="px-6 pb-6 pt-2">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="w-full h-12 rounded-full border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        >
                            Annuler
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
        , document.body
    );
}

export default MovePhotoModal;
