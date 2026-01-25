'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { SafeProperty } from "@/types";

interface PropertyColocationCardProps {
    property: SafeProperty;
}

const PropertyColocationCard: React.FC<PropertyColocationCardProps> = ({
    property
}) => {
    const router = useRouter();

    // 1. Identify Room Units
    const roomUnits = (property.rentalUnits || []).filter((u: any) => u.type === 'PRIVATE_ROOM');
    const totalRooms = roomUnits.length;

    // 2. Identify Active Listings for Rooms
    const activeListings = roomUnits.flatMap((u: any) => u.listings || []).filter((l: any) => l.status === 'PUBLISHED' || l.reservations?.length > 0); // Simplified Active check

    // 3. Occupancy Logic
    // Sort rooms by name for consistent dot order
    const sortedRooms = [...roomUnits].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    const roomStates = sortedRooms.map((unit: any) => {
        // Check if ANY listing in this unit has an active reservation
        const listing = unit.listings?.[0]; // Assuming 1 active listing per unit logic for now
        const isOccupied = listing?.reservations?.some((r: any) => new Date(r.endDate) > new Date());
        // Mock rent status
        const isRentPaid = true; // Random mock: Math.random() > 0.3
        const rentAmount = listing?.price || 0;

        return {
            id: unit.id,
            isOccupied,
            isRentPaid,
            rentAmount
        };
    });

    const occupiedCount = roomStates.filter(s => s.isOccupied).length;

    // 4. Rent Logic
    const totalPotentialRent = roomStates.reduce((acc, s) => acc + s.rentAmount, 0);
    const totalCollectedRent = roomStates.reduce((acc, s) => acc + (s.isOccupied ? s.rentAmount : 0), 0);

    // Main Listing (for edit link)
    // Usually we link to the Main Logic Property listing or the first one. 
    // Ideally we link to property edit mode COLOCATION
    // We need a listing ID to route to /properties/[id]/edit. 
    // Let's find the "ENTIRE_PLACE" listing or create a fake ID link if strictly property based routing existed (it doesn't yet).
    // We will use the first available listing ID (even room) or the main unit listing if exists.
    const mainUnit = property.rentalUnits?.find((u: any) => u.type === 'ENTIRE_PLACE');
    const mainListingId = mainUnit?.listings?.[0]?.id || roomUnits[0]?.listings?.[0]?.id;

    if (!mainListingId) return null; // Should not happen in valid state

    return (
        <div
            onClick={() => router.push(`/properties/${mainListingId}/edit`)}
            className="bg-white rounded-[20px] p-3 transition cursor-pointer active:scale-95 flex flex-col gap-2"
        >
            {/* Header: Image & Title */}
            <div className="flex gap-4 items-start">
                <div className="relative w-16 h-16 rounded-[16px] overflow-hidden bg-neutral-100 shrink-0">
                    {property.images?.[0]?.url ? (
                        <Image
                            fill
                            src={property.images[0].url}
                            alt="Property"
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-neutral-200" />
                    )}
                </div>
                <div className="flex flex-col">
                    <div className="font-semibold text-neutral-900 text-lg">
                        {property.category} {property.rooms?.length ? `T${property.rooms.length}` : ''}
                    </div>
                    <div className="text-purple-600 font-medium text-sm">
                        Colocation
                    </div>
                    <div className="text-neutral-500 text-sm truncate max-w-[200px]">
                        {[
                            property.address || property.addressLine1 || property.city,
                            property.building && `Bât. ${property.building}`,
                            property.apartment && `Apt ${property.apartment}`
                        ].filter(Boolean).join(', ')}
                    </div>
                </div>
            </div>

            <hr className="border-neutral-100" />

            {/* Status Section */}
            <div className="flex flex-col gap-0">
                <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                    Status
                </div>
                <div className="font-medium text-xl text-neutral-900">
                    {occupiedCount} / {totalRooms} <span className="text-neutral-500 text-base font-medium">chambres en location</span>
                </div>
                <div className="flex gap-1.5">
                    {roomStates.map((state) => (
                        <div
                            key={state.id}
                            className={`w-3.5 h-3.5 rounded-full  ${state.isOccupied ? 'bg-green-500 border-green-500' : ' bg-neutral-200'}`}
                        />
                    ))}
                </div>
            </div>

            <hr className="border-neutral-100" />

            {/* Rent Section */}
            <div className="flex flex-col gap-1">
                <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                    Loyer
                </div>
                <div className="font-medium text-neutral-900 text-xl">
                    {totalCollectedRent} <span className="text-neutral-500 font-medium">/ {totalPotentialRent}€</span> <span className="text-neutral-500 text-base font-medium">de loyer</span>
                </div>

                {/* Dots + Text Summary (Row) */}
                <div className="flex items-center gap-2">
                    {/* Rent DOTS */}
                    <div className="flex gap-1.5">
                        {roomStates.map((state) => (
                            <div
                                key={state.id}
                                className={`w-3.5 h-3.5 rounded-full ${!state.isOccupied ? 'bg-neutral-200' :
                                    (state.isRentPaid ? 'bg-green-500' : 'bg-orange-500')
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Text Summary */}
                    {occupiedCount === 0 ? (
                        <div className="text-xs font-medium text-neutral-400">
                            Aucun locataire
                        </div>
                    ) : (
                        (totalPotentialRent - totalCollectedRent) > 0 ? (
                            <div className="text-xs font-bold text-orange-500">
                                {totalPotentialRent - totalCollectedRent}€ restant à payer
                            </div>
                        ) : (
                            <div className="text-xs font-bold text-green-600">
                                Tout est réglé
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default PropertyColocationCard;
