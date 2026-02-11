'use client';

import { useState } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import EditSectionFooter from "./EditSectionFooter";
import CustomToast from "@/components/ui/CustomToast";

interface FurnitureSectionProps {
    listing: SafeListing & { furniture?: any };
}

// Define the structure for items
const MANDATORY_ITEMS = [
    { id: 'bedding', label: 'Literie avec couette' },
    { id: 'curtains', label: 'Volets ou rideaux dans les chambres' },
    { id: 'hob', label: 'Plaques de cuisson' },
    { id: 'oven', label: 'Four ou four à micro-onde' },
    { id: 'fridge', label: 'Réfrigérateur' },
    { id: 'freezer', label: 'Congélateur' },
    { id: 'dishes', label: 'Vaisselle' },
    { id: 'utensils', label: 'Ustensiles de cuisine' },
    { id: 'table', label: 'Table' },
    { id: 'seats', label: 'Sièges' },
    { id: 'shelves', label: 'Étagères de rangement' },
    { id: 'lights', label: 'Luminaires' },
    { id: 'vacuum', label: 'Aspirateur' },
];

const OPTIONAL_ITEMS = [
    { id: 'washingMachine', label: 'Lave-linge' },
    { id: 'coffeeMaker', label: 'Cafetière' },
    { id: 'toaster', label: 'Grille-pain' },
    { id: 'dishwasher', label: 'Lave-vaisselle' },
    { id: 'hairDryer', label: 'Sèche-cheveux' },
    { id: 'mirror', label: 'Miroir' },
    { id: 'sheets', label: 'Draps' },
    { id: 'towels', label: 'Serviettes de bain' },
    { id: 'cloths', label: 'Torchons' },
];

const FurnitureSection: React.FC<FurnitureSectionProps> = ({
    listing
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Initial state derived from listing.furniture or false
    const [state, setState] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        const furniture = listing.furniture || {};

        [...MANDATORY_ITEMS, ...OPTIONAL_ITEMS].forEach(item => {
            initial[item.id] = furniture[item.id] || false;
        });

        return initial;
    });

    const toggle = (id: string) => {
        setState(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const onSave = () => {
        setIsLoading(true);

        axios.post(`/api/listings/${listing.id}/furniture`, state)
            .then(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Équipements sauvegardés"
                        type="success"
                    />
                ));
                router.refresh(); // Refresh to update server-side data
            })
            .catch(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Une erreur est survenue"
                        type="error"
                    />
                ));
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    // Check compliance: All mandatory items must be true
    const isCompliant = MANDATORY_ITEMS.every(item => state[item.id]);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Équipements du logement</h2>
                <div className="text-gray-500 text-sm">
                    Sélectionnez les équipements présents dans votre logement.
                </div>
            </div>

            <div className={`
                border rounded-lg p-4 text-sm flex gap-3 items-start
                ${isCompliant
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-orange-50 border-orange-200 text-orange-800'
                }
            `}>
                <div className="mt-0.5">
                    {isCompliant ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <span className="font-semibold">
                        {isCompliant ? 'Logement conforme' : 'Mise en conformité requise'}
                    </span>
                    <span>
                        {isCompliant
                            ? 'Votre logement dispose de tous les équipements obligatoires pour être loué en meublé. Le propriétaire est en règle.'
                            : 'Un logement meublé doit obligatoirement inclure tous les équipements de la liste ci-dessous pour être en règle.'
                        }
                    </span>
                </div>
            </div>

            {/* Mandatory Section */}
            <div className="flex flex-col gap-4">
                <h3 className="font-medium text-lg border-b pb-2">Équipements obligatoires (Meublé)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MANDATORY_ITEMS.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => toggle(item.id)}
                            className={`
                                flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition group
                                ${state[item.id] ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-black'}
                            `}
                        >
                            <div className={`
                                w-6 h-6 rounded-full border transition flex items-center justify-center
                                ${state[item.id]
                                    ? 'bg-black border-black'
                                    : 'border-neutral-300 bg-white group-hover:border-black'
                                }
                            `}>
                                {state[item.id] && (
                                    <Check size={14} className="text-white" strokeWidth={1.5} />
                                )}
                            </div>
                            <span className="font-medium text-sm">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Optional Section */}
            <div className="flex flex-col gap-4">
                <h3 className="font-medium text-lg border-b pb-2">Équipements facultatifs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {OPTIONAL_ITEMS.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => toggle(item.id)}
                            className={`
                                flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition group
                                ${state[item.id] ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-black'}
                            `}
                        >
                            <div className={`
                                w-6 h-6 rounded-full border transition flex items-center justify-center
                                ${state[item.id]
                                    ? 'bg-black border-black'
                                    : 'border-neutral-300 bg-white group-hover:border-black'
                                }
                            `}>
                                {state[item.id] && (
                                    <Check size={14} className="text-white" strokeWidth={1.5} />
                                )}
                            </div>
                            <span className="font-medium text-sm">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <EditSectionFooter
                label={isLoading ? "Sauvegarde..." : "Enregistrer"}
                onClick={onSave}
                disabled={isLoading}
            />
        </div>
    );
}

export default FurnitureSection;
