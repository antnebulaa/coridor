
'use client';

import { useState } from "react";
import Heading from "../Heading";
import MapboxAddressSelect, { AddressSelectValue } from "../inputs/MapboxAddressSelect";
import { Train, Car, Bike, Footprints, Clock, Star, Briefcase, Home, GraduationCap, Heart } from "lucide-react"; // Added imports
import { Button } from "../ui/Button";

enum STEPS {
    LOCATION = 0,
    DATE = 1,
    INFO = 2,
    COMMUTE = 3
}

interface CommutePoint {
    lat: number;
    lng: number;
    mode: string;
    time: number;
    label: string;
}

interface ListingCommuteStepProps {
    commutePoints: CommutePoint[];
    setCommutePoints: (value: CommutePoint[]) => void;
    savedLocations?: any[];
}

const ListingCommuteStep: React.FC<ListingCommuteStepProps> = ({
    commutePoints,
    setCommutePoints,
    savedLocations
}) => {
    // Index of the point currently being edited (if any)
    // If null, we are in "Add Mode" or "Overview Mode"
    const [editingIndex, setEditingIndex] = useState<number | null>(commutePoints.length > 0 ? 0 : null);
    const [isAdding, setIsAdding] = useState(false);

    const transportModes = [
        { label: 'En voiture', icon: Car, value: 'driving' },
        { label: 'À vélo', icon: Bike, value: 'cycling' },
        { label: 'À pied', icon: Footprints, value: 'walking' },
    ];

    const iconList = [
        { id: 'briefcase', icon: Briefcase, label: 'Travail' },
        { id: 'home', icon: Home, label: 'Bureaux' },
        { id: 'school', icon: GraduationCap, label: 'École' },
        { id: 'favorite', icon: Star, label: 'Favori' },
        { id: 'partner', icon: Heart, label: 'Partenaire' }
    ];

    const addPoint = (point: CommutePoint) => {
        if (commutePoints.length >= 2) return;
        const newPoints = [...commutePoints, point];
        setCommutePoints(newPoints);
        setEditingIndex(newPoints.length - 1); // Switch to editing the new point
        setIsAdding(false);
    };

    const removePoint = (index: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newPoints = [...commutePoints];
        newPoints.splice(index, 1);
        setCommutePoints(newPoints);
        if (editingIndex === index) {
            setEditingIndex(newPoints.length > 0 ? 0 : null);
        } else if (editingIndex !== null && editingIndex > index) {
            setEditingIndex(editingIndex - 1);
        }
    };

    const updatePoint = (index: number, field: keyof CommutePoint, value: any) => {
        const newPoints = [...commutePoints];
        newPoints[index] = { ...newPoints[index], [field]: value };
        setCommutePoints(newPoints);
    };

    const currentPoint = editingIndex !== null ? commutePoints[editingIndex] : null;

    return (
        <div className="flex flex-col gap-6">

            {/* Initial Empty State */}
            {commutePoints.length === 0 && (
                <div className="flex flex-col gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                    <MapboxAddressSelect
                        value={undefined}
                        onChange={(value) => {
                            addPoint({
                                lat: value.latlng[0],
                                lng: value.latlng[1],
                                mode: 'driving',
                                time: 30,
                                label: value.label
                            });
                        }}
                        placeholder="On cherche où ?"
                        autoFocus={true}
                        renderAsList={true}
                        clearOnSelect
                    />
                    {savedLocations && savedLocations.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2">
                            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Favoris</div>
                            {savedLocations.map((loc) => {
                                // Logic to match icon
                                const matchedIcon = iconList.find(i => i.id === loc.icon);
                                const Icon = matchedIcon ? matchedIcon.icon : Star;

                                return (
                                    <div
                                        key={loc.id}
                                        onClick={() => {
                                            addPoint({
                                                lat: loc.latitude,
                                                lng: loc.longitude,
                                                mode: loc.transportMode?.toLowerCase() || 'driving',
                                                time: 30,
                                                label: loc.name || loc.address
                                            });
                                        }}
                                        className="flex items-center gap-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition active:scale-95"
                                    >
                                        <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                                            <Icon size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{loc.name || "Lieu enregistré"}</span>
                                            <span className="text-xs text-neutral-500 line-clamp-1">{loc.address}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* 1. Header showing Selected Points blocks */}
            {commutePoints.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="font-semibold text-sm text-neutral-500">
                        {commutePoints.length === 1 ? 'Lieu sélectionné' : 'Lieux à croiser'}
                    </div>
                    <div className="flex flex-col gap-2">
                        {commutePoints.map((point, index) => (
                            <div key={index} className="flex flex-col gap-2 w-full">
                                <div
                                    onClick={() => setEditingIndex(index)}
                                    className={`
                                        relative
                                        flex-1
                                        flex items-center gap-3 p-3 rounded-xl cursor-pointer transition
                                        ${editingIndex === index ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'}
                                    `}
                                >
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs
                                        ${index === 0 ? 'bg-black' : 'bg-green-500'}
                                    `}>
                                        {index + 1}
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <div className="font-semibold text-sm">{point.label}</div>
                                        <div className="text-xs text-neutral-500">
                                            {point.time} min • {point.mode === 'driving' ? 'Voiture' : point.mode === 'cycling' ? 'Vélo' : 'Marche'}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => removePoint(index, e)}
                                        className="p-2 hover:bg-neutral-200 rounded-full"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Compact "+" Button Trigger OUTSIDE the card */}
                                {commutePoints.length < 2 && index === 0 && (
                                    !isAdding ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsAdding(true);
                                                setEditingIndex(null);
                                            }}
                                            className="
                                                w-14 h-[60px] rounded-xl bg-neutral-100 hover:bg-neutral-200 
                                                flex items-center justify-center shrink-0
                                                transition
                                            "
                                            title="Ajouter un lieu"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-black">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <div className="flex flex-col gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                                            <MapboxAddressSelect
                                                value={undefined}
                                                onChange={(value) => {
                                                    addPoint({
                                                        lat: value.latlng[0],
                                                        lng: value.latlng[1],
                                                        mode: 'driving',
                                                        time: 30,
                                                        label: value.label
                                                    });
                                                }}
                                                placeholder="On cherche où ?"
                                                autoFocus={true}
                                                renderAsList={true}
                                                clearOnSelect
                                            />
                                            <div
                                                onClick={(e) => { e.stopPropagation(); setIsAdding(false); }}
                                                className="self-end text-xs font-semibold underline cursor-pointer hover:text-neutral-500"
                                            >
                                                Annuler
                                            </div>
                                            {savedLocations && savedLocations.length > 0 && (
                                                <div className="flex flex-col gap-2 mt-2">
                                                    <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Favoris</div>
                                                    {savedLocations.map((loc) => {
                                                        const isSelected = commutePoints.some(p => p.lat === loc.latitude && p.lng === loc.longitude);
                                                        if (isSelected) return null;

                                                        // Logic to match icon
                                                        const matchedIcon = iconList.find(i => i.id === loc.icon);
                                                        const Icon = matchedIcon ? matchedIcon.icon : Star;

                                                        return (
                                                            <div
                                                                key={loc.id}
                                                                onClick={() => {
                                                                    addPoint({
                                                                        lat: loc.latitude,
                                                                        lng: loc.longitude,
                                                                        mode: loc.transportMode?.toLowerCase() || 'driving',
                                                                        time: 30,
                                                                        label: loc.name || loc.address
                                                                    });
                                                                }}
                                                                className="flex items-center gap-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition active:scale-95"
                                                            >
                                                                <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                                                                    <Icon size={16} />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-sm">{loc.name || "Lieu enregistré"}</span>
                                                                    <span className="text-xs text-neutral-500 line-clamp-1">{loc.address}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}



            {/* Settings for the ACTIVE point */}
            {editingIndex !== null && currentPoint && (
                <div className="bg-neutral-100 rounded-xl p-4 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center gap-2 font-semibold text-lg">
                        <span className="text-neutral-500 text-sm font-normal">Paramètres pour</span>
                        <span>{currentPoint.label}</span>
                    </div>

                    {/* Transport Mode */}
                    <div className="flex flex-col gap-3">
                        <div className="font-semibold text-sm text-neutral-500">Moyen de transport</div>
                        <div className="grid grid-cols-3 gap-3">
                            {transportModes.map((item) => (
                                <div
                                    key={item.label}
                                    onClick={() => updatePoint(editingIndex, 'mode', item.value)}
                                    className={`
                                            rounded-xl
                                            border-2
                                            p-3
                                            flex
                                            flex-col
                                            items-center
                                            justify-center
                                            gap-2
                                            hover:border-black
                                            transition
                                            cursor-pointer
                                            ${currentPoint.mode === item.value ? 'border-black bg-neutral-50' : 'border-neutral-200'}
                                        `}
                                >
                                    <item.icon size={20} />
                                    <div className="font-semibold text-xs text-center">
                                        {item.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Max Time Slider */}
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <div className="font-semibold text-sm text-neutral-500">Durée maximum</div>
                            <div className="font-bold text-lg">{currentPoint.time} min</div>
                        </div>

                        <input
                            type="range"
                            min="15"
                            max="60"
                            step="15"
                            value={currentPoint.time}
                            onChange={(e) => updatePoint(editingIndex, 'time', parseInt(e.target.value))}
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
            )}
        </div >
    );
};

export default ListingCommuteStep;
