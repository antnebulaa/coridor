'use client';

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, ChevronLeft } from "lucide-react";
import Heading from "../Heading";
import MapboxAddressSelect, { AddressSelectValue } from "./MapboxAddressSelect";

interface LocationPickerProps {
    value?: AddressSelectValue;
    onChange: (value: AddressSelectValue) => void;
}

enum VIEW {
    MAP = 0,
    SEARCH = 1,
    CONFIRM = 2
}

const LocationPicker: React.FC<LocationPickerProps> = ({
    value,
    onChange
}) => {
    const [view, setView] = useState<VIEW>(value ? VIEW.MAP : VIEW.MAP);
    const [tempValue, setTempValue] = useState<AddressSelectValue | undefined>(value);

    // Form states for confirmation step
    const [street, setStreet] = useState(value?.street || '');
    const [apartment, setApartment] = useState(value?.apartment || '');
    const [city, setCity] = useState(value?.city || '');
    const [zipCode, setZipCode] = useState(value?.zipCode || '');
    const [country, setCountry] = useState(value?.country || 'France');

    // Update internal state when value prop changes (initial load)
    useEffect(() => {
        if (value) {
            setStreet(value.street || value.label.split(',')[0]);
            setApartment(value.apartment || '');
            setCity(value.city || '');
            setZipCode(value.zipCode || '');
            setCountry(value.country || 'France');
            setTempValue(value);
        }
    }, [value]);

    const Map = useMemo(() => dynamic(() => import('@/components/Map'), {
        ssr: false
    }), []);

    const updateParent = (updates: Partial<AddressSelectValue>) => {
        if (!tempValue) return;

        // Create the updated object
        const updated: AddressSelectValue = {
            ...tempValue,
            ...updates,
            // Ensure derived fields are synced if needed
        };

        // Update local temp state
        setTempValue(updated);

        // Propagate to parent immediately
        onChange(updated);
    };

    const handleAddressSelect = (selected: AddressSelectValue) => {
        const streetVal = selected.street || selected.label.split(',')[0];

        setTempValue(selected);
        setStreet(streetVal);
        setApartment(''); // Reset apartment on new address selection
        setCity(selected.city || '');
        setZipCode(selected.zipCode || '');
        setCountry(selected.country || 'France');

        // Update parent immediately with the new selection defaults
        onChange({
            ...selected,
            street: streetVal,
            apartment: ''
        });

        // Move to confirmation step
        setView(VIEW.CONFIRM);
    };

    // VIEW: MAP (Initial)
    if (view === VIEW.MAP) {
        return (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Où est situé votre logement ?"
                    subtitle="Aidez les locataires à vous trouver !"
                />
                <div className="relative h-[300px] w-full rounded-xl overflow-hidden cursor-pointer group" onClick={() => setView(VIEW.SEARCH)}>
                    <Map center={value?.latlng} />

                    {/* Overlay Button */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-[80%] z-[1000]">
                        <div className="bg-white p-4 rounded-full shadow-lg flex items-center justify-between hover:scale-105 transition duration-200">
                            <div className="flex items-center gap-3 font-semibold px-2">
                                <Search size={18} />
                                {value ? "Modifier l'adresse" : "Saisir votre adresse"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // VIEW: SEARCH (Inline Replacement)
    if (view === VIEW.SEARCH) {
        return (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setView(VIEW.MAP)}
                        className="p-2 hover:bg-neutral-100 rounded-full transition -ml-2"
                        aria-label="Retour"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="text-2xl font-medium">Saisissez votre adresse</div>
                </div>

                <div className="relative">
                    <MapboxAddressSelect
                        value={undefined}
                        onChange={handleAddressSelect}
                        autoFocus
                        placeholder="Rechercher une rue..."
                        limitCountry="fr"
                        renderAsList
                        customInputClass="!text-lg !font-medium !pl-12 !py-4 bg-neutral-100 border-none rounded-xl"
                        customIconWrapperClass="left-4"
                        icon={MapPin}
                    />
                </div>
            </div>
        );
    }

    // VIEW: CONFIRM (Details Form)
    if (view === VIEW.CONFIRM) {
        return (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-10 duration-300">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setView(VIEW.SEARCH)}
                        className="p-2 hover:bg-neutral-100 rounded-full -ml-2"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="text-2xl font-medium">Confirmez votre adresse</div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {/* Country - Read Only for now as we limit to France */}
                    <div className="relative p-3 border border-neutral-300 rounded-xl">
                        <label className="absolute text-[11px] text-neutral-500 top-2 left-3">Pays / région</label>
                        <div className="pt-4 font-medium">{country}</div>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <ChevronLeft className="rotate-270 text-neutral-400" size={16} />
                        </div>
                    </div>

                    {/* Street */}
                    <div className="relative border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-black">
                        <label className="absolute text-[11px] text-neutral-500 top-2 left-3">Adresse postale</label>
                        <input
                            value={street}
                            onChange={(e) => {
                                setStreet(e.target.value);
                                updateParent({ street: e.target.value });
                            }}
                            className="w-full pt-6 pb-2 px-3 outline-none text-base font-medium placeholder:font-normal"
                            placeholder="Nom de la rue"
                        />
                    </div>

                    {/* Apartment */}
                    <div className="relative border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-black">
                        <label className="absolute text-[11px] text-neutral-500 top-2 left-3">Appt, étage, bâtiment (facultatif)</label>
                        <input
                            value={apartment}
                            onChange={(e) => {
                                setApartment(e.target.value);
                                updateParent({ apartment: e.target.value });
                            }}
                            className="w-full pt-6 pb-2 px-3 outline-none text-base font-medium placeholder:font-normal"
                            placeholder="Complément d'adresse"
                        />
                    </div>

                    {/* City / Zip Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-black">
                            <label className="absolute text-[11px] text-neutral-500 top-2 left-3">Ville</label>
                            <input
                                value={city}
                                onChange={(e) => {
                                    setCity(e.target.value);
                                    updateParent({ city: e.target.value });
                                }}
                                className="w-full pt-6 pb-2 px-3 outline-none text-base font-medium placeholder:font-normal"
                                placeholder="Ville"
                            />
                        </div>
                        <div className="relative border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-black">
                            <label className="absolute text-[11px] text-neutral-500 top-2 left-3">Code postal</label>
                            <input
                                value={zipCode}
                                onChange={(e) => {
                                    setZipCode(e.target.value);
                                    updateParent({ zipCode: e.target.value });
                                }}
                                className="w-full pt-6 pb-2 px-3 outline-none text-base font-medium placeholder:font-normal"
                                placeholder="Code postal"
                            />
                        </div>
                    </div>
                </div>

                <div className="h-[200px] w-full rounded-xl overflow-hidden mt-2 pointer-events-none opacity-80">
                    <Map center={tempValue?.latlng} />
                </div>
            </div>
        );
    }

    return null;
}

export default LocationPicker;
