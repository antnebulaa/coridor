'use client';

import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { AddressSelectValue } from "@/components/inputs/MapboxAddressSelect"; // Import type
import { Search } from "lucide-react";

interface CommuteAddressSelectProps {
    value?: AddressSelectValue;
    onChange: (value: AddressSelectValue) => void;
    placeholder?: string;
    autoFocus?: boolean;
    searchTypes?: string;
    limitCountry?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const CommuteAddressSelect: React.FC<CommuteAddressSelectProps> = ({
    value,
    onChange,
    placeholder,
    autoFocus,
    searchTypes = "address,poi",
    limitCountry = "fr"
}) => {
    const [inputValue, setInputValue] = useState(value?.label || '');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

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

        // Similar parsing logic as MapboxAddressSelect but simplified if possible or duplicated
        // For now, minimal parsing as Commute doesn't strictly need broken down address fields as much as Listing does
        // But keeping consistent is good.

        const selectedValue: AddressSelectValue = {
            label: address,
            value: feature.id,
            latlng: [lat, lng],
            region: '', // Simplified for this component if full parsing not strictly required by updated Commute logic
            city: '',
            district: '',
            neighborhood: '',
            country: ''
        };

        setInputValue(address);
        setShowSuggestions(false);
        onChange(selectedValue);
    };

    if (!MAPBOX_TOKEN) {
        return <div className="text-red-500 text-xs">Token manquant</div>
    }

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <Search size={16} className="absolute top-3 left-3 text-neutral-400" />
                <input
                    value={inputValue}
                    onChange={handleInput}
                    placeholder={placeholder || "Rechercher une adresse..."}
                    autoFocus={autoFocus}
                    className="
                        w-full
                        p-3
                        pl-10
                        text-sm
                        bg-neutral-100 
                        dark:bg-neutral-800
                        rounded-lg
                        outline-none
                        transition
                        placeholder:text-neutral-500
                    "
                />
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <ul className="
                    absolute 
                    z-[9999] 
                    w-full 
                    bg-white
                    dark:bg-neutral-900 
                    border 
                    border-neutral-200
                    dark:border-neutral-800 
                    rounded-lg 
                    mt-1 
                    shadow-lg 
                    max-h-60 
                    overflow-auto
                ">
                    {suggestions.map((feature, index) => (
                        <li
                            key={`${feature.id}-${index}`}
                            onClick={() => handleSelect(feature)}
                            className="
                                p-3 
                                hover:bg-neutral-100
                                dark:hover:bg-neutral-800
                                cursor-pointer 
                                transition
                                text-sm
                            "
                        >
                            {feature.place_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CommuteAddressSelect;
