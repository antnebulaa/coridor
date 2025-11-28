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
}

const libraries: ("places")[] = ["places"];

const GoogleAddressSelect: React.FC<GoogleAddressSelectProps> = ({
    value,
    onChange
}) => {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries,
    });

    if (!isLoaded) return <div>Loading...</div>;

    return <PlacesAutocomplete value={value} onChange={onChange} />;
};

const PlacesAutocomplete = ({ value, onChange }: GoogleAddressSelectProps) => {
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
                (c) => c.types.includes('locality') || c.types.includes('administrative_area_level_1')
            );
            const city = cityComponent ? cityComponent.long_name : '';

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
                value={inputValue}
                onChange={handleInput}
                disabled={!ready}
                placeholder="Type an address..."
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
