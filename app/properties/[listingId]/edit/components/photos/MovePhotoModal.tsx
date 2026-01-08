'use client';

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast"; // Keep toast import for toast.custom
import { useRouter } from "next/navigation";
import CustomToast from "@/components/ui/CustomToast";
import { X } from "lucide-react";
import { Room, PropertyImage } from "@prisma/client";

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

    const handleMove = (roomId: string | null) => {
        setIsLoading(true);

        // We need to move all selected photos. Ideally backend supports batch move.
        // For now, parallel requests.
        const promises = selectedPhotoIds.map(id =>
            axios.put(`/api/images/${id}`, { roomId })
        );

        Promise.all(promises)
            .then(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Photos déplacées"
                        type="success"
                    />
                ));
                onSuccess();
                onClose();
                router.refresh();
            })
            .catch(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Erreur lors du déplacement"
                        type="error"
                    />
                ));
            })
            .finally(() => setIsLoading(false));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white w-full max-w-md rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition">
                        <X size={20} />
                    </button>
                    <div className="font-semibold">Déplacer vers...</div>
                    <div className="w-9"></div>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex flex-col gap-2">
                    <button
                        onClick={() => handleMove(null)}
                        disabled={isLoading}
                        className="p-4 text-left hover:bg-neutral-100 rounded-lg transition font-medium"
                    >
                        Photos non classées
                    </button>

                    {rooms.map((room) => (
                        <button
                            key={room.id}
                            onClick={() => handleMove(room.id)}
                            disabled={isLoading}
                            className="p-4 text-left hover:bg-neutral-100 rounded-lg transition font-medium flex justify-between items-center"
                        >
                            <span>{room.name}</span>
                            <span className="text-neutral-500 text-sm">{room.images.length} photos</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default MovePhotoModal;
