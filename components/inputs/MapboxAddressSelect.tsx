'use client';

import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { MapPin, Navigation, Star, TramFront, Building2, Landmark, Trees, TrainFront, X } from "lucide-react";
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
    apartment?: string;
    building?: string;
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
    customIconWrapperClass?: string;
    label?: string;
    icon?: any;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// Helper for UUID generation with fallback
function generateUUID() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

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
    customIconWrapperClass,
    label,
    icon: Icon
}) => {
    const [inputValue, setInputValue] = useState(value?.label || '');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [userProximity, setUserProximity] = useState('ip');
    const [sessionToken, setSessionToken] = useState('');

    useEffect(() => {
        setSessionToken(generateUUID());
    }, []);

    // Attempt to get user location for better relevance
    useEffect(() => {
        if (typeof window !== 'undefined' && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserProximity(`${position.coords.longitude},${position.coords.latitude}`);
                },
                () => {
                    // Ignore error, fallback to 'ip'
                }
            );
        }
    }, []);

    // Manage placeholder state to clear on focus
    const defaultPlaceholder = placeholder || "Entrez une adresse...";

    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync input with value prop
    useEffect(() => {
        if (value) {
            setInputValue(value.label || '');
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
            const params = new URLSearchParams({
                access_token: MAPBOX_TOKEN!,
                language: 'fr',
                country: limitCountry,
                proximity: userProximity,
                session_token: sessionToken,
                types: searchTypes || 'address,poi,neighborhood,place,district,locality'
            });

            const response = await axios.get(
                `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(query)}&${params.toString()}`
            );

            if (response.data && response.data.suggestions) {
                setSuggestions(response.data.suggestions);
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
    }, [inputValue, value, sessionToken, userProximity, searchTypes]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (e.target.value === '') {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelect = async (suggestion: any) => {
        try {
            // Retrieve details for coordinates
            const retrieveRes = await axios.get(
                `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?access_token=${MAPBOX_TOKEN}&session_token=${sessionToken}`
            );

            const feature = retrieveRes.data.features[0];
            if (!feature) return;

            const [lng, lat] = feature.geometry.coordinates;

            // Map SearchBox context to our format
            const ctx = suggestion.context || {};

            const city = ctx.place?.name || ctx.locality?.name || '';
            const postcode = ctx.postcode?.name || '';
            const region = ctx.region?.name || ctx.district?.name || ''; // District in SearchBox might differ
            const country = ctx.country?.name || '';
            const neighborhood = ctx.neighborhood?.name || '';

            // District logic (Arrondissements)
            let district = '';
            // Basic inference from postcode/city like before
            if (!district && city && postcode) {
                const cityLower = city.toLowerCase();
                if (cityLower === 'paris' && postcode.startsWith('750')) {
                    const arr = parseInt(postcode.substring(3), 10);
                    if (arr >= 1 && arr <= 20) district = `${arr === 1 ? '1er' : arr + 'e'}`;
                } else if (cityLower === 'marseille' && postcode.startsWith('130')) {
                    const arr = parseInt(postcode.substring(3), 10);
                    if (arr >= 1 && arr <= 16) district = `${arr === 1 ? '1er' : arr + 'e'}`;
                } else if (cityLower === 'lyon' && postcode.startsWith('690')) {
                    const arr = parseInt(postcode.substring(3), 10);
                    if (arr >= 1 && arr <= 9) district = `${arr === 1 ? '1er' : arr + 'e'}`;
                }
            }

            let finalLabel = suggestion.name;
            if (suggestion.full_address) {
                const nameLower = suggestion.name.toLowerCase();
                const fullLower = suggestion.full_address.toLowerCase();
                if (fullLower.startsWith(nameLower)) {
                    finalLabel = suggestion.full_address;
                } else if (suggestion.full_address !== suggestion.name) {
                    finalLabel = `${suggestion.name}, ${suggestion.full_address}`;
                }
            }

            const selectedValue: AddressSelectValue = {
                label: finalLabel,
                value: suggestion.mapbox_id,
                latlng: [lat, lng],
                region: region || country,
                city: city,
                district: district,
                neighborhood: neighborhood,
                country: country,
                zipCode: postcode,
                street: suggestion.name
            };

            setInputValue(clearOnSelect ? '' : selectedValue.label);
            setShowSuggestions(false);
            setSuggestions([]);
            onChange(selectedValue);

            // Refresh session token after selection (recommended)
            setSessionToken(generateUUID());

        } catch (error) {
            console.error("Error retrieving details:", error);
        }
    };

    if (!MAPBOX_TOKEN) {
        return <div className="text-red-500">Error: Mapbox Token missing</div>
    }

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                {Icon && (
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 text-neutral-800 dark:text-neutral-200 pointer-events-none ${customIconWrapperClass || ''}`}>
                        <Icon size={18} strokeWidth={2.5} />
                    </div>
                )}
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInput}
                    placeholder=" "
                    autoFocus={autoFocus}
                    className={`
                        peer
                        w-full
                        p-4
                        ${Icon ? 'pl-12' : ''}
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

                {/* Shimmer Placeholder (Only if empty and no floating label) */}
                {!inputValue && !label && (
                    <div
                        className={`
                            absolute 
                            inset-0 
                            p-4 
                            flex 
                            items-center 
                            font-medium 
                            pointer-events-none 
                            animate-shimmer
                            ${customInputClass || ''}
                        `}
                    >
                        {defaultPlaceholder}
                    </div>
                )}

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
                    ${renderAsList ? 'relative mt-0 border-0 shadow-none bg-transparent w-full' : 'absolute z-50 w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl mt-2 shadow-xl'}
                    ${!renderAsList && 'max-h-[300px] overflow-y-auto'}
                `}>
                    {suggestions.map((suggestion, index) => {
                        const mainText = suggestion.name;
                        // Avoid repetition if full_address starts with name
                        let secondaryText = suggestion.full_address || suggestion.place_formatted || "";
                        if (secondaryText.startsWith(mainText)) {
                            secondaryText = secondaryText.substring(mainText.length).replace(/^,\s*/, '');
                        }

                        const getPlaceConfig = (s: any) => {
                            const maki = (s.maki || '').toLowerCase();
                            const type = s.feature_type || '';
                            const cats = (s.poi_category || []).map((c: string) => c.toLowerCase());
                            const name = (s.name || '').toLowerCase();

                            // Parks / Nature
                            if (maki === 'park' || cats.some((c: string) => c.includes('park') || c.includes('garden') || c.includes('forest') || c.includes('parc'))) {
                                return { icon: <Trees size={20} />, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' };
                            }

                            // Monuments / Culture
                            if (maki === 'museum' || maki === 'monument' || maki === 'castle' || maki === 'art-gallery' ||
                                cats.some((c: string) => c.includes('museum') || c.includes('historic') || c.includes('castle') || c.includes('monument') || c.includes('tourist'))) {
                                return { icon: <Landmark size={20} />, bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' };
                            }

                            // Heavy Rail (Gare)
                            if (maki === 'rail' || maki === 'railway' || maki === 'train' ||
                                cats.some((c: string) => c.includes('rail') || c.includes('train')) ||
                                name.includes('gare')) {
                                return { icon: <TrainFront size={20} />, bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' };
                            }

                            // Metro / Tram
                            if (maki === 'metro' || maki === 'rail-metro' || maki === 'rail-light' ||
                                cats.some((c: string) => c.includes('tram') || c.includes('metro') || c.includes('subway')) ||
                                name.includes('tramway') || name.includes('métro') || name.includes('rer')) {
                                return { icon: <TramFront size={20} />, bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400' };
                            }

                            // City
                            if (type === 'place' || type === 'locality') {
                                return { icon: <Building2 size={20} />, bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' };
                            }
                            // Neighborhood / District
                            if (type === 'neighborhood' || type === 'district') {
                                return { icon: <MapPin size={20} />, bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' };
                            }
                            // POI Default
                            return { icon: <MapPin size={20} />, bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-500' };
                        };

                        const config = getPlaceConfig(suggestion);

                        return (
                            <li
                                key={`${suggestion.mapbox_id}-${index}`}
                                onClick={() => handleSelect(suggestion)}
                                className={`
                                    flex items-center gap-3
                                    ${renderAsList ? 'py-3' : 'p-3'}
                                    rounded-xl
                                    border-b border-neutral-100 dark:border-neutral-800 last:border-0
                                    hover:bg-neutral-50
                                    dark:hover:bg-neutral-800
                                    cursor-pointer
                                    transition
                                `}
                            >
                                {/* Left Icon - Rounded Square */}
                                <div className={`p-2.5 rounded-xl shrink-0 ${config.bg} ${config.text}`}>
                                    {config.icon}
                                </div>

                                {/* Text Content */}
                                <div className="flex flex-col flex-1 overflow-hidden">
                                    <span className="font-medium text-[15px] truncate text-left text-neutral-800 dark:text-neutral-200">{mainText}</span>
                                    <span className="text-[13px] text-neutral-500 truncate text-left">{secondaryText}</span>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div >
    );
};

export default MapboxAddressSelect;
