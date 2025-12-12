'use client';

import { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete from "use-places-autocomplete"; // We might not need this anymore if we do custom fetch
import axios from 'axios';
import { toast } from "react-hot-toast";

export type AddressSelectValue = {
    label: string;
    latlng: number[];
    value: string;
    region: string;
    city?: string;
    district?: string;
    neighborhood?: string;
    country?: string;
}

interface MapboxAddressSelectProps {
    value?: AddressSelectValue;
    onChange: (value: AddressSelectValue) => void;
    placeholder?: string;
    autoFocus?: boolean;
    searchTypes?: string; // e.g. "address,poi" or "place,district,locality"
    limitCountry?: string; // e.g. "fr"
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const MapboxAddressSelect: React.FC<MapboxAddressSelectProps> = ({
    value,
    onChange,
    placeholder,
    autoFocus,
    searchTypes = "address,poi", // Default to address search
    limitCountry = "fr" // Default to France
}) => {
    const [inputValue, setInputValue] = useState(value?.label || '');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync input with value prop
    useEffect(() => {
        if (value) {
            setInputValue(value.label);
        } else {
            setInputValue('');
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 3) return;

        try {
            // Mapbox Geocoding API
            // types configurable via props
            // country configurable via props
            const response = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=${searchTypes}&country=${limitCountry}&language=fr`
            );

            if (response.data && response.data.features) {
                setSuggestions(response.data.features);
                setShowSuggestions(true);
            }
        } catch (error) {
            console.error("Mapbox search error:", error);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue && inputValue !== value?.label) {
                fetchSuggestions(inputValue);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [inputValue, value]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (e.target.value === '') {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelect = (feature: any) => {
        const address = feature.place_name;
        const [lng, lat] = feature.center;

        let city = '';
        let region = '';
        let country = '';
        let district = '';
        let neighborhood = '';

        // Context parsing
        // Mapbox context is an array of objects { id, text, ... }
        // e.g. [{id: 'neighborhood...', text: 'Batignolles'}, {id: 'postcode...', text: '75017'}, {id: 'place...', text: 'Paris'}, ...]
        if (feature.context) {
            feature.context.forEach((ctx: any) => {
                if (ctx.id.startsWith('place')) {
                    city = ctx.text;
                } else if (ctx.id.startsWith('region')) { // Usually "Île-de-France"
                    region = ctx.text;
                } else if (ctx.id.startsWith('country')) {
                    country = ctx.text;
                } else if (ctx.id.startsWith('neighborhood')) {
                    neighborhood = ctx.text;
                } else if (ctx.id.startsWith('district')) { // Sometimes district is returned
                    district = ctx.text;
                } else if (ctx.id.startsWith('locality')) {
                    // Sometimes locality is used for city/village
                    if (!city) city = ctx.text;
                }
            });
        }

        // If city is Paris/Lyon/Marseille, try to infer district from postcode if not explicitly "district" type
        if (!district) {
            const postcodeCtx = feature.context?.find((c: any) => c.id.startsWith('postcode'));
            if (postcodeCtx && city) {
                const pc = postcodeCtx.text;
                const cityLower = city.toLowerCase();

                if (cityLower === 'paris' && pc.startsWith('750')) {
                    const arr = parseInt(pc.substring(3), 10);
                    if (arr >= 1 && arr <= 20) district = `${arr === 1 ? '1er' : arr + 'e'}`;
                } else if (cityLower === 'marseille' && pc.startsWith('130')) {
                    const arr = parseInt(pc.substring(3), 10);
                    if (arr >= 1 && arr <= 16) district = `${arr === 1 ? '1er' : arr + 'e'}`;
                } else if (cityLower === 'lyon' && pc.startsWith('690')) {
                    const arr = parseInt(pc.substring(3), 10);
                    if (arr >= 1 && arr <= 9) district = `${arr === 1 ? '1er' : arr + 'e'}`;
                }
            }
        }

        // If 'neighborhood' was not found in context, verify if the feature itself is a neighborhood (if we allowed searching for it)
        // But we restricted types to address,poi. 

        const selectedValue: AddressSelectValue = {
            label: address,
            value: feature.id, // Mapbox ID
            latlng: [lat, lng],
            region: region || country, // Fallback
            city: city,
            district: district,
            neighborhood: neighborhood,
            country: country
        };

        setInputValue(address);
        setShowSuggestions(false);
        onChange(selectedValue);
    };

    if (!MAPBOX_TOKEN) {
        return <div className="text-red-500">Error: Mapbox Token missing</div>
    }

    return (
        <div ref={wrapperRef} className="relative">
            <input
                value={inputValue}
                onChange={handleInput}
                placeholder={placeholder || "Entrez une adresse..."}
                autoFocus={autoFocus}
                className="
                    w-full
                    p-4
                    font-medium
                    text-lg
                    text-center
                    bg-white 
                    border-2
                    rounded-full
                    outline-none
                    transition
                    disabled:opacity-70
                    disabled:cursor-not-allowed
                    border-neutral-300
                    focus:border-black
                "
            />
            {showSuggestions && suggestions.length > 0 && (
                <ul className="
                    absolute 
                    z-[9999] 
                    w-full 
                    bg-white 
                    border 
                    border-neutral-200 
                    rounded-md 
                    mt-1 
                    shadow-lg 
                    max-h-60 
                    overflow-auto
                ">
                    {suggestions.map((feature) => (
                        <li
                            key={feature.id}
                            onClick={() => handleSelect(feature)}
                            className="
                                p-3 
                                hover:bg-neutral-100 
                                cursor-pointer 
                                transition
                                border-b
                                border-neutral-100
                                last:border-none
                            "
                        >
                            <div className="font-medium text-sm">{feature.place_name}</div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MapboxAddressSelect;
