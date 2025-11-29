'use client';

import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from "use-places-autocomplete";
import { useEffect, useState, useRef } from "react";
import { useLoadScript } from "@react-google-maps/api";

export type AddressSelectValue = {
    label: string;
    latlng: number[];
    value: string;
    region: string;
    city?: string;
    country?: string;
}

interface GoogleAddressSelectProps {
    value?: AddressSelectValue;
    onChange: (value: AddressSelectValue) => void;
    placeholder?: string;
    autoFocus?: boolean;
}

const libraries: ("places")[] = ["places"];

const GoogleAddressSelect: React.FC<GoogleAddressSelectProps> = ({
    value,
    onChange,
    placeholder,
    autoFocus
}) => {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries,
    });

    if (!isLoaded) return <div>Loading...</div>;

    return <PlacesAutocomplete value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} />;
};

const PlacesAutocomplete = ({ value, onChange, placeholder, autoFocus }: GoogleAddressSelectProps) => {
    const {
        ready,
        value: inputValue,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            /* Define search scope here */
        },
        debounce: 300,
    });

    const [showSuggestions, setShowSuggestions] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref]);

    useEffect(() => {
        if (value) {
            setValue(value.label, false);
        }
    }, [value, setValue]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        setShowSuggestions(true);
    };

    const handleSelect = async (address: string) => {
        setValue(address, false);
        clearSuggestions();
        setShowSuggestions(false);

        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);

            // Extract country/region if possible, or just use address components
            const countryComponent = results[0].address_components.find(c => c.types.includes('country'));
            const region = countryComponent ? countryComponent.long_name : 'Unknown';

            const cityComponent = results[0].address_components.find(
                (c) => c.types.includes('locality') ||
                    c.types.includes('sublocality') ||
                    c.types.includes('sublocality_level_1') ||
                    c.types.includes('postal_town') ||
                    c.types.includes('administrative_area_level_1') ||
                    c.types.includes('administrative_area_level_2')
            );

            let city = cityComponent ? cityComponent.long_name : '';

            // Fallback: Try to extract from formatted address if city is still empty
            if (!city && results[0].formatted_address) {
                const parts = results[0].formatted_address.split(',');
                if (parts.length > 0) {
                    city = parts[0].trim();
                }
            }

            onChange({
                label: address,
                value: results[0].place_id,
                latlng: [lat, lng],
                region: region,
                city: city,
                country: region
            });
        } catch (error) {
            console.log("Error: ", error);
        }
    };

    return (
        <div ref={ref} className="relative">
            <input
                ref={inputRef}
                onFocus={() => setShowSuggestions(true)}
                value={inputValue}
                onChange={handleInput}
                placeholder={placeholder || "Type an address..."}
                className="
                    w-full
                    p-4
                    pt-6 
                    font-light 
                    bg-white 
                    border-[1px]
                    rounded-md
                    outline-none
                    transition
                    disabled:opacity-70
                    disabled:cursor-not-allowed
                    pl-4
                    border-[#dfdfdf]
                    focus:border-black
                "
            />
            {status === "OK" && showSuggestions && (
                <ul className="absolute z-[9999] w-full bg-white border border-[#dfdfdf] rounded-md mt-1 shadow-lg max-h-60 overflow-auto">
                    {data.map(({ place_id, description }) => (
                        <li
                            key={place_id}
                            onClick={() => handleSelect(description)}
                            className="p-3 hover:bg-neutral-100 cursor-pointer transition"
                        >
                            {description}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GoogleAddressSelect;
