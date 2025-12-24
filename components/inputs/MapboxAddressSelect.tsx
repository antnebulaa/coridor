'use client';

import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { MapPin, Star, X, TramFront } from "lucide-react";
import Link from "next/link";

export type AddressSelectValue = {
    label: string;
    latlng: number[];
    value: string;
    region: string;
    city?: string;
    district?: string;
    neighborhood?: string;
    country?: string;
    zipCode?: string;
    street?: string;
}

interface MapboxAddressSelectProps {
    value?: AddressSelectValue;
    onChange: (value: AddressSelectValue) => void;
    placeholder?: string;
    autoFocus?: boolean;
    searchTypes?: string;
    limitCountry?: string;
    clearOnSelect?: boolean;
    renderAsList?: boolean;
    customInputClass?: string;
    label?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const MapboxAddressSelect: React.FC<MapboxAddressSelectProps> = ({
    value,
    onChange,
    placeholder,
    autoFocus,
    searchTypes, // Now optional/nullable in usage
    limitCountry = "fr",
    clearOnSelect = false,
    renderAsList = false,
    customInputClass,
    label
}) => {
    const [inputValue, setInputValue] = useState(value?.label || '');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Manage placeholder state to clear on focus
    const defaultPlaceholder = placeholder || "Entrez une adresse...";

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
            // Construct URL parameters
            const params = new URLSearchParams({
                access_token: MAPBOX_TOKEN!,
                country: limitCountry,
                language: 'fr',
                limit: '5' // Back to 5 as requested
            });

            // Only append types if searchTypes is provided and not empty
            if (searchTypes) {
                params.append('types', searchTypes);
            }

            // Mapbox Geocoding API
            const response = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`
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
        let postcode = '';

        if (feature.context) {
            feature.context.forEach((ctx: any) => {
                if (ctx.id.startsWith('place')) {
                    city = ctx.text;
                } else if (ctx.id.startsWith('region')) {
                    region = ctx.text;
                } else if (ctx.id.startsWith('country')) {
                    country = ctx.text;
                } else if (ctx.id.startsWith('neighborhood')) {
                    neighborhood = ctx.text;
                } else if (ctx.id.startsWith('district')) {
                    district = ctx.text;
                } else if (ctx.id.startsWith('locality')) {
                    if (!city) city = ctx.text;
                } else if (ctx.id.startsWith('postcode')) {
                    postcode = ctx.text;
                }
            });
        }

        // Infer district logic
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

        const selectedValue: AddressSelectValue = {
            label: address,
            value: feature.id, // Mapbox ID
            latlng: [lat, lng],
            region: region || country,
            city: city,
            district: district,
            neighborhood: neighborhood,
            country: country,
            zipCode: postcode,
            street: feature.place_name.split(',')[0].trim()
        };

        setInputValue(clearOnSelect ? '' : address);
        setShowSuggestions(false);
        setSuggestions([]);
        onChange(selectedValue);
    };

    if (!MAPBOX_TOKEN) {
        return <div className="text-red-500">Error: Mapbox Token missing</div>
    }

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInput}
                    placeholder={label ? " " : defaultPlaceholder}
                    autoFocus={autoFocus}
                    className={`
                        peer
                        w-full
                        p-4
                        font-medium
                        text-lg
                        text-left
                        bg-background
                        dark:bg-[#282828]
                        dark:focus:bg-[#323232]
                        rounded-full
                        outline-none
                        transition
                        disabled:opacity-70
                        disabled:cursor-not-allowed
                        ring-0
                        focus:ring-0
                        ${customInputClass || ''}
                    `}
                />
                {label && (
                    <label
                        className={`
                            absolute
                            text-base
                            duration-150
                            transform
                            -translate-y-3
                            top-5
                            z-10
                            origin-top-left
                            left-4
                            scale-75
                            peer-placeholder-shown:scale-100
                            peer-placeholder-shown:translate-y-0
                            peer-focus:scale-75
                            peer-focus:-translate-y-3
                            text-muted-foreground
                            pointer-events-none
                        `}
                    >
                        {label}
                    </label>
                )}
                {inputValue && (
                    <button
                        onClick={() => {
                            setInputValue('');
                            setSuggestions([]);
                            inputRef.current?.focus();
                        }}
                        className="
                            absolute 
                            top-1/2 
                            -translate-y-1/2 
                            right-4 
                            p-2 
                            hover:bg-neutral-100 
                            dark:hover:bg-neutral-800 
                            rounded-full 
                            transition 
                            text-neutral-400 
                            hover:text-foreground
                        "
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <ul className={`
                    ${renderAsList ? 'relative mt-4 border-0 shadow-none bg-transparent w-full' : 'absolute z-50 w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl mt-2 shadow-xl'}
                    ${!renderAsList && 'max-h-[300px] overflow-y-auto'}
                `}>
                    {suggestions.map((feature, index) => {
                        const mainText = feature.text || feature.place_name.split(',')[0];
                        const secondaryText = feature.place_name.replace(mainText, '').replace(/^,\s*/, '');

                        const getIcon = (feature: any) => {
                            const categories = (feature.properties?.category || '').toLowerCase();
                            const maki = (feature.properties?.maki || '').toLowerCase();
                            const name = feature.text?.toLowerCase() || '';
                            const types = feature.place_type || [];

                            // Check for official Maki icons (Mapbox standard)
                            if (maki === 'rail' || maki === 'rail-metro' || maki === 'rail-light' || maki === 'metro') return <TramFront size={20} />;

                            // Check categories && name && types
                            if (
                                categories.includes('tram') || name.includes('tramway') ||
                                categories.includes('metro') || categories.includes('subway') || name.includes('métro') ||
                                categories.includes('railway') || categories.includes('train') || name.includes('gare') || name.includes('rer') ||
                                (types.includes('poi') && (name.includes('station') || name.includes('gare'))) // Fallback for generic station POIs
                            ) {
                                return <TramFront size={20} />;
                            }

                            return <MapPin size={20} />;
                        };

                        return (
                            <li
                                key={`${feature.id}-${index}`}
                                onClick={() => handleSelect(feature)}
                                className="
                                    flex items-center gap-3
                                    px-2 py-3
                                    border-b border-neutral-100 dark:border-neutral-800 last:border-0
                                    hover:bg-neutral-50
                                    dark:hover:bg-neutral-800
                                    cursor-pointer 
                                    transition
                                "
                            >
                                {/* Left Icon */}
                                <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full shrink-0 text-neutral-500">
                                    {getIcon(feature)}
                                </div>

                                {/* Text Content */}
                                <div className="flex flex-col flex-1 overflow-hidden">
                                    <span className="font-semibold text-lg truncate text-left">{mainText}</span>
                                    <span className="text-base text-neutral-500 truncate text-left">{secondaryText}</span>
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

export default MapboxAddressSelect;
