'use client';

import { SafeListing, SafeRentalUnit } from "@/types";
import { Button } from "@/components/ui/Button";
import { Plus, BedDouble, BedSingle, Ruler, Home } from "lucide-react";
import Image from "next/image";
import useRentModal from "@/hooks/useRentModal";
import { useCallback, useMemo } from "react";
import PropertiesListRow from "@/app/properties/components/PropertiesListRow";
// Reuse PropertiesListRow for consistency or create a simpler one?
// User said "on affiche les chambres en liste, avec pareil un bouton ajouté un chambre (on reprend l'idée de la page properties)"
// So reusing logic similar to PropertiesClient is good.

interface RoomsConfigSectionProps {
    listing: SafeListing;
    currentUser?: any;
    setIsAddRoomModalOpen: (value: boolean) => void;
}

const RoomsConfigSection: React.FC<RoomsConfigSectionProps> = ({
    listing,
    currentUser,
    setIsAddRoomModalOpen
}) => {
    const rentModal = useRentModal();

    // Determine rooms from property context
    // Assuming listing.rentalUnit.property.rentalUnits are loaded
    const property = listing.rentalUnit?.property;
    const rentalUnits = property?.rentalUnits || [];

    // Filter for rooms (Not ENTIRE_PLACE)
    const roomListings = useMemo(() => {
        if (!rentalUnits) return [];
        return rentalUnits
            .flatMap((unit: any) => (unit.listings || []).map((l: any) => ({ ...l, rentalUnit: unit })))
            .filter((l: any) => l.rentalUnit.type !== 'ENTIRE_PLACE' && l.id !== listing.id)
            .sort((a: any, b: any) => (a.rentalUnit.name || '').localeCompare(b.rentalUnit.name || ''));
    }, [rentalUnits]);

    const onAddRoom = useCallback(() => {
        // Open RentModal in "Add Room" mode
        // akin to how PropertiesClient does it
        if (property) {
            // We need to set context in rentModal
            rentModal.onOpen(undefined, property);
        } else {
            // Fallback
            setIsAddRoomModalOpen(true);
        }
    }, [rentModal, property, setIsAddRoomModalOpen]);

    const onEditRoom = (roomListing: SafeListing) => {
        // User wants "une modale avec les informations de la chambre, surface etc"
        // For now, we can redirect to that listing's edit page OR open a modal.
        // User said "en cliquant sur une chambre cela ouvre une modale".
        // Opening the full RentModal might be too much if it's just for "Surface, Bed Type".
        // But RentModal HAS these fields (some of them).
        // Let's implement a placeholder or redirect for now, or assume RentModal.
        // Or better, simply open the Property Edit page for that Room Listing?
        // "Cela ouvre une modale" suggests quick view.

        // Let's use RentModal for editing first, as it's the robust way.
        rentModal.onOpen(roomListing, property);
    };

    if (!property) {
        return <div>Impossible de charger la configuration des chambres (Propriété introuvable).</div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Configuration des chambres</h2>
                <div className="text-gray-500 text-sm">
                    Gérez vos chambres, leurs caractéristiques et liez-les à vos annonces.
                </div>
            </div>

            <div className="flex flex-col border border-neutral-200 rounded-xl overflow-hidden">
                {roomListings.length === 0 && (
                    <div className="p-8 text-center text-neutral-500 bg-neutral-50">
                        Aucune chambre configurée.
                    </div>
                )}

                {roomListings.map((room: any) => (
                    <div
                        key={room.id}
                        className="
                           border-b border-neutral-200 last:border-b-0 p-4 bg-white hover:bg-neutral-50 transition cursor-pointer
                           flex items-center justify-between
                        "
                        onClick={() => onEditRoom(room)}
                    >
                        <div className="flex items-center gap-4">
                            {/* Icon or Image */}
                            {/* Icon or Image */}
                            <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400 overflow-hidden relative">
                                {room.rentalUnit?.images?.[0]?.url ? (
                                    <Image
                                        src={room.rentalUnit.images[0].url}
                                        alt="Cover"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <BedDouble size={20} />
                                )}
                            </div>

                            <div>
                                <div className="font-semibold">{room.rentalUnit?.name || "Chambre"}</div>
                                <div className="text-sm text-neutral-500 flex items-center gap-2">
                                    <span className="flex items-center gap-1"><Ruler size={12} /> {room.rentalUnit?.surface || '-'} m²</span>
                                    <span>•</span>
                                    <span>{room.price} €/mois</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-sm text-primary font-medium hover:underline">
                            Modifier
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-start">
                <Button
                    label="Ajouter une chambre"
                    icon={Plus}
                    onClick={onAddRoom}
                    variant="outline"
                />
            </div>
        </div>
    );
};

export default RoomsConfigSection;
