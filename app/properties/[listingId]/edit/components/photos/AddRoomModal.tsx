'use client';

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import SoftInput from "@/components/inputs/SoftInput";

interface AddRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    listingId: string;
}

const SUGGESTED_ROOMS = [
    "Salon",
    "Cuisine",
    "Chambre",
    "Salle de bain",
    "Extérieur",
    "Entrée",
    "Bureau"
];

const AddRoomModal: React.FC<AddRoomModalProps> = ({
    isOpen,
    onClose,
    listingId
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [customName, setCustomName] = useState("");

    const handleCreate = (name: string) => {
        setIsLoading(true);
        axios.post('/api/rooms', {
            listingId,
            name
        })
            .then(() => {
                toast.success('Pièce créée');
                onClose();
                router.refresh();
            })
            .catch(() => toast.error('Erreur lors de la création'))
            .finally(() => setIsLoading(false));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition">
                        <X size={20} />
                    </button>
                    <div className="font-semibold">Ajouter une pièce</div>
                    <div className="w-9"></div> {/* Spacer for centering */}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <h3 className="text-lg font-medium mb-4">Choisissez une pièce ou un espace</h3>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {SUGGESTED_ROOMS.map((room) => (
                            <button
                                key={room}
                                onClick={() => handleCreate(room)}
                                disabled={isLoading}
                                className="
                                    p-4 
                                    border 
                                    rounded-xl 
                                    text-left 
                                    hover:border-black 
                                    transition
                                    font-medium
                                "
                            >
                                {room}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-2 text-gray-500">Ou créez-en une</span>
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <div className="w-full">
                            <SoftInput
                                id="customName"
                                label="Nom de la pièce"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <div className="mt-auto pb-1">
                            <Button
                                label="Créer"
                                onClick={() => handleCreate(customName)}
                                disabled={isLoading || !customName}
                                small
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AddRoomModal;
