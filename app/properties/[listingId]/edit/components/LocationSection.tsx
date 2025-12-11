'use client';

import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import MapboxAddressSelect, { AddressSelectValue } from "@/components/inputs/MapboxAddressSelect";
import Heading from "@/components/Heading";

interface LocationSectionProps {
    listing: SafeListing;
}

const LocationSection: React.FC<LocationSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Initialize location from listing data
    const [location, setLocation] = useState<AddressSelectValue | null>(() => {
        if (!listing.locationValue && !listing.city) return null;
        return {
            label: listing.locationValue || [listing.city, listing.district, listing.country].filter(Boolean).join(', '), // Use stored address string or construct fallback
            value: listing.locationValue,
            latlng: [listing.latitude || 0, listing.longitude || 0],
            region: listing.country || '',
            city: listing.city || '',
            district: listing.district || '',
            neighborhood: listing.neighborhood || '',
            country: listing.country || ''
        };
    });

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

        axios.put(`/api/listings/${listing.id}`, {
            location: {
                ...location,
                value: location.label // Save the full address string into locationValue instead of the Mapbox ID
            },
            city: location.city,
            district: location.district,
            neighborhood: location.neighborhood,
            country: location.country
        })
            .then(() => {
                toast.success('Emplacement enregistré !');
                router.refresh();
            })
            .catch((error) => {
                console.error("Update error full:", error);
                toast.error(`Something went wrong: ${error.message}`);
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

            <MapboxAddressSelect
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
