'use client';

import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { AddressSelectValue } from "@/components/inputs/MapboxAddressSelect"; // Import type
import { Search, Plus, MapPin, Star, X } from "lucide-react";
import Link from "next/link";

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
    const inputRef = useRef<HTMLInputElement>(null);

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
            <div className="relative flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <Search size={16} className="absolute top-3 left-3 text-neutral-400" />
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInput}
                    placeholder={placeholder || "Rechercher une adresse..."}
                    autoFocus={autoFocus}
                    className="
                        flex-1
                        p-3
                        pl-10
                        text-sm
                        bg-transparent
                        outline-none
                        transition
                        placeholder:text-neutral-500
                    "
                />
                {/* Clear Button */}
                {inputValue && (
                    <button
                        onClick={() => {
                            setInputValue('');
                            setSuggestions([]);
                            inputRef.current?.focus(); // Focus input after clearing
                        }}
                        className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition mr-2"
                    >
                        <X size={16} className="text-neutral-500" />
                    </button>
                )}

                {/* Vertical Divider & Add Favorite Button */}
                <div className="flex items-center pr-3 gap-3">
                    <div className="w-px h-full bg-neutral-300 mx-2 dark:bg-neutral-700"></div>
                    <Link
                        href="/account/preferences"
                        className="
                            p-1.5 
                            bg-white 
                            dark:bg-neutral-700 
                            rounded-full 
                            shadow-sm 
                            hover:scale-110 
                            transition 
                            flex items-center justify-center
                        "
                        title="Ajouter un favori"
                    >
                        <Plus size={14} className="text-black dark:text-white" />
                    </Link>
                </div>
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <ul className="
                    absolute 
                z-9999 
                w-full 
                    bg-white
                    dark:bg-neutral-900 
                    border 
                    border-neutral-200
                    dark:border-neutral-800 
                    rounded-xl 
                    mt-2 
                    shadow-xl 
                    max-h-[300px] 
                    overflow-y-auto
                ">
                    {suggestions.map((feature, index) => {
                        // Extract secondary text (everything after the main text)
                        const mainText = feature.text || feature.place_name.split(',')[0];
                        const secondaryText = feature.place_name.replace(mainText, '').replace(/^,\s*/, '');

                        return (
                            <li
                                key={`${feature.id}-${index}`}
                                onClick={() => handleSelect(feature)}
                                className="
                                flex items-center gap-3
                                p-4
                                border-b border-neutral-100 dark:border-neutral-800 last:border-0
                                hover:bg-neutral-50
                                dark:hover:bg-neutral-800
                                cursor-pointer 
                                transition
                            "
                            >
                                {/* Left Icon */}
                                <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full shrink-0 text-neutral-500">
                                    <MapPin size={20} />
                                </div>

                                {/* Text Content */}
                                <div className="flex flex-col flex-1 overflow-hidden">
                                    <span className="font-semibold text-sm truncate">{mainText}</span>
                                    <span className="text-xs text-neutral-500 truncate">{secondaryText}</span>
                                </div>

                                {/* Right Action (Star) */}
                                <Link
                                    href="/account/preferences"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition text-neutral-400 hover:text-yellow-500"
                                    title="Ajouter aux favoris"
                                >
                                    <Star size={18} />
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    );
};

export default CommuteAddressSelect;
