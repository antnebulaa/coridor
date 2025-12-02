'use client';

import { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useLoadScript } from "@react-google-maps/api";
import { getGeocode, getLatLng } from "use-places-autocomplete";

import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import GoogleAddressSelect, { AddressSelectValue } from "@/components/inputs/GoogleAddressSelect";
import Heading from "@/components/Heading";

interface LocationSectionProps {
    listing: SafeListing;
}

const libraries: ("places")[] = ["places"];

const LocationSection: React.FC<LocationSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Parse initial location from listing
    // Assuming listing.locationValue stores the address string or ID
    // Ideally we need lat/lng stored in listing, but based on RentModal it seems limited
    // For now, we'll initialize with null or try to reconstruct if possible
    // But listing structure in RentModal suggests locationValue is just a string (value)
    // We might need to fetch full location details or just start fresh if not available

    const [location, setLocation] = useState<AddressSelectValue | null>(null);

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries,
    });

    useEffect(() => {
        if (isLoaded && listing.locationValue && !location) {
            // Fetch details using Place ID
            getGeocode({ placeId: listing.locationValue })
                .then((results) => {
                    if (results && results.length > 0) {
                        const address = results[0].formatted_address;
                        const { lat, lng } = getLatLng(results[0]);

                        // Extract region if needed (optional)
                        const countryComponent = results[0].address_components.find(c => c.types.includes('country'));
                        const region = countryComponent ? countryComponent.long_name : 'Unknown';

                        const cityComponent = results[0].address_components.find(
                            (c) => c.types.includes('locality') || c.types.includes('administrative_area_level_1')
                        );
                        const city = cityComponent ? cityComponent.long_name : '';

                        const districtComponent = results[0].address_components.find(
                            (c) => c.types.includes('sublocality_level_1') || c.types.includes('sublocality')
                        );
                        const district = districtComponent ? districtComponent.long_name : '';

                        setLocation({
                            label: address,
                            value: listing.locationValue,
                            latlng: [lat, lng],
                            region: region,
                            city: city,
                            district: district,
                            country: region // region is country name in this context
                        });
                    }
                })
                .catch((error) => {
                    console.error("Error fetching location details:", error);
                    // Fallback if fetch fails (e.g. invalid ID or network error)
                    // We just show the ID or empty, but at least we tried.
                });
        }
    }, [isLoaded, listing.locationValue, location]);

    // Map needs to be dynamic to avoid SSR issues
    const Map = useMemo(() => dynamic(() => import('@/components/Map'), {
        ssr: false
    }), []);

    const onLocationSelect = (value: AddressSelectValue) => {
        setLocation(value);
    };

    const onSubmit = () => {
        if (!location) return;

        setIsLoading(true);

        // We are saving the location value (place_id) and potentially other details
        // The API expects 'location' object or value. Based on RentModal:
        // setValue('location', value) -> data.location
        // So we send { location: location }

        axios.put(`/api/listings/${listing.id}`, {
            location: location,
            city: location.city,
            district: location.district,
            country: location.country
        })
            .then(() => {
                toast.success('Location updated!');
                router.refresh();
            })
            .catch((error) => {
                console.error("Update error full:", error);
                console.error("Update error response:", error.response);
                console.error("Update error data:", error.response?.data);
                toast.error(`Something went wrong: ${error.response?.data?.error || error.message}`);
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    return (
        <div className="flex flex-col gap-8">
            <Heading
                title="Où est situé votre logement ?"
                subtitle="Aidez les voyageurs à vous trouver !"
            />

            <GoogleAddressSelect
                value={location || undefined}
                onChange={onLocationSelect}
            />

            <Map center={location?.latlng} />

            <div className="flex flex-row justify-end">
                <Button
                    disabled={isLoading || !location}
                    label="Enregistrer"
                    onClick={onSubmit}
                />
            </div>
        </div>
    );
}

export default LocationSection;
