'use client';

import { useState, useEffect } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Euro, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";

import { calculateRentControl } from "./rentControlUtils";
import PriceAssistantModal from "./PriceAssistantModal";
import EditSectionFooter from "./EditSectionFooter";
import { Wand2, TrendingUp, Scale } from "lucide-react";
import CustomToast from "@/components/ui/CustomToast";
import RentRevisionModal from "../../../components/RentRevisionModal";
import RegularizationModal from "../../../components/RegularizationModal";

interface PriceSectionProps {
    listing: SafeListing;
}

const PriceSection: React.FC<PriceSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [rentControlData, setRentControlData] = useState<any>(null);
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
    const [isRegularizationModalOpen, setIsRegularizationModalOpen] = useState(false);

    // Active Lease Logic (V2 - fetched via getListingById)
    const activeLease = listing.activeApplications?.[0];
    const hasActiveLease = !!activeLease;

    // Logic for Colocation / Rooms
    const property = listing.rentalUnit?.property;
    // Use stored city directly
    const city = listing.city || '';

    const rooms = property?.rentalUnits?.filter((unit: any) => unit.type === 'PRIVATE_ROOM') || [];
    const isColocation = rooms.length > 0;

    // Locked Rent Logic
    const currentRent = hasActiveLease && activeLease.financials?.[0]?.baseRentCents
        ? activeLease.financials[0].baseRentCents / 100
        : listing.price;

    const currentCharges = hasActiveLease && activeLease.financials?.[0]?.serviceChargesCents
        ? activeLease.financials[0].serviceChargesCents / 100
        : listing.charges ? (listing.charges as any).amount : '';

    const isLocked = hasActiveLease;

    // Form logic with support for multiple rooms
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm<FieldValues>({
        defaultValues: {
            price: currentRent,
            charges: currentCharges,
            securityDeposit: listing.securityDeposit,
            // Map rooms to a form array structure
            roomPrices: rooms.map((room: any) => {
                const roomListing = room.listings?.[0]; // Assume 1st listing is the active one for now
                return {
                    listingId: roomListing?.id,
                    name: room.name,
                    description: roomListing?.description,
                    price: roomListing?.price || 0,
                    charges: roomListing?.charges?.amount || 0,
                    securityDeposit: roomListing?.securityDeposit || 0
                };
            })
        }
    });

    const price = watch('price');
    const roomPrices = watch('roomPrices');

    // Calculate Total for Colocation
    const totalColocationPrice = isColocation
        ? roomPrices?.reduce((acc: number, curr: any) => acc + (parseInt(curr.price) || 0), 0)
        : 0;

    const totalColocationCharges = isColocation
        ? roomPrices?.reduce((acc: number, curr: any) => acc + (parseInt(curr.charges) || 0), 0)
        : 0;

    // Calculate Rent Control (Classic implementation)
    // For colocation, rent control usually applies per room or on the whole?
    // Usually per contract. If individual leases => per room.
    // For now, we keep the Rent Control gauge on the "Main" listing logic if not colocation,
    // OR we try to show it per room (too complex for now).
    // Let's hide Rent Control gauge for Colocation "Global" view for now to avoid confusion, or rely on individual checks later.
    useEffect(() => {
        if (isColocation) return; // Skip for colocation main view for now

        const fetchRentControl = async () => {
            if (city && listing.surface) {
                setIsLoading(true);
                try {
                    const response = await axios.post('/api/rent-control', {
                        lat: listing.latitude,
                        lon: listing.longitude,
                        roomCount: listing.roomCount,
                        buildYear: listing.buildYear,
                        isFurnished: listing.isFurnished,
                        surface: listing.surface,
                        city: city,
                        listing: listing
                    });
                    setRentControlData(response.data);
                } catch (error) {
                    console.error("Failed to fetch rent control", error);
                } finally {
                    setIsLoading(false);
                }
            } else if (city && listing.surface) {
                const result = calculateRentControl(listing, city);
                setRentControlData(result);
            }
        };

        const timer = setTimeout(() => {
            fetchRentControl();
        }, 500);
        return () => clearTimeout(timer);
    }, [city, listing, isColocation]);

    const onSubmit: SubmitHandler<FieldValues> = async (data) => {
        setIsLoading(true);

        try {
            if (isColocation) {
                // Batch update all room listings
                const updates = data.roomPrices.map((rp: any) => {
                    if (!rp.listingId) return Promise.resolve(); // No listing to update
                    return axios.put(`/api/listings/${rp.listingId}`, {
                        price: parseInt(rp.price, 10),
                        charges: parseInt(rp.charges, 10),
                        securityDeposit: parseInt(rp.securityDeposit, 10)
                    });
                });

                await Promise.all(updates);
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Loyers des chambres mis à jour !"
                        type="success"
                    />
                ));
            } else {
                // Standard single update
                await axios.put(`/api/listings/${listing.id}`, {
                    price: parseInt(data.price, 10),
                    charges: parseInt(data.charges, 10),
                    securityDeposit: parseInt(data.securityDeposit, 10)
                });
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Loyer mis à jour !"
                        type="success"
                    />
                ));
            }
            router.refresh();
        } catch (error) {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Une erreur est survenue"
                    type="error"
                />
            ));
        } finally {
            setIsLoading(false);
        }
    }

    // Gauge Logic (Only for Single Listing)
    const getGaugeStatus = () => {
        if (!rentControlData?.isEligible || !price) return 'neutral';
        if (price > rentControlData.maxRent) return 'red';
        if (price >= rentControlData.maxRent * 0.95) return 'orange';
        return 'green';
    };
    const gaugeStatus = getGaugeStatus();
    const percentage = rentControlData?.maxRent ? Math.min((price / (rentControlData.maxRent * 1.2)) * 100, 100) : 0;

    const handleApplyPrices = (newPrices: { index: number; price: number }[]) => {
        newPrices.forEach(({ index, price }) => {
            setValue(`roomPrices.${index}.price`, price, { shouldDirty: true });
        });
        toast.custom((t) => (
            <CustomToast
                t={t}
                message="Prix appliqués !"
                type="success"
            />
        ));
    };

    if (isColocation) {
        return (
            <div className="flex flex-col gap-8 pb-28 md:pb-0">
                <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">Loyer par chambre (Colocation)</h3>
                    <p className="text-neutral-500 font-light">
                        Définissez le loyer et les charges pour chaque chambre individuellement.
                    </p>
                </div>

                <div className="flex justify-start">
                    <Button
                        disabled={isLoading}
                        label="Assistant de Prix"
                        onClick={() => setIsAssistantOpen(true)}
                        icon={Wand2}
                        className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800 border-none shadow-md px-6 h-[42px] w-auto text-sm font-medium whitespace-nowrap"
                    />
                </div>

                <div className="flex flex-col gap-6">
                    {roomPrices.map((roomPrice: any, index: number) => (
                        <div key={index} className="p-4 border border-neutral-200 rounded-xl bg-neutral-50 flex flex-col gap-4">
                            <h4 className="font-semibold text-md border-b pb-2">
                                {roomPrice.name || `Chambre ${index + 1}`}
                                {roomPrice.description && <span className="font-normal text-neutral-500 ml-2">- {roomPrice.description}</span>}
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Price */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-neutral-500">Loyer HC</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            disabled={isLoading}
                                            {...register(`roomPrices.${index}.price`, { required: true, min: 0 })}
                                            className="w-full p-2 pl-3 pr-8 rounded-md border border-neutral-300 focus:border-black outline-none transition"
                                        />
                                        <Euro size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    </div>
                                </div>

                                {/* Charges */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-neutral-500">Charges</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            disabled={isLoading}
                                            {...register(`roomPrices.${index}.charges`, { min: 0 })}
                                            className="w-full p-2 pl-3 pr-8 rounded-md border border-neutral-300 focus:border-black outline-none transition"
                                        />
                                        <Euro size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    </div>
                                </div>

                                {/* Deposit */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-neutral-500">Dépôt g.</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            disabled={isLoading}
                                            {...register(`roomPrices.${index}.securityDeposit`, { min: 0 })}
                                            className="w-full p-2 pl-3 pr-8 rounded-md border border-neutral-300 focus:border-black outline-none transition"
                                        />
                                        <Euro size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total Summary */}
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col">
                        <span className="font-semibold text-primary">Revenu Total Estimé</span>
                        <span className="text-sm text-neutral-500">Somme des loyers + charges</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                        {totalColocationPrice + totalColocationCharges} € <span className="text-sm font-normal text-neutral-600">/ mois</span>
                    </div>
                </div>


                <div className="
                    fixed 
                    bottom-0 
                    left-0 
                    w-full 
                    bg-white 
                    border-t
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
                            label="Enregistrer tout"
                            onClick={handleSubmit(onSubmit)}
                        />
                    </div>
                </div>

                <PriceAssistantModal
                    isOpen={isAssistantOpen}
                    onClose={() => setIsAssistantOpen(false)}
                    rooms={rooms.map((r: any, i: number) => ({
                        name: r.name,
                        surface: r.surface,
                        currentPrice: roomPrices[i]?.price,
                        currentCharges: roomPrices[i]?.charges,
                        description: roomPrices[i]?.description
                    }))}
                    onApply={handleApplyPrices}
                />
            </div>
        );
    }



    return (
        <div className="flex flex-col gap-8 pb-28 md:pb-0">
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Loyer mensuel</h3>
                {isLocked && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-yellow-800 flex items-start gap-2">
                        <Info className="shrink-0 mt-0.5" size={16} />
                        <div>
                            <span className="font-semibold block">Loyer verrouillé par le bail actif</span>
                            Pour modifier le loyer, utilisez le bouton "Réviser le loyer".
                        </div>
                    </div>
                )}
                <p className="text-neutral-500 font-light">
                    Indiquez le montant du loyer mensuel hors charges.
                </p>
                {hasActiveLease && (
                    <div className="flex gap-2 mt-2">
                        <div
                            onClick={() => setIsRevisionModalOpen(true)}
                            className="text-xs font-medium text-neutral-600 border border-neutral-300 rounded-full px-3 py-1 cursor-pointer hover:bg-neutral-100 transition flex items-center gap-1"
                        >
                            <TrendingUp size={14} />
                            Réviser le loyer
                        </div>
                        <div
                            onClick={() => setIsRegularizationModalOpen(true)}
                            className="text-xs font-medium text-neutral-600 border border-neutral-300 rounded-full px-3 py-1 cursor-pointer hover:bg-neutral-100 transition flex items-center gap-1"
                        >
                            <Scale size={14} />
                            Régulariser les charges
                        </div>
                    </div>
                )}
            </div>

            {hasActiveLease && (
                <>
                    <RentRevisionModal
                        isOpen={isRevisionModalOpen}
                        onClose={() => setIsRevisionModalOpen(false)}
                        applicationId={activeLease.id}
                        currentRent={activeLease.financials?.[0]?.baseRentCents ? activeLease.financials[0].baseRentCents / 100 : listing.price}
                        currentCharges={activeLease.financials?.[0]?.serviceChargesCents ? activeLease.financials[0].serviceChargesCents / 100 : (listing.charges as any)?.amount || 0}
                        leaseStartDate={activeLease.financials?.[0]?.startDate ? new Date(activeLease.financials[0].startDate) : new Date()}
                        financials={activeLease.financials || []}
                    />
                    <RegularizationModal
                        isOpen={isRegularizationModalOpen}
                        onClose={() => setIsRegularizationModalOpen(false)}
                        propertyId={listing.rentalUnit?.property?.id || ""}
                    />
                </>
            )}

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
                        disabled={isLoading || isLocked}
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

            {/* Charges Section */}
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Charges mensuelles</h3>
                <p className="text-neutral-500 font-light">
                    Estimation des charges locatives mensuelles (provision).
                </p>
                <div className="relative flex items-center justify-center py-6 border-2 border-dashed border-neutral-200 rounded-xl hover:border-neutral-400 transition group max-w-[400px]">
                    <div className="relative flex items-center justify-center">
                        <input
                            id="charges"
                            disabled={isLoading || isLocked}
                            {...register('charges', { min: 0 })}
                            type="number"
                            className="peer w-full text-center text-3xl font-bold bg-transparent outline-none transition disabled:opacity-70 disabled:cursor-not-allowed placeholder-neutral-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none max-w-[200px]"
                            placeholder="0"
                        />
                        <Euro size={24} className="text-neutral-400 absolute -right-8 top-1/2 -translate-y-1/2 peer-focus:text-black transition" />
                    </div>
                </div>
            </div>

            {/* Security Deposit Section */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">Dépôt de garantie</h3>
                    <p className="text-neutral-500 font-light text-sm">
                        {listing.isFurnished
                            ? "Pour un meublé : max. 2 mois de loyer hors charges."
                            : "Pour une location nue : max. 1 mois de loyer hors charges."}
                    </p>
                </div>

                <div className="flex flex-wrap gap-4">
                    {[0, 1, ...(listing.isFurnished ? [2] : [])].map((months) => {
                        const amount = months * (parseInt(price, 10) || 0);
                        const currentDeposit = watch('securityDeposit');
                        const isSelected = currentDeposit == amount;

                        return (
                            <div
                                key={months}
                                onClick={() => !isLocked && setValue('securityDeposit', amount)}
                                className={`
                                   ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                                   rounded-xl
                                   border-2
                                   p-4
                                   flex
                                   flex-col
                                   gap-2
                                   hover:border-black
                                   transition
                                   w-[160px]
                                   ${isSelected ? 'border-black bg-neutral-50' : 'border-neutral-200'}
                               `}
                            >
                                <span className="font-semibold text-lg">{amount} €</span>
                                <span className="text-sm text-neutral-500">
                                    {months === 0 ? "Aucun" : `${months} mois`}
                                </span>
                            </div>
                        );
                    })}
                </div>
                {/* Hidden input to register the value if not already managed by setValue */}
            </div>

            {/* Rent Control Section */}
            {rentControlData?.isEligible && (
                <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 flex flex-col gap-4">
                    <div className="flex flex-row items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Info size={18} />
                            Zone Tendue / Encadrement
                        </h4>
                        <div className="flex gap-2">
                            {rentControlData.source === 'official_api' && (
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                    <CheckCircle size={12} /> Officiel
                                </span>
                            )}
                            <span className="text-xs font-medium bg-neutral-200 px-2 py-1 rounded">
                                {rentControlData.zone}
                            </span>
                        </div>
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
                                    ? `Le loyer dépasse le plafond ${rentControlData.source === 'official_api' ? 'officiel' : 'estimé'} de ${rentControlData.maxRent} €. Cela peut être illégal sauf complément de loyer justifié.`
                                    : `Ce loyer est ${Math.round(((rentControlData.maxRent - price) / rentControlData.maxRent) * 100)}% en dessous du plafond légal.`}
                            </span>
                        </div>
                    </div>

                    <div className="text-xs text-neutral-400 mt-2">
                        {rentControlData.message}. Calcul basé sur une surface de {listing.surface} m².
                    </div>
                </div>
            )}

            <EditSectionFooter
                disabled={isLoading}
                label="Enregistrer"
                onClick={handleSubmit(onSubmit)}
            />
        </div>
    );
}

export default PriceSection;
