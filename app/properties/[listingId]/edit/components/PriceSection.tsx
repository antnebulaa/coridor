'use client';

import { useState, useEffect } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Euro, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { useLoadScript } from "@react-google-maps/api";
import { getGeocode } from "use-places-autocomplete";

import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import { calculateRentControl } from "./rentControlUtils";

interface PriceSectionProps {
    listing: SafeListing;
}

const libraries: ("places")[] = ["places"];

const PriceSection: React.FC<PriceSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [rentControlData, setRentControlData] = useState<any>(null);
    const [city, setCity] = useState<string>("");

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        libraries,
    });

    const {
        register,
        handleSubmit,
        formState: {
            errors,
        },
        watch
    } = useForm<FieldValues>({
        defaultValues: {
            price: listing.price
        }
    });

    const price = watch('price');

    // Fetch City from LocationValue (Place ID)
    useEffect(() => {
        if (isLoaded && listing.locationValue && !city) {
            getGeocode({ placeId: listing.locationValue })
                .then((results) => {
                    if (results && results.length > 0) {
                        const addressComponents = results[0].address_components;
                        const cityComponent = addressComponents.find(
                            (c) => c.types.includes('locality') || c.types.includes('administrative_area_level_1')
                        );
                        if (cityComponent) {
                            setCity(cityComponent.long_name);
                        }
                    }
                })
                .catch((error) => {
                    console.error("Error fetching location details:", error);
                });
        }
    }, [isLoaded, listing.locationValue, city]);

    // Calculate Rent Control
    useEffect(() => {
        if (city && listing.surface) {
            const result = calculateRentControl(listing, city);
            setRentControlData(result);
        }
    }, [city, listing]);

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios.put(`/api/listings/${listing.id}`, {
            price: parseInt(data.price, 10)
        })
            .then(() => {
                toast.success('Loyer mis à jour !');
                router.refresh();
            })
            .catch(() => {
                toast.error('Une erreur est survenue.');
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    // Gauge Logic
    const getGaugeStatus = () => {
        if (!rentControlData?.isEligible || !price) return 'neutral';
        if (price > rentControlData.maxRent) return 'red';
        if (price >= rentControlData.maxRent * 0.95) return 'orange';
        return 'green';
    };

    const gaugeStatus = getGaugeStatus();
    const percentage = rentControlData?.maxRent ? Math.min((price / (rentControlData.maxRent * 1.2)) * 100, 100) : 0;

    return (
        <div className="flex flex-col gap-8 pb-28 md:pb-0">
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Loyer mensuel</h3>
                <p className="text-neutral-500 font-light">
                    Indiquez le montant du loyer mensuel charges comprises.
                </p>
            </div>

            <div className="
                relative 
                flex 
                items-center 
                justify-center 
                py-10
                border-2
                border-dashed
                border-neutral-200
                rounded-xl
                hover:border-neutral-400
                transition
                group
            ">
                <div className="relative flex items-center justify-center">
                    <input
                        id="price"
                        disabled={isLoading}
                        {...register('price', { required: true, min: 1 })}
                        type="number"
                        className={`
                            peer
                            w-full
                            text-center
                            text-5xl
                            font-bold
                            bg-transparent
                            outline-none
                            transition
                            disabled:opacity-70
                            disabled:cursor-not-allowed
                            placeholder-neutral-200
                            [appearance:textfield]
                            [&::-webkit-outer-spin-button]:appearance-none
                            [&::-webkit-inner-spin-button]:appearance-none
                            max-w-[300px]
                        `}
                        placeholder="0"
                    />
                    <Euro
                        size={34}
                        className="
                            text-neutral-400 
                            absolute 
                            -right-10
                            top-1/2 
                            -translate-y-1/2
                            peer-focus:text-black
                            transition
                        "
                    />
                </div>
            </div>

            {/* Rent Control Section */}
            {rentControlData?.isEligible && (
                <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 flex flex-col gap-4">
                    <div className="flex flex-row items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Info size={18} />
                            Encadrement des loyers
                        </h4>
                        <span className="text-xs font-medium bg-neutral-200 px-2 py-1 rounded">
                            {rentControlData.zone}
                        </span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm text-neutral-600">
                            <span>0 €</span>
                            <span>Plafond: {rentControlData.maxRent} €</span>
                            <span>+</span>
                        </div>
                        <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden relative">
                            <div
                                className={`h-full transition-all duration-500 rounded-full ${gaugeStatus === 'red' ? 'bg-primary' :
                                    gaugeStatus === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'
                                    }`}
                                style={{ width: `${percentage}%` }}
                            />
                            {/* Marker for Max Rent */}
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-black opacity-30"
                                style={{ left: `${(rentControlData.maxRent / (rentControlData.maxRent * 1.2)) * 100}%` }}
                            />
                        </div>
                    </div>

                    <div className={`text-sm p-3 rounded-lg flex items-start gap-3 ${gaugeStatus === 'red' ? 'bg-rose-100 text-rose-800' :
                        gaugeStatus === 'orange' ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                        {gaugeStatus === 'red' && <AlertTriangle className="shrink-0 mt-0.5" size={18} />}
                        {gaugeStatus === 'orange' && <Info className="shrink-0 mt-0.5" size={18} />}
                        {gaugeStatus === 'green' && <CheckCircle className="shrink-0 mt-0.5" size={18} />}

                        <div className="flex flex-col gap-1">
                            <span className="font-medium">
                                {gaugeStatus === 'red' ? 'Loyer supérieur au plafond légal' :
                                    gaugeStatus === 'orange' ? 'Loyer proche du plafond' : 'Loyer conforme'}
                            </span>
                            <span className="opacity-90">
                                {gaugeStatus === 'red'
                                    ? `Le loyer dépasse le plafond estimé de ${rentControlData.maxRent} €. Cela peut être illégal sauf complément de loyer justifié.`
                                    : `Ce loyer est ${Math.round(((rentControlData.maxRent - price) / rentControlData.maxRent) * 100)}% en dessous du plafond légal.`}
                            </span>
                        </div>
                    </div>

                    <div className="text-xs text-neutral-400 mt-2">
                        {rentControlData.message}. Calcul basé sur une surface de {listing.surface} m².
                    </div>
                </div>
            )}

            <div className="
                fixed 
                bottom-0 
                left-0 
                w-full 
                bg-white 
                border-t-[1px] 
                border-neutral-200 
                p-4 
                z-50 
                md:relative 
                md:bottom-auto 
                md:left-auto 
                md:w-auto 
                md:bg-transparent 
                md:border-none 
                md:p-0 
                md:mt-4 
                md:flex 
                md:justify-end
            ">
                <div className="w-full md:w-auto">
                    <Button
                        disabled={isLoading}
                        label="Enregistrer"
                        onClick={handleSubmit(onSubmit)}
                    />
                </div>
            </div>
        </div>
    );
}

export default PriceSection;
