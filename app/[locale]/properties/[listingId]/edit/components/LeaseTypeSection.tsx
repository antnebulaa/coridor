'use client';

import { useState } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import { DoorOpen, Armchair, Users, GraduationCap, Briefcase } from "lucide-react";
import { LeaseType } from "@prisma/client";
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

    // --- Lease type state ---
    const [leaseType, setLeaseType] = useState<LeaseType>(listing.leaseType || LeaseType.LONG_TERM);
    const [isFurnished, setIsFurnished] = useState<boolean>(listing.isFurnished || false);
    const [acceptsStudentLease, setAcceptsStudentLease] = useState<boolean>((listing as any).acceptsStudentLease || false);
    const [acceptsMobilityLease, setAcceptsMobilityLease] = useState<boolean>((listing as any).acceptsMobilityLease || false);

    // Derive which card is selected
    const getSelectedCard = (): 'bare' | 'furnished' | 'colocation' => {
        if (leaseType === LeaseType.COLOCATION || mode === 'COLOCATION') return 'colocation';
        if (isFurnished) return 'furnished';
        return 'bare';
    };
    const selectedCard = getSelectedCard();

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

    const handleCardSelect = async (card: 'bare' | 'furnished' | 'colocation') => {
        if (isLoading) return;

        if (card === 'colocation') {
            // Switch to colocation mode (handles rental units)
            setLeaseType(LeaseType.COLOCATION);
            setIsFurnished(true);
            if (mode !== 'COLOCATION') {
                await handleModeChange('COLOCATION');
            }
            return;
        }

        // If currently in colocation, switch back to standard first
        if (mode === 'COLOCATION') {
            await handleModeChange('STANDARD');
        }

        const newLeaseType = LeaseType.LONG_TERM;
        const newFurnished = card === 'furnished';

        setLeaseType(newLeaseType);
        setIsFurnished(newFurnished);

        // Reset special lease options when switching to unfurnished
        if (!newFurnished) {
            setAcceptsStudentLease(false);
            setAcceptsMobilityLease(false);
        }
    };

    const handleSave = async () => {
        if (selectedCard === 'colocation') return; // Colocation is saved via mode change

        setIsLoading(true);
        try {
            await axios.put(`/api/listings/${listing.id}`, {
                leaseType,
                isFurnished,
                acceptsStudentLease: isFurnished ? acceptsStudentLease : false,
                acceptsMobilityLease: isFurnished ? acceptsMobilityLease : false,
            });
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Type de bail mis à jour"
                    type="success"
                />
            ));
            router.refresh();
        } catch {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors de la mise à jour"
                    type="error"
                />
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const cards = [
        {
            id: 'bare' as const,
            icon: DoorOpen,
            title: 'Location nue',
            desc: 'Bail classique de 3 ans. Le locataire apporte ses meubles.',
            tags: ['Bail 3 ans', 'Préavis 3 mois'],
        },
        {
            id: 'furnished' as const,
            icon: Armchair,
            title: 'Location meublée',
            desc: 'Bail d\'1 an (9 mois étudiant). Logement équipé selon le décret.',
            tags: ['Bail 1 an', 'Loyer plus élevé'],
        },
        {
            id: 'colocation' as const,
            icon: Users,
            title: 'Colocation',
            desc: 'Gestion par chambre avec baux individuels ou bail commun.',
            tags: ['Multi-locataires', 'Gestion par chambre'],
        },
    ];

    return (
        <div className="flex flex-col gap-8 pb-28 md:pb-24">
            {/* Lease type cards */}
            <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold">Type de bail</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-light text-sm">
                    Choisissez le type de location pour ce bien.
                </p>

                <div className="flex flex-col gap-3 mt-2">
                    {cards.map((card) => {
                        const isSelected = selectedCard === card.id;
                        return (
                            <div
                                key={card.id}
                                onClick={() => handleCardSelect(card.id)}
                                className={`
                                    p-4 rounded-3xl border-2 flex items-start gap-4 cursor-pointer transition
                                    hover:border-neutral-400 dark:hover:border-neutral-500
                                    active:scale-[0.98]
                                    ${isSelected
                                        ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-800'
                                        : 'border-neutral-200 dark:border-neutral-700'
                                    }
                                    ${isLoading ? 'opacity-60 pointer-events-none' : ''}
                                `}
                            >
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                                    ${isSelected
                                        ? 'bg-black dark:bg-white text-white dark:text-black'
                                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                                    }
                                `}>
                                    <card.icon size={20} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="font-semibold text-[15px]">{card.title}</span>
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400 leading-snug">
                                        {card.desc}
                                    </span>
                                    <div className="flex gap-2 mt-1">
                                        {card.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Special lease toggles — only for furnished/colocation */}
            {(selectedCard === 'furnished' || selectedCard === 'colocation') && (
                <div className="flex flex-col gap-3">
                    <h3 className="text-lg font-semibold">Baux spéciaux acceptés</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 font-light text-sm">
                        Autorisez les locataires à demander ces types de bail lors de leur candidature.
                    </p>

                    <div className="flex flex-col gap-3 mt-1">
                        {/* Student lease toggle */}
                        <button
                            type="button"
                            onClick={() => setAcceptsStudentLease(!acceptsStudentLease)}
                            className={`
                                p-4 rounded-2xl border flex items-center gap-4 text-left transition
                                ${acceptsStudentLease
                                    ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-800'
                                    : 'border-neutral-200 dark:border-neutral-700'
                                }
                            `}
                        >
                            <div className={`
                                w-9 h-9 rounded-full flex items-center justify-center shrink-0
                                ${acceptsStudentLease
                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                                }
                            `}>
                                <GraduationCap size={18} />
                            </div>
                            <div className="flex-1">
                                <span className="font-medium text-sm">Bail étudiant</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400 block mt-0.5">
                                    Durée de 9 mois, non renouvelable. Réservé aux étudiants.
                                </span>
                            </div>
                            <div className={`
                                w-10 h-6 rounded-full transition-colors relative shrink-0
                                ${acceptsStudentLease ? 'bg-black dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}
                            `}>
                                <div className={`
                                    w-5 h-5 rounded-full bg-white dark:bg-neutral-900 absolute top-0.5 transition-transform
                                    ${acceptsStudentLease ? 'translate-x-4' : 'translate-x-0.5'}
                                `} />
                            </div>
                        </button>

                        {/* Mobility lease toggle */}
                        <button
                            type="button"
                            onClick={() => setAcceptsMobilityLease(!acceptsMobilityLease)}
                            className={`
                                p-4 rounded-2xl border flex items-center gap-4 text-left transition
                                ${acceptsMobilityLease
                                    ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-800'
                                    : 'border-neutral-200 dark:border-neutral-700'
                                }
                            `}
                        >
                            <div className={`
                                w-9 h-9 rounded-full flex items-center justify-center shrink-0
                                ${acceptsMobilityLease
                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                                }
                            `}>
                                <Briefcase size={18} />
                            </div>
                            <div className="flex-1">
                                <span className="font-medium text-sm">Bail mobilité</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400 block mt-0.5">
                                    Durée de 1 à 10 mois. Pas de dépôt de garantie. Pour formation, stage, mission temporaire...
                                </span>
                            </div>
                            <div className={`
                                w-10 h-6 rounded-full transition-colors relative shrink-0
                                ${acceptsMobilityLease ? 'bg-black dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}
                            `}>
                                <div className={`
                                    w-5 h-5 rounded-full bg-white dark:bg-neutral-900 absolute top-0.5 transition-transform
                                    ${acceptsMobilityLease ? 'translate-x-4' : 'translate-x-0.5'}
                                `} />
                            </div>
                        </button>
                    </div>
                </div>
            )}

            <EditSectionFooter
                disabled={isLoading}
                label="Enregistrer"
                onClick={handleSave}
            />
        </div>
    );
};

export default LeaseTypeSection;
