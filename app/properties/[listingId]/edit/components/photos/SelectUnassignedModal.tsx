'use client';

import { useState, useEffect } from "react";
import { PropertyImage } from "@prisma/client";
import { X } from "lucide-react";
import { DragDropContext } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/Button";
import PhotoGrid from "./PhotoGrid";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface SelectUnassignedModalProps {
    isOpen: boolean;
    onClose: () => void;
    unassignedImages: PropertyImage[];
    targetRoomId: string;
    targetRoomName: string;
    onSuccess: () => void;
}

const SelectUnassignedModal: React.FC<SelectUnassignedModalProps> = ({
    isOpen,
    onClose,
    unassignedImages,
    targetRoomId,
    targetRoomName,
    onSuccess
}) => {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Reset selection when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedIds([]);
        }
    }, [isOpen]);

    const handleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(item => item !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleSubmit = async () => {
        if (selectedIds.length === 0) return;

        setIsLoading(true);
        const promises = selectedIds.map(id =>
            axios.patch(`/api/images/${id}`, { roomId: targetRoomId })
        );

        try {
            await Promise.all(promises);
            toast.success("Photos ajoutées à la pièce");
            onSuccess();
            onClose();
            router.refresh();
        } catch (error) {
            toast.error("Erreur lors de l'ajout");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-lg overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition">
                        <X size={20} />
                    </button>
                    <div className="font-semibold text-lg">
                        Ajouter à {targetRoomName}
                    </div>
                    <div className="w-9"></div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {unassignedImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                            <p>Aucune photo non classée disponible.</p>
                        </div>
                    ) : (
                        <DragDropContext onDragEnd={() => { }}>
                            <PhotoGrid
                                id="select-unassigned"
                                images={unassignedImages}
                                selectable
                                selectedIds={selectedIds}
                                onSelect={handleSelect}
                            />
                        </DragDropContext>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex justify-between items-center">
                    <div className="text-sm text-neutral-500">
                        {selectedIds.length} photo{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
                    </div>
                    <div className="flex gap-3">
                        <Button
                            label="Annuler"
                            onClick={onClose}
                            variant="outline"
                            disabled={isLoading}
                            small
                        />
                        <Button
                            label={`Ajouter ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`}
                            onClick={handleSubmit}
                            disabled={isLoading || selectedIds.length === 0}
                            small
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SelectUnassignedModal;
