'use client';

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import SoftSelect from "@/components/inputs/SoftSelect"; // Using SoftSelect
import Heading from "@/components/Heading";
import Container from "@/components/Container";
import Counter from "@/components/inputs/Counter";

import { CompositionType, CoupleLegalStatus, TargetLeaseType } from "@prisma/client";

interface RentalProjectClientProps {
    existingScope?: {
        compositionType: CompositionType;
        membersIds: string[];
        coupleLegalStatus?: CoupleLegalStatus | null;
        targetLeaseType: TargetLeaseType;
        targetMoveInDate?: Date | null;
        childCount: number;
    } | null;
}

const RentalProjectClient: React.FC<RentalProjectClientProps> = ({ existingScope }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // State as strings for SoftSelect compatibility
    const [compositionType, setCompositionType] = useState<string>(existingScope?.compositionType || '');
    const [coupleLegalStatus, setCoupleLegalStatus] = useState<string>(existingScope?.coupleLegalStatus || '');
    const [targetLeaseType, setTargetLeaseType] = useState<string>(existingScope?.targetLeaseType || '');
    const [targetMoveInDate, setTargetMoveInDate] = useState<string>(
        existingScope?.targetMoveInDate ? new Date(existingScope.targetMoveInDate).toISOString().split('T')[0] : ''
    );
    const [childCount, setChildCount] = useState(existingScope?.childCount || 0);

    const onSubmit = () => {
        setIsLoading(true);

        axios.post('/api/account/project', {
            compositionType,
            coupleLegalStatus: compositionType === 'COUPLE' ? coupleLegalStatus : null,
            targetLeaseType,
            targetMoveInDate,
            childCount
        })
            .then(() => {
                toast.success('Projet mis à jour !');
                router.refresh();
            })
            .catch(() => {
                toast.error('Une erreur est survenue.');
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    const compositionOptions = [
        { value: 'SOLO', label: 'Seul(e)' },
        { value: 'COUPLE', label: 'En couple' },
        { value: 'GROUP', label: 'En colocation' }
    ];

    const statusOptions = [
        { value: 'NONE', label: 'Célibataire / Autre' },
        { value: 'MARRIED', label: 'Marié(e)' },
        { value: 'PACS', label: 'Pacsé(e)' },
        { value: 'CONCUBINAGE', label: 'Concubinage' }
    ];

    const leaseOptions = [
        { value: 'ANY', label: 'Pas de préférences' },
        { value: 'FURNISHED', label: 'Meublé' },
        { value: 'EMPTY', label: 'Vide' },
        { value: 'MOBILITY', label: 'Mobilité' }
    ];

    return (
        <Container>
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col gap-8">
                    <Heading
                        title="Mon projet de location"
                        subtitle="Dites-nous en plus sur votre recherche"
                    />

                    <div className="flex flex-col gap-4">
                        <SoftSelect
                            id="compositionType"
                            label="Avec qui souhaitez-vous emménager ?"
                            options={compositionOptions}
                            value={compositionType}
                            onChange={(e) => setCompositionType(e.target.value)}
                            disabled={isLoading}
                        />

                        {compositionType === 'COUPLE' && (
                            <SoftSelect
                                id="coupleLegalStatus"
                                label="Votre statut marital"
                                options={statusOptions}
                                value={coupleLegalStatus}
                                onChange={(e) => setCoupleLegalStatus(e.target.value)}
                                disabled={isLoading}
                            />
                        )}

                        <SoftSelect
                            id="targetLeaseType"
                            label="Type de bail recherché"
                            options={leaseOptions}
                            value={targetLeaseType}
                            onChange={(e) => setTargetLeaseType(e.target.value)}
                            disabled={isLoading}
                        />

                        <div className="w-full relative">
                            <input
                                type="date"
                                disabled={isLoading}
                                value={targetMoveInDate}
                                onChange={(e) => setTargetMoveInDate(e.target.value)}
                                className="
                                    peer
                                    w-full
                                    p-4
                                    pt-6
                                    font-light
                                    bg-white
                                    border
                                    border-neutral-300
                                    rounded-xl
                                    outline-none
                                    focus:border-black
                                    transition
                                    disabled:opacity-70
                                    disabled:cursor-not-allowed
                                "
                            />
                            <label className="
                                absolute
                                text-sm
                                duration-150
                                transform
                                -translate-y-3
                                top-5
                                z-10
                                origin-left
                                left-4
                                peer-placeholder-shown:scale-100
                                peer-placeholder-shown:translate-y-0
                                peer-focus:scale-75
                                peer-focus:-translate-y-4
                                text-zinc-400
                            ">
                                Date d'emménagement souhaitée
                            </label>
                        </div>

                        <hr />

                        <Counter
                            title="Enfants"
                            subtitle="Combien d'enfants avez-vous ?"
                            value={childCount}
                            onChange={(value) => setChildCount(value)}
                            min={0}
                        />
                    </div>

                    <div className="mt-4">
                        <div
                            onClick={onSubmit}
                            className="
                                p-3 
                                bg-rose-500 
                                text-white 
                                rounded-lg 
                                text-center 
                                cursor-pointer 
                                hover:bg-rose-600 
                                transition 
                                font-bold
                            "
                        >
                            {isLoading ? 'Enregistrement...' : 'Enregistrer mon projet'}
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default RentalProjectClient;
