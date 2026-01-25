'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SafeListing, SafeProperty, SafeRentalUnit, SafeUser } from "@/types";
import useCountries from "@/hooks/useCountries";

interface PropertyStandardCardProps {
    data: SafeListing;
    property: SafeProperty;
    currentUser?: SafeUser | null;
}

const PropertyStandardCard: React.FC<PropertyStandardCardProps> = ({
    data,
    property,
    currentUser
}) => {
    const router = useRouter();
    const { getByValue } = useCountries();
    const location = getByValue(data.locationValue || '');

    // Status Logic
    const isOccupied = (data.reservations || []).some((r: any) => new Date(r.endDate) > new Date());
    const nextFreeDate = isOccupied
        ? (data.reservations || []).sort((a: any, b: any) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0]?.endDate
        : null;

    // Rent Status Logic (Mocked for now as requested)
    const isRentPaid = true;

    return (
        <div
            onClick={() => router.push(`/properties/${data.id}/edit`)}
            className="bg-white rounded-[20px] p-3 hover:shadow-md transition cursor-pointer active:scale-95 flex flex-col gap-2"
        >
            {/* Header: Image & Title */}
            <div className="flex gap-3 items-start">
                <div className="relative w-16 h-16 rounded-[16px] overflow-hidden bg-neutral-100 shrink-0">
                    {data.images?.[0]?.url ? (
                        <Image
                            fill
                            src={data.images[0].url}
                            alt="Listing"
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-neutral-200" />
                    )}
                </div>
                <div className="flex flex-col">
                    <div className="font-medium text-neutral-900 text-base">
                        {data.category} {data.roomCount ? `T${data.roomCount}` : ''}
                    </div>
                    <div className="text-neutral-600 font-medium text-sm">
                        Location {data.isFurnished ? 'meublé' : 'nue'}
                    </div>
                    <div className="text-neutral-500 text-sm truncate max-w-[200px]">
                        {[
                            property.address || data.addressLine1 || data.city,
                            property.building && `Bât. ${property.building}`,
                            property.apartment && `Apt ${property.apartment}`
                        ].filter(Boolean).join(', ')}
                    </div>
                </div>
            </div>

            <hr className="border-neutral-100" />

            {/* Status Section */}
            <div className="flex flex-col gap-0">
                <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                    Status
                </div>
                <div className="flex justify-between items-center">
                    <div className={`font-medium text-xl ${isOccupied ? 'text-green-600' : 'text-orange-500'}`}>
                        {isOccupied ? 'En location' : 'Vacant'}
                    </div>
                    {isOccupied && nextFreeDate && (
                        <div className="text-neutral-500 text-sm flex items-center gap-0">
                            <span>→</span>
                            {format(new Date(nextFreeDate), 'MMM yyyy', { locale: fr })}
                        </div>
                    )}
                </div>
            </div>

            <hr className="border-neutral-100" />

            {/* Rent Section */}
            <div className="flex flex-col gap-0">
                <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                    Loyer
                </div>
                <div className="flex justify-between items-center">
                    <div className="font-medium text-neutral-900 text-xl">
                        {data.price}€ <span className="text-neutral-400 text-base font-medium"> </span>
                    </div>
                    {isOccupied ? (
                        <div className={`font-medium text-sm ${isRentPaid ? 'text-green-600' : 'text-orange-500'}`}>
                            {isRentPaid ? 'Réglé' : 'En retard'}
                        </div>
                    ) : (
                        <div className="font-medium text-sm text-neutral-400">
                            Aucun locataire
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PropertyStandardCard;
