
'use client';

import { useState } from "react";
import Heading from "../Heading";
import CommuteAddressSelect from "../inputs/CommuteAddressSelect";
import { Train, Car, Bike, Footprints, Clock, Star } from "lucide-react"; // Import Clock, Star
import { Button } from "../ui/Button";

enum STEPS {
    LOCATION = 0,
    DATE = 1,
    INFO = 2,
    COMMUTE = 3
}

interface ListingCommuteStepProps {
    commuteCoords?: { lat: number; lng: number };
    setCommuteCoords: (value: { lat: number; lng: number }) => void;
    commuteMode: string;
    setCommuteMode: (value: string) => void;
    commuteTime: number;
    setCommuteTime: (value: number) => void;
    savedLocations?: any[];
}

const ListingCommuteStep: React.FC<ListingCommuteStepProps> = ({
    commuteCoords,
    setCommuteCoords,
    commuteMode,
    setCommuteMode,
    commuteTime,
    setCommuteTime,
    savedLocations
}) => {
    // Local state to hold the "Label" of the selected location for the input
    const [selectedLocationLabel, setSelectedLocationLabel] = useState<string>('');

    const transportModes = [
        { label: 'En voiture', icon: Car, value: 'driving' },
        { label: 'À vélo', icon: Bike, value: 'cycling' },
        { label: 'À pied', icon: Footprints, value: 'walking' },
    ];

    return (
        <div className="flex flex-col gap-8">
            {/* Address Input Section */}
            <div className="flex flex-col gap-4">
                <div className="font-semibold">Votre destination</div>
                <CommuteAddressSelect
                    value={commuteCoords ? {
                        label: selectedLocationLabel || 'Destination sélectionnée', // Use specific label
                        value: '',
                        latlng: [commuteCoords.lat, commuteCoords.lng],
                        region: '', city: '', district: '', neighborhood: '', country: ''
                    } : undefined}
                    onChange={(value) => {
                        setCommuteCoords({ lat: value.latlng[0], lng: value.latlng[1] });
                        setSelectedLocationLabel(value.label); // Update label on manual select
                    }}
                    placeholder="Adresse de travail, école..."
                />

                {/* Saved Locations - Uber Style List */}
                {savedLocations && (
                    <div className="flex flex-col gap-2 mt-2">
                        {savedLocations.length > 0 && savedLocations.map((loc) => (
                            <div
                                key={loc.id}
                                onClick={() => {
                                    setCommuteCoords({ lat: loc.latitude, lng: loc.longitude });
                                    setSelectedLocationLabel(loc.name || loc.address); // Set correct label
                                    if (loc.transportMode) {
                                        const mode = loc.transportMode.toLowerCase();
                                        if (['driving', 'cycling', 'walking'].includes(mode)) {
                                            setCommuteMode(mode);
                                        }
                                    }
                                }}
                                className="
                                    flex 
                                    items-center 
                                    gap-4 
                                    p-3 
                                    rounded-xl 
                                    border
                                    border-neutral-200
                                    dark:border-neutral-800
                                    hover:border-black
                                    dark:hover:border-neutral-400
                                    hover:bg-neutral-50 
                                    dark:hover:bg-neutral-900 
                                    cursor-pointer 
                                    transition
                                "
                            >
                                <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                                    {loc.name?.toLowerCase().includes('travail') || loc.name?.toLowerCase().includes('bureau')
                                        ? <Clock size={16} />
                                        : <Star size={16} />
                                    }
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm">
                                        {loc.name || "Lieu enregistré"}
                                    </span>
                                    <span className="text-xs text-neutral-500 line-clamp-1">
                                        {loc.address}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Add Favorite Button - Styled as requested */}
                        <a
                            href="/account/preferences"
                            className="
                                flex 
                                items-center 
                                justify-between
                                p-3 
                                rounded-xl 
                                border
                                border-neutral-200
                                dark:border-neutral-800
                                hover:border-black
                                dark:hover:border-neutral-400
                                hover:bg-neutral-50 
                                dark:hover:bg-neutral-900 
                                cursor-pointer 
                                transition
                                no-underline
                                group
                            "
                        >
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm">
                                    Ajouter une adresse en favoris
                                </span>
                                <span className="text-xs text-neutral-500">
                                    Trouvez des locations dans son périmètre
                                </span>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-neutral-400 group-hover:text-black dark:group-hover:text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                        </a>
                    </div>
                )}
            </div>
            {/* Transport Mode */}
            <div className="flex flex-col gap-4">
                <div className="font-semibold">Moyen de transport</div>
                <div className="grid grid-cols-3 gap-3">
                    {transportModes.map((item) => (
                        <div
                            key={item.label}
                            onClick={() => setCommuteMode(item.value)}
                            className={`
                                rounded-xl
                                border-2
                                p-4
                                flex
                                flex-col
                                gap-3
                                hover:border-black
                                transition
                                cursor-pointer
                                ${commuteMode === item.value ? 'border-black bg-neutral-50' : 'border-neutral-200'}
                            `}
                        >
                            <item.icon size={24} />
                            <div className="font-semibold text-sm">
                                {item.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Max Time Slider */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="font-semibold">Durée maximum</div>
                    <div className="font-bold text-lg">{commuteTime} min</div>
                </div>

                <input
                    type="range"
                    min="15"
                    max="60"
                    step="15"
                    value={commuteTime}
                    onChange={(e) => setCommuteTime(parseInt(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
                <div className="flex justify-between text-xs text-neutral-500">
                    <span>15 min</span>
                    <span>30 min</span>
                    <span>45 min</span>
                    <span>60 min</span>
                </div>
            </div>
        </div>
    );
};

export default ListingCommuteStep;
