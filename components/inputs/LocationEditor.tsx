'use client';

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { AddressSelectValue } from "./MapboxAddressSelect";
import Heading from "../Heading";

interface LocationEditorProps {
    value?: AddressSelectValue;
    onChange: (value: AddressSelectValue) => void;
}


const LocationEditor: React.FC<LocationEditorProps> = ({
    value,
    onChange
}) => {
    // Derived values directly from props - No internal state
    const street = value?.street || (value?.label?.includes(',') ? value.label.split(',')[0] : value?.label) || '';
    const apartment = value?.apartment || '';
    const building = value?.building || '';
    const city = value?.city || '';
    const zipCode = value?.zipCode || '';
    const country = value?.country || 'France';

    const Map = useMemo(() => dynamic(() => import('@/components/Map'), {
        ssr: false
    }), []);

    const updateParent = (updates: Partial<AddressSelectValue>) => {
        if (!value) return;

        const updated: AddressSelectValue = {
            ...value,
            ...updates,
        };

        onChange(updated);
    };

    return (
        <div className="flex flex-col gap-6">
            <Heading
                title="Emplacement"
                subtitle="Modifiez l'adresse de votre logement"
            />

            <div className="grid grid-cols-1 gap-4">
                {/* Country - Read Only */}
                <div className="relative p-3 border border-neutral-300 rounded-xl bg-neutral-50">
                    <label className="absolute text-[11px] text-neutral-500 top-2 left-3">Pays / région</label>
                    <div className="pt-4 font-medium text-neutral-600">{country}</div>
                </div>

                {/* Street */}
                <div className="relative border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-black">
                    <label className="absolute text-[11px] text-neutral-500 top-2 left-3">Adresse postale</label>
                    <input
                        value={street}
                        onChange={(e) => updateParent({ street: e.target.value })}
                        className="w-full pt-6 pb-2 px-3 outline-none text-base font-medium placeholder:font-normal"
                        placeholder="Nom de la rue"
                    />
                </div>

                {/* Apartment & Building Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-black">
                        <label className="absolute text-[11px] text-neutral-500 top-2 left-3">Appartement</label>
                        <input
                            value={apartment}
                            onChange={(e) => updateParent({ apartment: e.target.value })}
                            className="w-full pt-6 pb-2 px-3 outline-none text-base font-medium placeholder:font-normal"
                            placeholder="N° d'appartement"
                        />
                    </div>
                    <div className="relative border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-black">
                        <label className="absolute text-[11px] text-neutral-500 top-2 left-3">Bâtiment</label>
                        <input
                            value={building}
                            onChange={(e) => updateParent({ building: e.target.value })}
                            className="w-full pt-6 pb-2 px-3 outline-none text-base font-medium placeholder:font-normal"
                            placeholder="Bâtiment"
                        />
                    </div>
                </div>

                {/* City / Zip Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-black">
                        <label className="absolute text-[11px] text-neutral-500 top-2 left-3">Ville</label>
                        <input
                            value={city}
                            onChange={(e) => updateParent({ city: e.target.value })}
                            className="w-full pt-6 pb-2 px-3 outline-none text-base font-medium placeholder:font-normal"
                            placeholder="Ville"
                        />
                    </div>
                    <div className="relative border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-black">
                        <label className="absolute text-[11px] text-neutral-500 top-2 left-3">Code postal</label>
                        <input
                            value={zipCode}
                            onChange={(e) => updateParent({ zipCode: e.target.value })}
                            className="w-full pt-6 pb-2 px-3 outline-none text-base font-medium placeholder:font-normal"
                            placeholder="Code postal"
                        />
                    </div>
                </div>
            </div>

            <div className="h-[250px] w-full rounded-xl overflow-hidden mt-2">
                <Map center={value?.latlng} />
            </div>
        </div>
    );
}

export default LocationEditor;
