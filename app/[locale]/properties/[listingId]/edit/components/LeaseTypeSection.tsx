'use client';

import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import { SafeListing, SafeUser } from "@/types";
import CustomToast from "@/components/ui/CustomToast";
import SoftSelect from "@/components/inputs/SoftSelect";
import EditSectionFooter from "./EditSectionFooter";

interface LeaseTypeSectionProps {
    listing: SafeListing;
    currentUser: SafeUser;
}

const LeaseTypeSection: React.FC<LeaseTypeSectionProps> = ({ listing, currentUser }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // --- Colocation Logic ---
    const propertyRentalUnits = (listing.rentalUnit as any)?.property?.rentalUnits || [];
    const hasActiveRooms = propertyRentalUnits.some((u: any) => u.type === 'PRIVATE_ROOM' && u.isActive);
    const [mode, setMode] = useState<string>(hasActiveRooms ? 'COLOCATION' : 'STANDARD');

    const handleModeChange = async (newMode: string) => {
        if (newMode === mode) return;
        setIsLoading(true);
        try {
            const response = await axios.post(`/api/listings/${listing.id}/mode`, { mode: newMode });

            if (response.data?.targetListingId && response.data.targetListingId !== listing.id) {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message={newMode === 'COLOCATION' ? 'Mode Colocation activé (Redirection...)' : 'Mode Logement Entier activé (Redirection...)'}
                        type="success"
                    />
                ));
                router.push(`/properties/${response.data.targetListingId}/edit`);
                return;
            }

            setMode(newMode);
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message={newMode === 'COLOCATION' ? 'Mode Colocation activé' : 'Mode Logement Entier activé'}
                    type="success"
                />
            ));
            router.refresh();
        } catch (error) {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors du changement de mode"
                    type="error"
                />
            ));
        } finally {
            setIsLoading(false);
        }
    };
    // ------------------------

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: {
            errors,
        }
    } = useForm<FieldValues>({
        defaultValues: {
            rentalUnitType: listing.rentalUnitType || 'ENTIRE_PLACE'
        }
    });

    // We don't really have a submit here because the mode change is immediate via the Select
    // But we might want to keep the footer for consistency if we add more fields later
    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        // No-op for now as logic is handled in onChange
        toast.custom((t) => (
            <CustomToast
                t={t}
                message="Changements enregistrés"
                type="success"
            />
        ));
    }

    return (
        <div className="flex flex-col gap-8 pb-28 md:pb-24">
            <div className="flex flex-col gap-2">
                <div className="text-sm font-medium text-neutral-800">
                    Mode de location
                </div>
                <div className="text-xs text-neutral-500 mb-2">
                    Choisissez si vous louez le logement entier ou si vous le proposez en colocation (gestion par chambre).
                </div>
                <SoftSelect
                    id="rentalUnitType"
                    label="Type de location"
                    value={mode}
                    onChange={(e) => handleModeChange(e.target.value)}
                    disabled={isLoading}
                    options={[
                        { value: "STANDARD", label: "Logement entier" },
                        { value: "COLOCATION", label: "Colocation (Activation chambres)" }
                    ]}
                />
            </div>

            <EditSectionFooter
                disabled={isLoading}
                label="Enregistrer"
                onClick={handleSubmit(onSubmit)}
            />
        </div>
    );
};

export default LeaseTypeSection;
