'use client';

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import CustomToast from "@/components/ui/CustomToast";
import { PropertyImage } from "@prisma/client";
import {
    Sofa,
    Utensils,
    BedDouble,
    Bath,
    Sun,
    DoorOpen,
    Briefcase,
    Plus,
    Fence,
    WashingMachine,
    CarFront,
    Flower2,
    CloudSun,
    Waves,
    Gamepad2,
    PartyPopper,
    Coffee,
    Toilet,
    Shrub,
    LampDesk,
    PackageOpen,
    RockingChair,
    Armchair,
    ArrowLeft,
    Check
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import SoftInput from "@/components/inputs/SoftInput";
import Modal from "@/components/modals/Modal";
import MultiImageUpload from "@/components/inputs/MultiImageUpload";

interface AddRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    listingId: string;
    unassignedImages?: PropertyImage[];
}

const ROOMS_CONFIG = [
    { label: "Salon", icon: Sofa },
    { label: "Cuisine", icon: Utensils },
    { label: "Chambre", icon: BedDouble },
    { label: "Salle de bain", icon: Bath },
    { label: "Toilettes", icon: Toilet },
    { label: "Extérieur", icon: Shrub },
    { label: "Entrée", icon: DoorOpen },
    { label: "Bureau", icon: LampDesk },
    { label: "Balcon", icon: RockingChair },
    { label: "Terrasse", icon: Coffee },
    { label: "Jardin", icon: Flower2 },
    { label: "Patio", icon: Armchair },
    { label: "Cour", icon: Fence },
    { label: "Veranda", icon: CloudSun },
    { label: "Garage", icon: CarFront },
    { label: "Cave", icon: PackageOpen },
    { label: "Buanderie", icon: WashingMachine },
    { label: "Piscine", icon: Waves },
    { label: "Salle de jeux", icon: Gamepad2 },
    { label: "Salle de réception", icon: PartyPopper },
];


enum STEPS {
    ROOM_SELECTION = 0,
    PHOTO_SELECTION = 1,
}

const AddRoomModal: React.FC<AddRoomModalProps> = ({
    isOpen,
    onClose,
    listingId,
    unassignedImages = []
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(STEPS.ROOM_SELECTION);

    // Step 0 State
    const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
    const [customName, setCustomName] = useState("");

    // Step 1 State
    const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
    const [newImageUrls, setNewImageUrls] = useState<string[]>([]);

    const handleCreate = () => {
        const finalName = selectedLabel || customName;
        if (!finalName) return;

        setIsLoading(true);
        axios.post('/api/rooms', {
            listingId,
            name: finalName,
            imageIds: selectedImageIds,
            newImageUrls: newImageUrls
        })
            .then(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Pièce créée avec succès"
                        type="success"
                    />
                ));
                // Reset state
                setStep(STEPS.ROOM_SELECTION);
                setSelectedLabel(null);
                setCustomName('');
                setSelectedImageIds([]);
                setNewImageUrls([]);

                router.refresh();
                onClose();
            })
            .catch(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Erreur lors de la création"
                        type="error"
                    />
                ));
            })
            .finally(() => setIsLoading(false));
    };

    const onBack = () => {
        setStep((value) => value - 1);
    };

    const onNext = () => {
        setStep((value) => value + 1);
    };

    const toggleImageSelection = (id: string) => {
        setSelectedImageIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    let bodyContent = (
        <div className="flex flex-col gap-8">
            {/* Grid of presets */}
            <div>
                <h3 className="text-2xl md:text-2xl font-medium text-neutral-900 mb-6">
                    Quel type d'espace souhaitez-vous ajouter ?
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ROOMS_CONFIG.map((item) => (
                        <div
                            key={item.label}
                            onClick={() => {
                                setSelectedLabel(item.label);
                                setCustomName("");
                            }}
                            className={`
                                group
                                relative
                                flex flex-col items-center justify-center
                                gap-3
                                p-4
                                h-32
                                rounded-3xl
                                border
                                cursor-pointer
                                transition-all
                                active:scale-95
                                ${selectedLabel === item.label
                                    ? 'border-black bg-neutral-50 ring-1 ring-black'
                                    : 'border-neutral-200 hover:border-black hover:bg-neutral-50'
                                }
                            `}
                        >
                            <item.icon
                                size={28}
                                strokeWidth={1.5}
                                className={`
                                    transition-colors
                                    ${selectedLabel === item.label ? 'text-black' : 'text-neutral-500 group-hover:text-black'}
                                `}
                            />
                            <span className={`
                                font-semibold text-base
                                ${selectedLabel === item.label ? 'text-black' : 'text-neutral-600 group-hover:text-black'}
                            `}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-neutral-500 font-medium">
                        Ou personnalisé
                    </span>
                </div>
            </div>

            {/* Custom Input */}
            <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
                <div className="flex-1">
                    <SoftInput
                        id="customName"
                        label="Nom de la pièce"
                        value={customName}
                        onChange={(e) => {
                            setCustomName(e.target.value);
                            setSelectedLabel(null);
                        }}
                        disabled={isLoading}
                    />
                </div>
            </div>
        </div>
    );

    if (step === STEPS.PHOTO_SELECTION) {
        bodyContent = (
            <div className="flex flex-col gap-6">
                <div>
                    <h3 className="text-xl md:text-2xl font-medium text-neutral-900 mb-2">
                        Photos : {selectedLabel || customName}
                    </h3>
                    <p className="text-neutral-500 text-sm">
                        Sélectionnez des photos existantes ou importez-en de nouvelles.
                    </p>
                </div>

                {/* Unassigned Images Selection */}
                {unassignedImages.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h4 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Disponibles</h4>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                            {unassignedImages.map((img) => {
                                const isSelected = selectedImageIds.includes(img.id);
                                return (
                                    <div
                                        key={img.id}
                                        className="relative aspect-square cursor-pointer group"
                                        onClick={() => toggleImageSelection(img.id)}
                                    >
                                        <div className={`
                                            absolute inset-0 rounded-xl overflow-hidden border-2 transition-all duration-200
                                            ${isSelected ? 'border-black ring-2 ring-black ring-offset-1' : 'border-transparent group-hover:border-neutral-200'}
                                        `}>
                                            <img
                                                src={img.url}
                                                alt="Room"
                                                className={`
                                                    w-full h-full object-cover transition-all duration-300
                                                    ${isSelected ? 'scale-105' : 'group-hover:scale-105'}
                                                `}
                                            />
                                            {/* Overlay for selection */}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-black/10" />
                                            )}
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-black text-white rounded-full p-1 shadow-md z-10 transform transition-transform scale-100">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* New Image Upload */}
                <div className="flex flex-col gap-3">
                    {unassignedImages.length > 0 && (
                        <h4 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Importer</h4>
                    )}
                    <MultiImageUpload
                        value={newImageUrls}
                        onChange={(value) => setNewImageUrls(value)}
                    />
                </div>
            </div>
        );
    }

    const footerContent = (
        <div className="flex flex-row items-center gap-4 w-full">
            {step !== STEPS.ROOM_SELECTION && (
                <Button
                    label="Retour"
                    onClick={onBack}
                    variant="outline"
                    disabled={isLoading}
                    className="w-full"
                />
            )}

            {step === STEPS.ROOM_SELECTION ? (
                <Button
                    label="Continuer"
                    onClick={onNext}
                    disabled={(!selectedLabel && !customName)}
                    className="w-full"
                />
            ) : (
                <Button
                    label="Terminer"
                    onClick={handleCreate}
                    disabled={isLoading}
                    className="w-full"
                />
            )}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={() => { }}
            title={step === STEPS.ROOM_SELECTION ? "Nouvelle pièce" : undefined}
            body={bodyContent}
            footer={footerContent}
            disabled={isLoading}
        />
    );
}

export default AddRoomModal;
