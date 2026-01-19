'use client';

import { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";

import { SafeListing } from "@/types";
import EditSectionFooter from "./EditSectionFooter";
import MapboxAddressSelect, { AddressSelectValue } from "@/components/inputs/MapboxAddressSelect";
import LocationPicker from "@/components/inputs/LocationPicker";
import Heading from "@/components/Heading";
import SoftInput from "@/components/inputs/SoftInput";
import CustomToast from "@/components/ui/CustomToast";

interface LocationSectionProps {
    listing: SafeListing;
}

const LocationSection: React.FC<LocationSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: {
            errors,
        }
    } = useForm<FieldValues>({
        defaultValues: {
            addressLine1: listing.addressLine1 || '',
            building: listing.building || '',
            apartment: listing.apartment || '',
            zipCode: listing.zipCode || '',
            city: listing.city || '',
            country: listing.country || '',
            latitude: listing.latitude || 0,
            longitude: listing.longitude || 0,
            locationValue: (listing as any).locationValue || '',
        }
    });

    const latitude = watch('latitude');
    const longitude = watch('longitude');
    const city = watch('city');
    const district = listing.district; // Keeping original district if not provided by autocomplete
    const country = watch('country');
    const addressLine1 = watch('addressLine1');
    const locationValue = watch('locationValue');

    const latlng = useMemo(() => [latitude, longitude], [latitude, longitude]);

    const onLocationSelect = (val: AddressSelectValue) => {
        const street = val.street || val.label.split(',')[0].trim();
        setValue('addressLine1', street);
        setValue('apartment', val.apartment);
        setValue('zipCode', val.zipCode);
        setValue('city', val.city);
        setValue('country', val.country);
        setValue('latitude', val.latlng[0]);
        setValue('longitude', val.latlng[1]);
        setValue('locationValue', val.label);
    };

    // Map needs to be dynamic to avoid SSR issues
    const Map = useMemo(() => dynamic(() => import('@/components/Map'), {
        ssr: false
    }), []);

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios.put(`/api/listings/${listing.id}`, {
            ...data,
            location: {
                label: data.locationValue,
                value: data.locationValue,
                latlng: [data.latitude, data.longitude],
                city: data.city,
                zipCode: data.zipCode,
                country: data.country
            }
        })
            .then(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Emplacement enregistré"
                        type="success"
                    />
                ));
                router.refresh();
            })
            .catch((error) => {
                console.error("Update error full:", error);
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Une erreur est survenue"
                        type="error"
                    />
                ));
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

            <div className="relative z-10">
                <LocationPicker
                    value={{
                        label: addressLine1 || locationValue || '',
                        value: '',
                        latlng: [latitude, longitude],
                        region: '',
                        city: city,
                        country: country,
                        street: addressLine1,
                        zipCode: listing.zipCode || ''
                    }}
                    onChange={onLocationSelect}
                />
            </div>

            <EditSectionFooter
                disabled={isLoading}
                label="Enregistrer"
                onClick={handleSubmit(onSubmit)}
            />
        </div>
    );
}

export default LocationSection;
