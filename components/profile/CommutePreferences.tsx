'use client';

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Trash2, MapPin, Plus, Train, Car, Bike, Footprints } from "lucide-react";

import { SafeUser } from "@/types";
import { Button } from "@/components/ui/Button";
import CommuteAddressSelect from "@/components/inputs/CommuteAddressSelect";
import { AddressSelectValue } from "@/components/inputs/MapboxAddressSelect";
import Heading from "@/components/Heading";

interface CommutePreferencesProps {
    currentUser: SafeUser;
}

const CommutePreferences: React.FC<CommutePreferencesProps> = ({
    currentUser
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [address, setAddress] = useState<AddressSelectValue | null>(null);
    const [transportMode, setTransportMode] = useState('TRANSIT');

    const onDelete = (id: string) => {
        setIsLoading(true);
        axios.delete('/api/user/commute', { data: { id } })
            .then(() => {
                toast.success('Lieu supprimé');
                router.refresh();
            })
            .catch(() => {
                toast.error('Erreur lors de la suppression');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }

    const onSubmit = () => {
        if (!name || !address) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        setIsLoading(true);

        axios.post('/api/user/commute', {
            name,
            address: address.label,
            latitude: address.latlng[0],
            longitude: address.latlng[1],
            transportMode
        })
            .then(() => {
                toast.success('Lieu ajouté !');
                router.refresh();
                setIsAdding(false);
                setName('');
                setAddress(null);
                setTransportMode('TRANSIT');
            })
            .catch(() => {
                toast.error("Erreur lors de l'ajout");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }

    return (
        <div className="flex flex-col gap-6 p-6 border border-border rounded-xl bg-card">
            <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">Lieux fréquents & Trajets</h3>
                <p className="text-muted-foreground text-sm">
                    Ajoutez vos lieux (travail, école...) pour voir automatiquement le temps de trajet sur les annonces.
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {currentUser.commuteLocations?.map((location) => (
                    <div key={location.id} className="group flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-border/50 hover:border-border transition">
                        <div className="flex items-center gap-4">
                            <div className="
                                flex items-center justify-center 
                                w-10 h-10 
                                rounded-full 
                                bg-white dark:bg-neutral-800 
                                border border-neutral-100 dark:border-neutral-800
                                shadow-sm
                            ">
                                {location.transportMode === 'TRANSIT' && <Train size={18} className="text-neutral-700 dark:text-neutral-300" />}
                                {location.transportMode === 'DRIVING' && <Car size={18} className="text-neutral-700 dark:text-neutral-300" />}
                                {location.transportMode === 'CYCLING' && <Bike size={18} className="text-neutral-700 dark:text-neutral-300" />}
                                {location.transportMode === 'WALKING' && <Footprints size={18} className="text-neutral-700 dark:text-neutral-300" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium text-sm">{location.name}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-md">
                                    {location.address}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => onDelete(location.id)}
                            disabled={isLoading}
                            className="flex items-center justify-center bg-transparent border-none text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 w-8 h-8 p-0 min-w-0 rounded-full transition"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}

                {currentUser.commuteLocations?.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-neutral-500 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 text-sm">
                        Aucun lieu enregistré. Ajoutez votre travail ou école !
                    </div>
                )}
            </div>

            {!isAdding ? (
                <div className="flex justify-start">
                    <Button
                        onClick={() => setIsAdding(true)}
                        variant="outline"
                        className="w-auto gap-2 pl-3 pr-4"
                        small
                    >
                        <Plus size={16} />
                        <span>Ajouter un lieu</span>
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-4 p-4 border border-border rounded-lg bg-neutral-50/50 dark:bg-neutral-900/20">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="font-medium text-sm">Nouveau lieu</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-neutral-500">Nom</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="ex: Travail"
                                className="
                                    p-3 text-sm
                                    bg-neutral-100 dark:bg-neutral-800 
                                    rounded-lg outline-none
                                    placeholder:text-neutral-400
                                "
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-neutral-500">Mode de transport</label>
                            <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                                {['TRANSIT', 'DRIVING', 'CYCLING', 'WALKING'].map((mode) => (
                                    <div
                                        key={mode}
                                        onClick={() => setTransportMode(mode)}
                                        className={`
                                            flex-1 flex items-center justify-center p-2 rounded-md cursor-pointer transition
                                            ${transportMode === mode ? 'bg-white dark:bg-black shadow-sm text-black dark:text-white' : 'text-neutral-400 hover:text-neutral-600'}
                                        `}
                                        title={mode}
                                    >
                                        {mode === 'TRANSIT' && <Train size={16} />}
                                        {mode === 'DRIVING' && <Car size={16} />}
                                        {mode === 'CYCLING' && <Bike size={16} />}
                                        {mode === 'WALKING' && <Footprints size={16} />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-neutral-500">Adresse</label>
                        <CommuteAddressSelect
                            value={address || undefined}
                            onChange={(val) => setAddress(val)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-2">
                        <Button
                            label="Annuler"
                            onClick={() => setIsAdding(false)}
                            variant="ghost"
                            size="sm"
                            className="w-auto border-none hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        />
                        <Button
                            label="Enregistrer"
                            onClick={onSubmit}
                            disabled={isLoading}
                            size="sm"
                            className="w-auto"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommutePreferences;
